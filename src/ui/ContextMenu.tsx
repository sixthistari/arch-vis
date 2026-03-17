/**
 * ContextMenu — context menus for arch-vis.
 *
 * Exports:
 *  - NodeContextMenu: store-driven right-click menu for xyflow canvas nodes
 *  - ContextMenu: legacy prop-driven menu used by the spatial canvas
 *  - ContextMenuGroup: type used by legacy spatial Canvas
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInteractionStore } from '../store/interaction';
import { useViewStore } from '../store/view';
import { useModelStore } from '../store/model';
import { useThemeStore } from '../store/theme';
import { usePanelStore } from '../store/panel';
import { fetchElementViews } from '../api/client';
import * as api from '../api/client';
import type { View } from '../model/types';
import { useUndoRedoStore, removeFromViewCommand, deleteElementCommand } from '../interaction/undo-redo';
import { notifyError, notifySuccess } from '../store/notification';

// ═══════════════════════════════════════
// Legacy ContextMenu (prop-driven, used by spatial Canvas)
// ═══════════════════════════════════════

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuGroup {
  label: string;
  items: ContextMenuItem[];
}

interface LegacyContextMenuProps {
  x: number;
  y: number;
  groups: ContextMenuGroup[];
  onClose: () => void;
}

function menuItemStyle(danger?: boolean, disabled?: boolean): React.CSSProperties {
  return {
    padding: '6px 12px 6px 16px',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--text-muted)' : danger ? '#e05252' : 'var(--text-primary)',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.1s',
  };
}

export function ContextMenu({ x, y, groups, onClose }: LegacyContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState({ x, y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (rect.right > window.innerWidth) nx = x - rect.width;
    if (rect.bottom > window.innerHeight) ny = y - rect.height;
    if (nx < 0) nx = 0;
    if (ny < 0) ny = 0;
    setPosition({ x: nx, y: ny });
  }, [x, y]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleKeyDown, handleClickOutside]);

  return React.createElement('div', {
    ref: menuRef,
    style: {
      position: 'fixed',
      left: position.x,
      top: position.y,
      zIndex: 1000,
      background: 'var(--panel-bg)',
      border: '1px solid var(--panel-border)',
      borderRadius: 6,
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      padding: '4px 0',
      minWidth: 180,
      fontSize: 12,
      userSelect: 'none',
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  },
    ...groups.flatMap((group, gi) => {
      const items: React.ReactElement[] = [];

      if (gi > 0) {
        items.push(React.createElement('div', {
          key: `sep-${gi}`,
          style: { height: 1, background: 'var(--border-secondary)', margin: '4px 8px' },
        }));
      }

      items.push(React.createElement('div', {
        key: `label-${gi}`,
        style: {
          padding: '3px 12px 2px',
          fontSize: 10,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        },
      }, group.label));

      for (let ii = 0; ii < group.items.length; ii++) {
        const item = group.items[ii]!;
        const itemKey = `${gi}-${ii}`;

        if (item.submenu) {
          items.push(React.createElement('div', {
            key: itemKey,
            style: { position: 'relative' },
            onMouseEnter: () => setSubmenuOpen(itemKey),
            onMouseLeave: () => setSubmenuOpen(null),
          },
            React.createElement('div', {
              style: {
                ...menuItemStyle(false, item.disabled),
                display: 'flex',
                justifyContent: 'space-between',
              },
            },
              item.label,
              React.createElement('span', { style: { marginLeft: 12, opacity: 0.5 } }, '\u25B6'),
            ),
            submenuOpen === itemKey ? React.createElement('div', {
              style: {
                position: 'absolute',
                left: '100%',
                top: 0,
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                padding: '4px 0',
                minWidth: 140,
              },
            },
              ...item.submenu.map((sub, si) =>
                React.createElement('div', {
                  key: si,
                  style: menuItemStyle(sub.danger, sub.disabled),
                  onClick: sub.disabled ? undefined : () => { sub.onClick(); onClose(); },
                }, sub.label),
              ),
            ) : null,
          ));
        } else {
          items.push(React.createElement('div', {
            key: itemKey,
            style: menuItemStyle(item.danger, item.disabled),
            onClick: item.disabled ? undefined : () => { item.onClick(); onClose(); },
          }, item.label));
        }
      }

      return items;
    }),
  );
}

// ═══════════════════════════════════════
// NodeContextMenu (store-driven, used by xyflow canvas)
// ═══════════════════════════════════════

export function NodeContextMenu(): React.ReactElement | null {
  const contextMenu = useInteractionStore(s => s.contextMenu);
  const hideContextMenu = useInteractionStore(s => s.hideContextMenu);
  const setHighlight = useInteractionStore(s => s.setHighlight);
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const loadAll = useModelStore(s => s.loadAll);
  const switchView = useViewStore(s => s.switchView);
  const viewList = useViewStore(s => s.viewList);
  const createView = useViewStore(s => s.createView);
  const currentView = useViewStore(s => s.currentView);
  const viewElements = useViewStore(s => s.viewElements);
  const clearSelection = useInteractionStore(s => s.clearSelection);
  const selectedNodeIds = useInteractionStore(s => s.selectedNodeIds);
  const openTab = usePanelStore(s => s.openTab);
  const theme = useThemeStore(s => s.theme);
  const run = useUndoRedoStore(s => s.run);

  const [otherViews, setOtherViews] = useState<View[]>([]);
  const [jumpExpanded, setJumpExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch views containing this element when menu opens
  useEffect(() => {
    if (!contextMenu) {
      setOtherViews([]);
      setJumpExpanded(false);
      return;
    }

    let cancelled = false;
    fetchElementViews(contextMenu.elementId).then(views => {
      if (cancelled) return;
      const filtered = views.filter(v => v.id !== currentView?.id);
      setOtherViews(filtered);
    }).catch(() => {
      if (!cancelled) setOtherViews([]);
    });

    return () => { cancelled = true; };
  }, [contextMenu, currentView?.id]);

  // Close on Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contextMenu, hideContextMenu]);

  // Close on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [contextMenu, hideContextMenu]);

  const handleShowIncoming = useCallback(() => {
    if (!contextMenu) return;
    const incoming = relationships.filter(r => r.target_id === contextMenu.elementId);
    const nodeIds = new Set(incoming.map(r => r.source_id));
    nodeIds.add(contextMenu.elementId);
    const edgeIds = new Set(incoming.map(r => r.id));
    setHighlight(nodeIds, edgeIds);
    hideContextMenu();
  }, [contextMenu, relationships, setHighlight, hideContextMenu]);

  const handleShowOutgoing = useCallback(() => {
    if (!contextMenu) return;
    const outgoing = relationships.filter(r => r.source_id === contextMenu.elementId);
    const nodeIds = new Set(outgoing.map(r => r.target_id));
    nodeIds.add(contextMenu.elementId);
    const edgeIds = new Set(outgoing.map(r => r.id));
    setHighlight(nodeIds, edgeIds);
    hideContextMenu();
  }, [contextMenu, relationships, setHighlight, hideContextMenu]);

  const handleJumpToView = useCallback((viewId: string) => {
    const view = viewList.find(v => v.id === viewId);
    openTab(viewId, view?.name ?? 'Untitled');
    switchView(viewId);
    hideContextMenu();
  }, [viewList, openTab, switchView, hideContextMenu]);

  const handleCreateLinkedView = useCallback(async () => {
    if (!contextMenu) return;
    const el = elements.find(e => e.id === contextMenu.elementId);
    if (!el) return;

    const viewName = window.prompt('Name for new linked view:');
    if (!viewName?.trim()) { hideContextMenu(); return; }

    // Determine viewpoint type based on notation
    let viewpointType = 'custom';
    if (el.archimate_type.startsWith('uml-')) viewpointType = 'uml_class';
    else if (el.archimate_type.startsWith('wf-')) viewpointType = 'wireframe';

    await createView(viewName.trim(), viewpointType);
    const newCurrentView = useViewStore.getState().currentView;
    if (!newCurrentView) { hideContextMenu(); return; }

    // Find directly related elements
    const relatedRels = relationships.filter(
      r => r.source_id === el.id || r.target_id === el.id,
    );
    const relatedIds = new Set<string>();
    relatedIds.add(el.id);
    for (const r of relatedRels) {
      relatedIds.add(r.source_id);
      relatedIds.add(r.target_id);
    }

    // Place elements in a grid
    const ids = Array.from(relatedIds);
    const cols = Math.max(3, Math.ceil(Math.sqrt(ids.length)));
    const viewEls = ids.map((eid, i) => ({
      view_id: newCurrentView.id,
      element_id: eid,
      x: (i % cols) * 150 + 50,
      y: Math.floor(i / cols) * 120 + 50,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
      z_index: 0,
    }));

    await api.updateViewElements(newCurrentView.id, viewEls);
    await loadAll();
    openTab(newCurrentView.id, newCurrentView.name);
    await switchView(newCurrentView.id);
    hideContextMenu();
  }, [contextMenu, elements, relationships, createView, openTab, switchView, hideContextMenu, loadAll]);

  const loadView = useViewStore(s => s.loadView);

  const handleDuplicate = useCallback(async () => {
    if (!contextMenu || !currentView) return;
    const el = elements.find(e => e.id === contextMenu.elementId);
    if (!el) return;

    // Create a copy of the element
    const newElement = await api.createElement({
      id: `el-${crypto.randomUUID()}`,
      name: `Copy of ${el.name}`,
      archimate_type: el.archimate_type,
      specialisation: el.specialisation,
      layer: el.layer,
      sublayer: el.sublayer,
      domain_id: el.domain_id,
      status: el.status,
      description: el.description,
      properties: el.properties,
      confidence: el.confidence,
      parent_id: el.parent_id,
    });

    // Find original position on current view
    const origVE = viewElements.find(ve => ve.element_id === contextMenu.elementId);
    const x = (origVE?.x ?? 100) + 20;
    const y = (origVE?.y ?? 100) + 20;

    // Place the new element on the current view offset by (20, 20)
    await api.updateViewElements(currentView.id, [
      ...viewElements,
      {
        view_id: currentView.id,
        element_id: newElement.id,
        x,
        y,
        width: origVE?.width ?? null,
        height: origVE?.height ?? null,
        sublayer_override: origVE?.sublayer_override ?? null,
        style_overrides: origVE?.style_overrides ?? null,
        z_index: origVE?.z_index ?? 0,
      },
    ]);

    await loadAll();
    await loadView(currentView.id);
    hideContextMenu();
  }, [contextMenu, currentView, elements, viewElements, loadAll, loadView, hideContextMenu]);

  const handleBringToFront = useCallback(async () => {
    if (!contextMenu || !currentView) return;
    const maxZ = viewElements.reduce((max, ve) => Math.max(max, ve.z_index ?? 0), 0);
    const updated = viewElements.map(ve =>
      ve.element_id === contextMenu.elementId
        ? { ...ve, z_index: maxZ + 1 }
        : ve,
    );
    await api.updateViewElements(currentView.id, updated);
    await loadView(currentView.id);
    hideContextMenu();
  }, [contextMenu, currentView, viewElements, loadView, hideContextMenu]);

  const handleSendToBack = useCallback(async () => {
    if (!contextMenu || !currentView) return;
    const minZ = viewElements.reduce((min, ve) => Math.min(min, ve.z_index ?? 0), 0);
    const updated = viewElements.map(ve =>
      ve.element_id === contextMenu.elementId
        ? { ...ve, z_index: minZ - 1 }
        : ve,
    );
    await api.updateViewElements(currentView.id, updated);
    await loadView(currentView.id);
    hideContextMenu();
  }, [contextMenu, currentView, viewElements, loadView, hideContextMenu]);

  const handleRemoveFromView = useCallback(async () => {
    if (!contextMenu || !currentView) return;
    const saved = viewElements.filter(ve => ve.element_id === contextMenu.elementId);
    const viewId = currentView.id;
    await run(removeFromViewCommand(
      viewId,
      [contextMenu.elementId],
      saved,
      async () => { await loadView(viewId); clearSelection(); },
    ));
    hideContextMenu();
  }, [contextMenu, currentView, viewElements, run, loadView, clearSelection, hideContextMenu]);

  const handleDeleteFromModel = useCallback(async () => {
    if (!contextMenu) return;
    const el = elements.find(e => e.id === contextMenu.elementId);
    if (!el) return;
    if (!window.confirm(`Delete "${el.name}" from the model? This cannot be undone from other views.`)) return;
    await run(deleteElementCommand(el, async () => { await loadAll(); clearSelection(); }));
    hideContextMenu();
  }, [contextMenu, elements, run, loadAll, clearSelection, hideContextMenu]);

  const handleGenerateViewFromSelection = useCallback(async () => {
    if (selectedNodeIds.size < 2) return;
    const viewName = window.prompt('Name for new view:', 'New View');
    if (!viewName?.trim()) { hideContextMenu(); return; }

    // Determine viewpoint type from the first selected element
    const firstEl = elements.find(e => selectedNodeIds.has(e.id));
    let viewpointType = 'custom';
    if (firstEl) {
      if (firstEl.archimate_type.startsWith('uml-')) viewpointType = 'uml_class';
      else if (firstEl.archimate_type.startsWith('wf-')) viewpointType = 'wireframe';
      else if (firstEl.archimate_type.startsWith('dm-')) viewpointType = 'data_logical';
    }

    await createView(viewName.trim(), viewpointType);
    const newCurrentView = useViewStore.getState().currentView;
    if (!newCurrentView) { hideContextMenu(); return; }

    // Place selected elements in a grid layout
    const ids = Array.from(selectedNodeIds);
    const cols = Math.max(3, Math.ceil(Math.sqrt(ids.length)));
    const viewEls = ids.map((eid, i) => ({
      view_id: newCurrentView.id,
      element_id: eid,
      x: (i % cols) * 200 + 50,
      y: Math.floor(i / cols) * 160 + 50,
      width: null,
      height: null,
      sublayer_override: null,
      style_overrides: null,
      z_index: 0,
    }));

    await api.updateViewElements(newCurrentView.id, viewEls);
    await loadAll();
    openTab(newCurrentView.id, newCurrentView.name);
    await switchView(newCurrentView.id);
    hideContextMenu();
  }, [selectedNodeIds, elements, createView, openTab, switchView, hideContextMenu, loadAll]);

  const handlePromote = useCallback(async () => {
    if (!contextMenu) return;
    try {
      await api.promoteElement(contextMenu.elementId);
      notifySuccess('Promoted to Governed');
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('422')) {
        notifyError('Cannot promote', { detail: 'Element must have a name and description to be promoted.' });
      } else {
        notifyError('Promote failed', { errorMessage: msg });
      }
    }
    hideContextMenu();
  }, [contextMenu, loadAll, hideContextMenu]);

  const handleDemote = useCallback(async () => {
    if (!contextMenu) return;
    try {
      await api.demoteElement(contextMenu.elementId);
      notifySuccess('Demoted to Working');
      await loadAll();
    } catch (err) {
      notifyError('Demote failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    }
    hideContextMenu();
  }, [contextMenu, loadAll, hideContextMenu]);

  if (!contextMenu) return null;

  const contextElement = elements.find(e => e.id === contextMenu.elementId);
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';
  const mutedColour = isDark ? '#64748B' : '#94A3B8';

  const itemStyle: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: textColour,
    whiteSpace: 'nowrap',
  };

  const hoverHandlers = () => ({
    onMouseEnter: (e: React.MouseEvent) => {
      (e.currentTarget as HTMLElement).style.background = hoverBg;
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
    },
  });

  return React.createElement('div', {
    ref: menuRef,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: {
      position: 'fixed',
      top: contextMenu.y,
      left: contextMenu.x,
      zIndex: 10000,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 4,
      padding: '4px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      minWidth: 180,
    },
  },
    // Show Incoming
    React.createElement('div', {
      onClick: handleShowIncoming,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Show Incoming'),

    // Show Outgoing
    React.createElement('div', {
      onClick: handleShowOutgoing,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Show Outgoing'),

    // Separator
    React.createElement('div', {
      style: { height: 1, background: border, margin: '4px 0' },
    }),

    // Jump to Diagram (only if element appears in other views)
    otherViews.length > 0 && React.createElement('div', {
      style: { position: 'relative' as const },
    },
      React.createElement('div', {
        onClick: () => setJumpExpanded(j => !j),
        style: {
          ...itemStyle,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        ...hoverHandlers(),
      },
        React.createElement('span', null, 'Jump to Diagram'),
        React.createElement('span', { style: { marginLeft: 8, fontSize: 9 } }, '\u25B8'),
      ),

      // Submenu
      jumpExpanded && React.createElement('div', {
        style: {
          position: 'absolute' as const,
          left: '100%',
          top: 0,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 4,
          padding: '4px 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          minWidth: 180,
          maxHeight: 300,
          overflowY: 'auto' as const,
        },
      },
        ...otherViews.map(view =>
          React.createElement('div', {
            key: view.id,
            onClick: () => handleJumpToView(view.id),
            style: {
              ...itemStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            },
            ...hoverHandlers(),
          },
            React.createElement('span', { style: { flex: 1 } }, view.name),
            React.createElement('span', {
              style: {
                fontSize: 8,
                color: mutedColour,
                background: isDark ? '#0F172A' : '#F1F5F9',
                borderRadius: 3,
                padding: '1px 4px',
              },
            }, view.viewpoint_type),
          ),
        ),
      ),
    ),

    // Separator before Create Linked View
    otherViews.length > 0 && React.createElement('div', {
      style: { height: 1, background: border, margin: '4px 0' },
    }),

    // Create Linked View
    React.createElement('div', {
      onClick: handleCreateLinkedView,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Create Linked View'),

    // Generate View from Selection (only when multiple nodes selected)
    selectedNodeIds.size >= 2 && React.createElement('div', {
      onClick: handleGenerateViewFromSelection,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Generate View from Selection'),

    // Duplicate Element
    React.createElement('div', {
      onClick: handleDuplicate,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Duplicate'),

    // Separator before governance actions
    React.createElement('div', {
      style: { height: 1, background: border, margin: '4px 0' },
    }),

    // Promote / Demote
    contextElement?.area === 'working' && React.createElement('div', {
      onClick: handlePromote,
      style: { ...itemStyle, color: '#22C55E' },
      ...hoverHandlers(),
    }, 'Promote to Governed'),

    contextElement?.area === 'governed' && React.createElement('div', {
      onClick: handleDemote,
      style: { ...itemStyle, color: '#F59E0B' },
      ...hoverHandlers(),
    }, 'Demote to Working'),

    // Separator before z-order actions
    React.createElement('div', {
      style: { height: 1, background: border, margin: '4px 0' },
    }),

    // Bring to Front
    React.createElement('div', {
      onClick: handleBringToFront,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Bring to Front'),

    // Send to Back
    React.createElement('div', {
      onClick: handleSendToBack,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Send to Back'),

    // Separator before delete actions
    React.createElement('div', {
      style: { height: 1, background: border, margin: '4px 0' },
    }),

    // Remove from View
    React.createElement('div', {
      onClick: handleRemoveFromView,
      style: itemStyle,
      ...hoverHandlers(),
    }, 'Remove from View'),

    // Delete from Model (danger)
    React.createElement('div', {
      onClick: handleDeleteFromModel,
      style: { ...itemStyle, color: '#e05252' },
      ...hoverHandlers(),
    }, 'Delete from Model'),
  );
}
