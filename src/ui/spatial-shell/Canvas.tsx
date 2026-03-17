import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { SpatialRenderer } from '../../renderers/spatial/renderer';
import { FlatRenderer } from '../../renderers/flat/renderer';
import type { PositionedElement, PositionedEdge } from '../../renderers/types';
import type { LayerPlaneConfig } from '../../renderers/spatial/layers';
import type { CameraState } from '../../interaction/pan-zoom-rotate';
import { defaultCameraState, resetCamera, lerpCamera, easeOutCubic } from '../../interaction/pan-zoom-rotate';
import { computeHighlight } from '../../interaction/highlight';
import type { HighlightDirection } from '../../interaction/highlight';
import { ContextMenu } from '../ContextMenu';
import type { ContextMenuGroup } from '../ContextMenu';
import { computeSpatialLayout } from '../../layout/spatial';
import { computeFlatLayout } from '../../layout/flat';
import { layerWorldY } from '../../renderers/spatial/layers';
import { project3D, PLANE_WIDTH, screenToWorldOnPlane } from '../../renderers/spatial/projection';
import { getShapeDefinition } from '../../shared/registry';
import type { ViewElement } from '../../model/types';
import { useModelStore } from '../../store/model';
import { useViewStore } from '../../store/view';
import { useInteractionStore } from '../../store/interaction';
import { useThemeStore } from '../../store/theme';
import { ZoomBar } from './ZoomBar';
import { RotationPanel } from './RotationPanel';
import { SelectionBadge } from '../SelectionBadge';
import { ExportMenu } from '../ExportMenu';
import { DetailPanel } from '../DetailPanel';
import type { SublayerEntry } from '../../layout/types';
import { specialisationMap as specMap } from '../../model/specialisations';
import { assignPorts } from '../../layout/connection-points';

