/**
 * Canvas — main canvas component.
 *
 * Routes to xyflow canvas (flat views) or legacy spatial renderer.
 * Bridges Zustand stores (model, view, interaction) to the active renderer.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { useThemeStore } from '../store/theme';
import { XYFlowCanvas } from '../renderers/xyflow/Canvas';
// DetailPanel moved to Shell.tsx bottom panel
import * as api from '../api/client';
import type { ViewElement } from '../model/types';
import type { Element } from '../model/types';
import { useUndoRedoStore, renameElementCommand, createRelationshipCommand } from '../interaction/undo-redo';
import type { Command } from '../interaction/undo-redo';
import type { Relationship } from '../model/types';
import { getNotation, getViewNotation } from '../model/notation';

// Lazy-load legacy spatial renderer only when needed
const LegacySpatialCanvas = React.lazy(() =>
  import('./legacy/Canvas').then(m => ({ default: m.Canvas }))
);

export function Canvas(): React.ReactElement {
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const sublayerConfig = useModelStore(s => s.sublayerConfig);
  const validRelationships = useModelStore(s => s.validRelationships);
  const loadAll = useModelStore(s => s.loadAll);
  const currentView = useViewStore(s => s.currentView);
  const viewElements = useViewStore(s => s.viewElements);
  const savePositions = useViewStore(s => s.savePositions);
  const select = useInteractionStore(s => s.select);
  const clearSelection = useInteractionStore(s => s.clearSelection);
  const showContextMenu = useInteractionStore(s => s.showContextMenu);
  const theme = useThemeStore(s => s.theme);
  const run = useUndoRedoStore(s => s.run);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter elements for current view
  const viewElementIds = useMemo(
    () => new Set(viewElements.map(ve => ve.element_id)),
    [viewElements],
  );

  const visibleElements = useMemo(
    () => elements.filter(el => viewElementIds.has(el.id)),
    [elements, viewElementIds],
  );

  const visibleRelationships = useMemo(
    () => relationships.filter(rel =>
      viewElementIds.has(rel.source_id) && viewElementIds.has(rel.target_id)
    ),
    [relationships, viewElementIds],
  );

  // Handle node click → select
  const handleNodeClick = useCallback((elementId: string) => {
    select(elementId);
  }, [select]);

  // Handle position change → persist to SQLite
  const handlePositionChange = useCallback((positions: { element_id: string; x: number; y: number }[]) => {
    if (!currentView) return;
    const updates: ViewElement[] = positions.map(pos => {
      const existing = viewElements.find(ve => ve.element_id === pos.element_id);
      return {
        view_id: currentView.id,
        element_id: pos.element_id,
        x: pos.x,
        y: pos.y,
        width: existing?.width ?? null,
        height: existing?.height ?? null,
        sublayer_override: existing?.sublayer_override ?? null,
        style_overrides: existing?.style_overrides ?? null,
      };
    });
    savePositions(currentView.id, updates);
  }, [currentView, viewElements, savePositions]);

  // Bulk delete elements (from xyflow Delete key) — routed through undo-redo
  const handleElementsDelete = useCallback(async (elementIds: string[]) => {
    const targets = elementIds
      .map(id => elements.find(e => e.id === id))
      .filter((e): e is Element => Boolean(e));
    if (targets.length === 0) return;
    const cmd: Command = {
      description: `Delete ${targets.length} element(s)`,
      execute: async () => {
        await Promise.all(targets.map(el => api.deleteElement(el.id)));
        await loadAll();
        clearSelection();
      },
      undo: async () => {
        await Promise.all(targets.map(el => api.createElement({
          id: el.id,
          name: el.name,
          archimate_type: el.archimate_type,
          layer: el.layer,
          specialisation: el.specialisation,
          sublayer: el.sublayer,
          domain_id: el.domain_id,
          status: el.status,
          description: el.description,
        })));
        await loadAll();
      },
    };
    await run(cmd);
  }, [elements, loadAll, clearSelection, run]);

  // Bulk delete relationships (from xyflow Delete key) — routed through undo-redo
  const handleRelationshipsDelete = useCallback(async (relationshipIds: string[]) => {
    const targets = relationshipIds
      .map(id => relationships.find(r => r.id === id))
      .filter((r): r is Relationship => Boolean(r));
    if (targets.length === 0) return;
    const cmd: Command = {
      description: `Delete ${targets.length} relationship(s)`,
      execute: async () => {
        await Promise.all(targets.map(r => api.deleteRelationship(r.id)));
        await loadAll();
      },
      undo: async () => {
        await Promise.all(targets.map(r => api.createRelationship({
          id: r.id,
          archimate_type: r.archimate_type,
          source_id: r.source_id,
          target_id: r.target_id,
          label: r.label ?? undefined,
          description: r.description ?? undefined,
          specialisation: r.specialisation ?? undefined,
        })));
        await loadAll();
      },
    };
    await run(cmd);
  }, [relationships, loadAll, run]);

  // Inline label change from double-click edit — routed through undo-redo
  const handleLabelChange = useCallback(async (elementId: string, newLabel: string) => {
    const oldEl = elements.find(e => e.id === elementId);
    if (!oldEl) return;
    await run(renameElementCommand(elementId, oldEl.name, newLabel, loadAll));
  }, [elements, loadAll, run]);

  // On-canvas relationship creation: called when user drags from element handle to target — routed through undo-redo
  const handleCreateRelationship = useCallback(async (sourceId: string, targetId: string, relType: string) => {
    await run(createRelationshipCommand(
      {
        id: `rel-${crypto.randomUUID()}`,
        archimate_type: relType as import('../model/types').RelationshipType,
        source_id: sourceId,
        target_id: targetId,
      },
      async () => { await loadAll(); },
    ));
  }, [loadAll, run]);

  // Palette drag-to-create: called by XYFlowCanvas with flow-space coords
  const handleDropElement = useCallback(async (archimateType: string, layer: string, x: number, y: number) => {
    if (!currentView) return;
    // Notation boundary check — reject cross-notation drops
    const elementNotation = getNotation(archimateType);
    const viewNotation = getViewNotation(currentView.viewpoint_type);
    if (viewNotation !== 'any' && elementNotation !== viewNotation) {
      window.alert(`Cannot add a ${elementNotation} element to a ${viewNotation} view`);
      return;
    }
    const name = window.prompt(`Name for new ${archimateType}:`);
    if (!name?.trim()) return;
    const el = await api.createElement({
      id: `el-${crypto.randomUUID()}`,
      name: name.trim(),
      archimate_type: archimateType as import('../model/types').ArchimateType,
      layer: layer as import('../model/types').ArchimateLayer,
      specialisation: null,
    });
    await api.updateViewElements(currentView.id, [{
      view_id: currentView.id,
      element_id: el.id,
      x,
      y,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
    }]);
    await loadAll();
  }, [currentView, loadAll]);

  // Model tree drag-to-canvas: add an existing element to the current view
  const handleDropTreeElement = useCallback(async (elementId: string, x: number, y: number) => {
    if (!currentView) return;
    // Notation boundary check — reject cross-notation drops
    const el = elements.find(e => e.id === elementId);
    if (el) {
      const elementNotation = getNotation(el.archimate_type);
      const viewNotation = getViewNotation(currentView.viewpoint_type);
      if (viewNotation !== 'any' && elementNotation !== viewNotation) {
        window.alert(`Cannot add a ${elementNotation} element to a ${viewNotation} view`);
        return;
      }
    }
    await api.updateViewElements(currentView.id, [{
      view_id: currentView.id,
      element_id: elementId,
      x,
      y,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
    }]);
    await loadAll();
  }, [currentView, elements, loadAll]);

  // Determine render mode
  const renderMode = currentView?.render_mode ?? 'flat';
  const isSpatial = renderMode === 'spatial';

  if (!currentView) {
    return React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        fontSize: 12,
      },
    }, 'Select a view from the sidebar');
  }

  return React.createElement('div', {
    ref: containerRef,
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
  },
    isSpatial
      ? React.createElement(React.Suspense, {
          fallback: React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 },
          }, 'Loading spatial renderer…'),
        },
          React.createElement(LegacySpatialCanvas, null),
        )
      : React.createElement(XYFlowCanvas, {
          elements: visibleElements,
          relationships: visibleRelationships,
          viewElements,
          viewId: currentView.id,
          theme,
          sublayerConfig,
          onNodeClick: handleNodeClick,
          onPositionChange: handlePositionChange,
          onLabelChange: handleLabelChange,
          onElementsDelete: handleElementsDelete,
          onRelationshipsDelete: handleRelationshipsDelete,
          onDropElement: handleDropElement,
          onDropTreeElement: handleDropTreeElement,
          onCreateRelationship: handleCreateRelationship,
          onClearSelection: clearSelection,
          onNodeContextMenu: showContextMenu,
          validRelationships,
          viewpointType: currentView.viewpoint_type,
        }),
  );
}