export function Canvas(): React.ReactElement {
  const { elements, relationships, sublayerConfig, graph, createElement, deleteElement, updateElementStatus } = useModelStore();
  const { currentView, viewElements } = useViewStore();
  const { selectedId, highlightedNodes, highlightedEdges, select, clearSelection, setHighlight } = useInteractionStore();
  const savePositions = useViewStore(s => s.savePositions);
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);

  const [detailElement, setDetailElement] = useState<string | null>(null);
  const [dragOffsets, setDragOffsets] = useState<Map<string, { dx: number; dy: number }>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
  } | null>(null);

  const [focusedLayer, setFocusedLayer] = useState<string | null>(null);
  const [dragOverLayer, setDragOverLayer] = useState<string | null>(null);

  const renderMode = currentView?.render_mode ?? 'spatial';
  const rotDefault = currentView?.rotation_default as { y: number; x: number } | null;
  const [camera, setCamera] = useState<CameraState>(() => defaultCameraState(rotDefault));

  // Camera animation
  const animRef = useRef<{ from: CameraState; to: CameraState; startTime: number; duration: number; frameId: number } | null>(null);

  const animateCameraTo = useCallback((target: CameraState, durationMs = 1000) => {
    // Cancel any in-progress animation
    if (animRef.current) cancelAnimationFrame(animRef.current.frameId);

    const from = camera;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const raw = Math.min(1, elapsed / durationMs);
      const t = easeOutCubic(raw);
      const interpolated = lerpCamera(from, target, t);
      setCamera(interpolated);
      if (raw < 1) {
        animRef.current = { from, to: target, startTime, duration: durationMs, frameId: requestAnimationFrame(tick) };
      } else {
        animRef.current = null;
      }
    };

    animRef.current = { from, to: target, startTime, duration: durationMs, frameId: requestAnimationFrame(tick) };
  }, [camera]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current.frameId); };
  }, []);

  // When user scrolls to zoom while focused on a layer, cancel focus and
  // animate back to default if they zoom out past default zoom level.
  const handleCameraChange = useCallback((newCamera: CameraState) => {
    // If there's an animation running, cancel it — the user is taking manual control
    if (animRef.current) {
      cancelAnimationFrame(animRef.current.frameId);
      animRef.current = null;
    }
    setCamera(newCamera);

    // Detect zoom-out past default while focused on a layer
    const defaultZoom = defaultCameraState(rotDefault).zoom;
    if (focusedLayer && newCamera.zoom < defaultZoom) {
      setFocusedLayer(null);
      animateCameraTo(resetCamera(rotDefault), 800);
    }
  }, [focusedLayer, rotDefault, animateCameraTo]);

  // Parse sublayer config into flat list
  const sublayers = useMemo((): SublayerEntry[] => {
    if (!sublayerConfig) return [];
    const result: SublayerEntry[] = [];
    const layers = (sublayerConfig as Record<string, unknown>)['layers'] as Record<string, {
      label: string;
      color_key: string;
      sublayers: Array<{ name: string; element_types: string[]; specialisations?: string[] }>;
    }> | undefined;

    if (!layers) return result;

    let layerIndex = 0;
    for (const [layerKey, layerDef] of Object.entries(layers)) {
      let sublayerIndex = 0;
      for (const sl of layerDef.sublayers) {
        result.push({
          name: sl.name,
          layerKey,
          layerIndex,
          sublayerIndex,
          elementTypes: sl.element_types,
          specialisations: sl.specialisations,
        });
        sublayerIndex++;
      }
      layerIndex++;
    }
    return result;
  }, [sublayerConfig]);

  // Layer plane configs for spatial renderer
  const layerPlanes = useMemo((): LayerPlaneConfig[] => {
    if (!sublayerConfig) return [];
    const layers = (sublayerConfig as Record<string, unknown>)['layers'] as Record<string, {
      label: string;
      color_key: string;
    }> | undefined;
    if (!layers) return [];

    return Object.entries(layers).map(([key, def], i) => ({
      layerKey: key,
      label: def.label,
      colorKey: def.color_key,
      index: i,
    }));
  }, [sublayerConfig]);

  // Layer bands for flat renderer
  const layerBands = useMemo(() => {
    return layerPlanes.map((lp, i) => ({
      layerKey: lp.layerKey,
      label: lp.label,
      colorKey: lp.colorKey,
      y: i * 180 + 30,
      height: 160,
    }));
  }, [layerPlanes]);

  // Filter elements by current view
  const filteredElements = useMemo(() => {
    if (!currentView) return elements;

    let filtered = elements;

    if (currentView.filter_domain) {
      filtered = filtered.filter(e => e.domain_id === currentView.filter_domain);
    }

    if (currentView.filter_layers) {
      const layers = currentView.filter_layers as string[];
      filtered = filtered.filter(e => layers.includes(e.layer));
    }

    if (currentView.filter_specialisations) {
      const specs = currentView.filter_specialisations as string[];
      filtered = filtered.filter(e => e.specialisation && specs.includes(e.specialisation));
    }

    return filtered;
  }, [elements, currentView]);

  // Filtered relationships (both source and target in view)
  const filteredRelationships = useMemo(() => {
    const elIds = new Set(filteredElements.map(e => e.id));
    return relationships.filter(r => elIds.has(r.source_id) && elIds.has(r.target_id));
  }, [relationships, filteredElements]);

  // Build position map from view_elements
  const savedPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const ve of viewElements) {
      map.set(ve.element_id, { x: ve.x, y: ve.y });
    }
    return map;
  }, [viewElements]);

  // Compute layout
  const positionedElements = useMemo((): PositionedElement[] => {
    const layoutInputs = filteredElements.map(el => {
      const shapeDef = getShapeDefinition(el.archimate_type);
      const saved = savedPositions.get(el.id);
      return {
        id: el.id,
        archimateType: el.archimate_type,
        layer: el.layer,
        sublayer: el.sublayer,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
        savedX: saved?.x,
        savedY: saved?.y,
      };
    });

    const positions = computeSpatialLayout(layoutInputs, sublayers, camera.layerSpacing);
    const posMap = new Map(positions.map(p => [p.id, p]));

    return filteredElements.map(el => {
      const pos = posMap.get(el.id);
      const shapeDef = getShapeDefinition(el.archimate_type);
      const drag = dragOffsets.get(el.id);
      return {
        id: el.id,
        name: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation ?? null,
        layer: el.layer,
        sublayer: el.sublayer ?? null,
        domainId: el.domain_id ?? null,
        status: el.status,
        properties: el.properties as Record<string, unknown> | null,
        wx: (pos?.wx ?? 0) + (drag?.dx ?? 0),
        wy: (pos?.wy ?? 0) + (drag?.dy ?? 0),
        wz: pos?.wz ?? 0,
        sx: 0, sy: 0, scale: 1, z: 0,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
      };
    });
  }, [filteredElements, sublayers, savedPositions, dragOffsets, camera.layerSpacing]);

  // Edges
  const positionedEdges = useMemo((): PositionedEdge[] => {
    const elMap = new Map(filteredElements.map(e => [e.id, e]));
    return filteredRelationships.map(r => {
      const src = elMap.get(r.source_id);
      const tgt = elMap.get(r.target_id);
      return {
        id: r.id,
        archimateType: r.archimate_type,
        specialisation: r.specialisation ?? null,
        sourceId: r.source_id,
        targetId: r.target_id,
        label: r.label ?? null,
        sx1: 0, sy1: 0, sx2: 0, sy2: 0,
        sourceLayer: src?.layer ?? '',
        targetLayer: tgt?.layer ?? '',
      };
    });
  }, [filteredRelationships, filteredElements]);

  // Specialisation map
  const specialisationMap = useMemo(() => {
    const map = new Map<string, { code: string }>();
    for (const [key, val] of Object.entries(specMap)) {
      map.set(key, { code: val.code });
    }
    return map;
  }, []);

  // Handlers
  const handleElementClick = useCallback((id: string) => {
    select(id);
    setDetailElement(id);
  }, [select]);

  const handleElementDoubleClick = useCallback((id: string) => {
    setDetailElement(id);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
    setDetailElement(null);
    setContextMenu(null);
    // If focused on a layer, clicking empty space reverts to overview
    if (focusedLayer) {
      animateCameraTo(resetCamera(rotDefault), 1000);
      setFocusedLayer(null);
    }
  }, [clearSelection, focusedLayer, rotDefault, animateCameraTo]);

  // Element drag — update world positions
  const handleElementDrag = useCallback((id: string, dwx: number, dwy: number) => {
    setDragOffsets(prev => {
      const next = new Map(prev);
      const existing = next.get(id) ?? { dx: 0, dy: 0 };
      next.set(id, { dx: existing.dx + dwx, dy: existing.dy + dwy });
      return next;
    });
  }, []);

  // Debounce timer for position saves
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag end — persist position to server
  const handleElementDragEnd = useCallback((id: string) => {
    if (!currentView) return;
    const drag = dragOffsets.get(id);
    if (!drag || (drag.dx === 0 && drag.dy === 0)) return;

    // Find the layout position for this element
    const el = positionedElements.find(e => e.id === id);
    if (!el) return;

    // Build the ViewElement with final world position (layout + drag baked in)
    const ve: ViewElement = {
      view_id: currentView.id,
      element_id: id,
      x: el.wx,  // already includes drag offset from positionedElements memo
      y: el.wy,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
      z_index: 0,
    };

    // Clear drag offset — it's now baked into saved position
    setDragOffsets(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    // Debounce save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Merge with existing viewElements
      const existing = useViewStore.getState().viewElements;
      const merged = existing.filter(e => e.element_id !== id);
      merged.push(ve);
      savePositions(currentView.id, merged);
    }, 500);
  }, [currentView, dragOffsets, positionedElements, savePositions]);

  // Auto-arrange: clear offsets, recompute layout, persist
  const handleArrange = useCallback(() => {
    if (!currentView) return;
    setDragOffsets(new Map());

    // Compute fresh layout (no saved positions)
    const layoutInputs = filteredElements.map(el => {
      const shapeDef = getShapeDefinition(el.archimate_type);
      return {
        id: el.id,
        archimateType: el.archimate_type,
        layer: el.layer,
        sublayer: el.sublayer,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
        // No savedX/savedY — force fresh layout
      };
    });

    const positions = computeSpatialLayout(layoutInputs, sublayers, camera.layerSpacing);

    // Build ViewElements from fresh layout positions
    const freshViewElements: ViewElement[] = positions.map(p => ({
      view_id: currentView.id,
      element_id: p.id,
      x: p.wx,
      y: p.wy,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
      z_index: 0,
    }));

    savePositions(currentView.id, freshViewElements);
  }, [currentView, filteredElements, sublayers, camera.layerSpacing, savePositions]);

  const handleResetCamera = useCallback(() => {
    animateCameraTo(resetCamera(rotDefault), 800);
    setFocusedLayer(null);
  }, [rotDefault, animateCameraTo]);

  // Context menu handlers
  const handleElementContextMenu = useCallback((id: string, x: number, y: number) => {
    setContextMenu({ x, y, elementId: id });
  }, []);

  const handleBackgroundContextMenu = useCallback((x: number, y: number) => {
    setContextMenu({ x, y, elementId: null });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleHighlightDirection = useCallback((id: string, direction: HighlightDirection) => {
    select(id);
    const result = computeHighlight(graph, id, direction);
    setHighlight(result.nodes, result.edges);
  }, [graph, select, setHighlight]);

  const handleCopyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleDeleteElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    const name = el?.name ?? id;
    if (window.confirm(`Delete element "${name}"? This will also remove all its relationships.`)) {
      clearSelection();
      setDetailElement(null);
      deleteElement(id);
    }
  }, [elements, clearSelection, deleteElement]);

  const handleFitAll = useCallback(() => {
    animateCameraTo(resetCamera(rotDefault), 800);
    setFocusedLayer(null);
  }, [rotDefault, animateCameraTo]);

  // Drag-over: hit-test which layer the cursor is over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (renderMode === 'spatial') {
      // Hit-test against layer planes in screen space
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const screenY = e.clientY - rect.top;
      const cx = rect.width / 2 + camera.panX;
      const cy = rect.height / 2 + camera.panY;
      const totalLayers = layerPlanes.length;

      let bestLayer: string | null = null;
      let bestDist = Infinity;
      for (const lp of layerPlanes) {
        const wy = layerWorldY(lp.index, totalLayers, camera.layerSpacing);
        const p = project3D(0, wy, 0, camera.rotY, camera.rotX, cx, cy);
        const projSy = rect.height / 2 + (p.sy - rect.height / 2) * camera.zoom + camera.panY;
        const dist = Math.abs(screenY - projSy);
        if (dist < bestDist) {
          bestDist = dist;
          bestLayer = lp.layerKey;
        }
      }
      setDragOverLayer(bestLayer);
    } else {
      // Flat view: no layer highlight — just allow the drop
      setDragOverLayer(null);
    }
  }, [renderMode, camera, layerPlanes, layerBands]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverLayer(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverLayer(null);

    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    let data: { archimate_type: string; layer: string };
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (!data.archimate_type || !data.layer) return;
    if (!currentView) return;

    const defaultName = data.archimate_type
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const name = window.prompt('Element name:', defaultName);
    if (!name) return; // cancelled

    const id = crypto.randomUUID();

    // Determine the actual layer key for the element
    // The palette sends color_key (e.g. 'business'), we need to match to
    // the sublayer config's layer keys
    let elementLayer = data.layer;
    if (sublayerConfig) {
      const cfg = sublayerConfig as { layers?: Record<string, { color_key: string; sublayers: Array<{ element_types: string[] }> }> };
      if (cfg.layers) {
        for (const [layerKey, def] of Object.entries(cfg.layers)) {
          if (def.color_key === data.layer) {
            const hasType = def.sublayers.some(sl => sl.element_types.includes(data.archimate_type));
            if (hasType) {
              // Map back to base layer for the element's layer field
              elementLayer = layerKey.replace(/_upper|_lower/, '');
              break;
            }
          }
        }
      }
    }

    // Calculate world position from drop point
    let wx = 0;

    if (renderMode === 'spatial') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Find the target layer's wy
      const totalLayers = layerPlanes.length;
      let targetWy = 0;
      for (const lp of layerPlanes) {
        if (lp.colorKey === data.layer) {
          targetWy = layerWorldY(lp.index, totalLayers, camera.layerSpacing);
          break;
        }
      }

      const cx = rect.width / 2 + camera.panX;
      const cy = rect.height / 2 + camera.panY;

      const world = screenToWorldOnPlane(
        screenX, screenY, targetWy,
        camera.rotY, camera.rotX, cx, cy,
        camera.zoom, camera.panX, camera.panY,
        rect.width, rect.height,
      );
      wx = Math.max(-PLANE_WIDTH / 2, Math.min(PLANE_WIDTH / 2, world.wx));
    }

    try {
      const el = await createElement({
        id,
        name,
        archimate_type: data.archimate_type as import('../../model/types').ArchimateType,
        specialisation: null,
        layer: elementLayer as import('../../model/types').ArchimateLayer,
      });

      // Save position so element appears at drop point
      const existing = useViewStore.getState().viewElements;
      const ve: ViewElement = {
        view_id: currentView.id,
        element_id: el.id,
        x: wx,
        y: 0, // wy is computed from layer
        width: null,
        height: null,
        sublayer_override: null,
        style_overrides: null,
        z_index: 0,
      };
      const merged = [...existing.filter(v => v.element_id !== el.id), ve];
      savePositions(currentView.id, merged);
    } catch (err) {
      console.error('Failed to create element:', err);
    }
  }, [currentView, renderMode, camera, layerPlanes, sublayerConfig, createElement, savePositions]);

  // Focus camera on a specific layer: zoom + pan so the target layer sits
  // between ~10% and ~90% of the viewport height, with adjacent layers
  // just visible at the edges.
  const handleLayerClick = useCallback((layerKey: string) => {
    const planeConfig = layerPlanes.find(lp => lp.layerKey === layerKey);
    if (!planeConfig) return;

    // If clicking the already-focused layer, unfocus back to overview
    if (focusedLayer === layerKey) {
      animateCameraTo(resetCamera(rotDefault), 1000);
      setFocusedLayer(null);
      return;
    }

    const totalLayers = layerPlanes.length;
    const targetWy = layerWorldY(planeConfig.index, totalLayers, camera.layerSpacing);

    // Get a reference viewport size from the DOM
    const container = document.querySelector('[style*="overflow: hidden"]');
    const viewH = container?.clientHeight ?? 700;
    const viewW = container?.clientWidth ?? 1200;

    const cx = viewW / 2;
    const cy = viewH / 2;

    // Project the target layer and one layer above/below at base zoom=1, no pan
    const rotY = camera.rotY;
    const rotX = camera.rotX;
    const spacing = camera.layerSpacing;

    const projTarget = project3D(0, targetWy, 0, rotY, rotX, cx, cy);

    // Find the layer above and below (or use spacing delta)
    const aboveWy = targetWy - spacing;
    const belowWy = targetWy + spacing;
    const projAbove = project3D(0, aboveWy, 0, rotY, rotX, cx, cy);
    const projBelow = project3D(0, belowWy, 0, rotY, rotX, cx, cy);

    // We want the above layer at ~10% screen and below at ~90% screen
    const spanSy = Math.abs(projBelow.sy - projAbove.sy);
    if (spanSy < 1) return;

    // Target zoom: the span between adjacent layers should fill 80% of viewport height
    const desiredSpan = viewH * 0.8;
    const newZoom = Math.max(0.3, Math.min(6, desiredSpan / spanSy));

    // Pan: the renderer applies pan as:
    //   finalSy = cy + (panY + y2*s)*zoom + panY = cy + panY*(zoom+1) + y2*s*zoom
    // To centre the target (finalSy = cy), solve:
    //   panY = -(y2*s) * zoom / (zoom + 1)
    // where y2*s = projTarget.sy - cy (projected offset from centre at zoom=1, pan=0)
    const offsetY = projTarget.sy - cy;
    const offsetX = projTarget.sx - cx;
    const newPanY = -offsetY * newZoom / (newZoom + 1);
    const newPanX = -offsetX * newZoom / (newZoom + 1);

    animateCameraTo({
      ...camera,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY,
    }, 1000);
    setFocusedLayer(layerKey);
  }, [layerPlanes, camera, focusedLayer, rotDefault, animateCameraTo]);

  const buildElementMenuGroups = useCallback((id: string): ContextMenuGroup[] => {
    const el = elements.find(e => e.id === id);
    if (!el) return [];

    const statuses = ['active', 'draft', 'deprecated', 'retired'];
    return [
      {
        label: 'View',
        items: [
          { label: 'Show Details', onClick: () => setDetailElement(id) },
          { label: 'Highlight Connections', onClick: () => handleElementClick(id) },
        ],
      },
      {
        label: 'Edit',
        items: [
          { label: 'Edit Properties\u2026', onClick: () => setDetailElement(id) },
          {
            label: 'Change Status',
            onClick: () => {},
            submenu: statuses.map(s => ({
              label: s.charAt(0).toUpperCase() + s.slice(1),
              onClick: () => updateElementStatus(id, s as import('../../model/types').ElementStatus),
              disabled: el.status === s,
            })),
          },
        ],
      },
      {
        label: 'Relationships',
        items: [
          { label: 'Show Incoming', onClick: () => handleHighlightDirection(id, 'incoming') },
          { label: 'Show Outgoing', onClick: () => handleHighlightDirection(id, 'outgoing') },
        ],
      },
      {
        label: 'Clipboard',
        items: [
          { label: 'Copy ID', onClick: () => handleCopyToClipboard(id) },
          { label: 'Copy Name', onClick: () => handleCopyToClipboard(el.name) },
        ],
      },
      {
        label: 'Danger',
        items: [
          { label: 'Delete Element', onClick: () => handleDeleteElement(id), danger: true },
        ],
      },
    ];
  }, [elements, handleElementClick, handleHighlightDirection, handleCopyToClipboard, handleDeleteElement, updateElementStatus]);

  const buildCanvasMenuGroups = useCallback((): ContextMenuGroup[] => {
    return [
      {
        label: 'View',
        items: [
          { label: 'Reset Camera', onClick: handleResetCamera },
          { label: 'Fit All Elements', onClick: handleFitAll },
        ],
      },
      {
        label: 'Navigation',
        items: [
          { label: 'Zoom In', onClick: () => handleCameraChange({ ...camera, zoom: Math.min(10, camera.zoom * 1.15) }) },
          { label: 'Zoom Out', onClick: () => handleCameraChange({ ...camera, zoom: Math.max(0.15, camera.zoom * 0.87) }) },
        ],
      },
      {
        label: 'Theme',
        items: [
          { label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`, onClick: toggleTheme },
        ],
      },
      {
        label: 'Export',
        items: [
          {
            label: 'Export SVG',
            onClick: () => {
              if (!svgRef.current) {
                // Find SVG in DOM as spatial renderer manages its own ref
                const svg = document.querySelector('svg');
                if (svg) exportSvgElement(svg);
                return;
              }
              exportSvgElement(svgRef.current);
            },
          },
          {
            label: 'Export PNG',
            onClick: () => {
              const svg = document.querySelector('svg');
              if (svg) exportPngElement(svg);
            },
          },
        ],
      },
    ];
  }, [handleResetCamera, handleFitAll, theme, toggleTheme, camera, handleCameraChange]);

  // Selected element for badge
  const selectedElement = selectedId ? filteredElements.find(e => e.id === selectedId) : null;

  // Detail panel element
  const detailEl = detailElement ? elements.find(e => e.id === detailElement) : null;

  // Flat layout: compute 2D positions within layer bands
  const flatPositionedElements = useMemo((): PositionedElement[] => {
    const layoutInputs = filteredElements.map(el => {
      const shapeDef = getShapeDefinition(el.archimate_type);
      return {
        id: el.id,
        archimateType: el.archimate_type,
        layer: el.layer,
        sublayer: el.sublayer,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
      };
    });

    const flatBands = layerBands.map(b => ({
      layerKey: b.layerKey,
      y: b.y,
      height: b.height,
    }));

    const positions = computeFlatLayout(layoutInputs, flatBands, sublayers);
    const posMap = new Map(positions.map(p => [p.id, p]));

    return filteredElements.map(el => {
      const pos = posMap.get(el.id);
      const shapeDef = getShapeDefinition(el.archimate_type);
      return {
        id: el.id,
        name: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation ?? null,
        layer: el.layer,
        sublayer: el.sublayer ?? null,
        domainId: el.domain_id ?? null,
        status: el.status,
        properties: el.properties as Record<string, unknown> | null,
        wx: pos?.x ?? 0,
        wy: pos?.y ?? 0,
        wz: 0,
        sx: 0, sy: 0, scale: 1, z: 0,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
      };
    });
  }, [filteredElements, layerBands, sublayers]);

  // Flat edges: assign connection ports so no two edges share the same attachment point
  const flatPositionedEdges = useMemo((): PositionedEdge[] => {
    const elMap = new Map(flatPositionedElements.map(e => [e.id, e]));

    // Build element boxes for port assignment
    const boxes = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const el of flatPositionedElements) {
      boxes.set(el.id, { x: el.wx, y: el.wy, w: el.width, h: el.height });
    }

    // Filter to valid edges (both endpoints exist)
    const validRels = filteredRelationships.filter(r =>
      elMap.has(r.source_id) && elMap.has(r.target_id),
    );

    // Assign ports
    const portAssignments = assignPorts(
      validRels.map(r => ({ id: r.id, sourceId: r.source_id, targetId: r.target_id })),
      boxes,
    );

    return validRels.map(r => {
      const src = elMap.get(r.source_id)!;
      const tgt = elMap.get(r.target_id)!;
      const ports = portAssignments.get(r.id);
      return {
        id: r.id,
        archimateType: r.archimate_type,
        specialisation: r.specialisation ?? null,
        sourceId: r.source_id,
        targetId: r.target_id,
        label: r.label ?? null,
        sx1: ports?.sx1 ?? (src.wx + src.width / 2),
        sy1: ports?.sy1 ?? (src.wy + src.height / 2),
        sx2: ports?.sx2 ?? (tgt.wx + tgt.width / 2),
        sy2: ports?.sy2 ?? (tgt.wy + tgt.height / 2),
        sourceLayer: src.layer,
        targetLayer: tgt.layer,
      };
    });
  }, [flatPositionedElements, filteredRelationships]);

  return React.createElement('div', {
    style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' },
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  },
    // Renderer
    renderMode === 'spatial'
      ? React.createElement(SpatialRenderer, {
          elements: positionedElements,
          edges: positionedEdges,
          layerPlanes,
          camera,
          onCameraChange: handleCameraChange,
          highlightedNodes,
          highlightedEdges,
          selectedId,
          onElementClick: handleElementClick,
          onElementDoubleClick: handleElementDoubleClick,
          onBackgroundClick: handleBackgroundClick,
          onElementDrag: handleElementDrag,
          onElementDragEnd: handleElementDragEnd,
          onElementContextMenu: handleElementContextMenu,
          onBackgroundContextMenu: handleBackgroundContextMenu,
          onLayerClick: handleLayerClick,
          highlightLayer: dragOverLayer,
          theme,
          specialisationMap,
        })
      : React.createElement(FlatRenderer, {
          elements: flatPositionedElements,
          edges: flatPositionedEdges,
          layerBands,
          highlightedNodes,
          highlightedEdges,
          selectedId,
          onElementClick: handleElementClick,
          onElementDoubleClick: handleElementDoubleClick,
          onBackgroundClick: handleBackgroundClick,
          onElementContextMenu: handleElementContextMenu,
          onBackgroundContextMenu: handleBackgroundContextMenu,
          highlightLayer: dragOverLayer,
          theme,
          specialisationMap,
        }),

    // Overlay controls
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      },
    },
      React.createElement(ZoomBar, {
        zoom: camera.zoom,
        onZoomIn: () => handleCameraChange({ ...camera, zoom: Math.min(10, camera.zoom * 1.15) }),
        onZoomOut: () => handleCameraChange({ ...camera, zoom: Math.max(0.15, camera.zoom * 0.87) }),
      }),
      renderMode === 'spatial' ? React.createElement(RotationPanel, {
        rotY: camera.rotY,
        rotX: camera.rotX,
        layerSpacing: camera.layerSpacing,
        onReset: handleResetCamera,
        onLayerSpacingChange: (spacing: number) => setCamera(c => ({ ...c, layerSpacing: spacing })),
      }) : null,
      React.createElement('button', {
        onClick: handleArrange,
        title: 'Auto-arrange elements',
        style: {
          background: 'var(--button-bg, #333)',
          color: 'var(--button-fg, #ccc)',
          border: '1px solid var(--button-border, #555)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 9,
          cursor: 'pointer',
          lineHeight: 1,
        },
      }, 'Arrange'),
    ),

    // Top-right controls
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: 12,
        right: detailEl ? 332 : 12,
        display: 'flex',
        gap: 8,
      },
    },
      React.createElement(ExportMenu, { svgRef }),
    ),

    // Selection badge
    selectedElement ? React.createElement(SelectionBadge, {
      name: selectedElement.name,
      archimateType: selectedElement.archimate_type,
      specialisation: selectedElement.specialisation ?? null,
    }) : null,

    // Detail panel
    detailEl ? React.createElement(DetailPanel, {
      element: detailEl,
      relationships: relationships.filter(r => r.source_id === detailEl.id || r.target_id === detailEl.id),
      elements,
      onClose: () => { setDetailElement(null); clearSelection(); },
      onNavigate: (id: string) => {
        setDetailElement(id);
        select(id);
      },
      onDelete: (id: string) => {
        clearSelection();
        setDetailElement(null);
        deleteElement(id);
      },
      viewId: currentView?.id ?? null,
      viewElements,
      savePositions,
    }) : null,

    // Context menu
    contextMenu ? React.createElement(ContextMenu, {
      x: contextMenu.x,
      y: contextMenu.y,
      groups: contextMenu.elementId
        ? buildElementMenuGroups(contextMenu.elementId)
        : buildCanvasMenuGroups(),
      onClose: closeContextMenu,
    }) : null,
  );
}

function exportSvgElement(svg: SVGElement | Element): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serialiser = new XMLSerializer();
  const svgStr = serialiser.serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  downloadBlob(blob, 'architecture-diagram.svg');
}

function exportPngElement(svg: SVGElement | Element): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serialiser = new XMLSerializer();
  const svgStr = serialiser.serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'architecture-diagram.png');
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = url;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
