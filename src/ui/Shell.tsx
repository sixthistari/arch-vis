import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ViewSwitcher } from './ViewSwitcher';
import { Palette } from './Palette';
import { LayerControls } from './LayerControls';
import { Canvas } from './Canvas';
import { ExportMenu } from './ExportMenu';
import { ModelTree } from './ModelTree';
import { DetailPanel } from './DetailPanel';
import { useUndoRedoStore } from '../interaction/undo-redo';
import { importArchimateXml, importCsv } from '../api/client';
import { DataOverlayControls } from './DataOverlayControls';
import { NodeContextMenu } from './ContextMenu';
import { usePanelStore } from '../store/panel';
import { useInteractionStore } from '../store/interaction';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';

function UndoRedoKeyHandler() {
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);
  const canUndo = useUndoRedoStore(s => s.canUndo);
  const canRedo = useUndoRedoStore(s => s.canRedo);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo, canUndo, canRedo]);

  return null;
}

function ImportMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);

  const handleImportXml = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.archimate';
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      try {
        const text = await input.files[0].text();
        const result = await importArchimateXml(text);
        window.alert(`Imported ${result.elementsCreated} elements and ${result.relationshipsCreated} relationships.`);
        window.location.reload();
      } catch (err) {
        console.error('ArchiMate XML import failed:', err);
        window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
    setOpen(false);
  }, []);

  const handleImportCsv = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      try {
        const files = Array.from(input.files);
        let elementsCsv = '';
        let relationsCsv = '';
        let propertiesCsv = '';

        for (const file of files) {
          const text = await file.text();
          const name = file.name.toLowerCase();
          if (name.includes('element')) {
            elementsCsv = text;
          } else if (name.includes('relation')) {
            relationsCsv = text;
          } else if (name.includes('propert')) {
            propertiesCsv = text;
          } else if (!elementsCsv) {
            elementsCsv = text;
          }
        }

        if (!elementsCsv) {
          window.alert('No elements CSV file found. Name files with "elements", "relations", or "properties".');
          return;
        }

        const result = await importCsv({
          elements: elementsCsv,
          relations: relationsCsv,
          properties: propertiesCsv || undefined,
        });
        window.alert(`Imported ${result.elementsCreated} elements and ${result.relationshipsCreated} relationships.`);
        window.location.reload();
      } catch (err) {
        console.error('CSV import failed:', err);
        window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
    setOpen(false);
  }, []);

  const itemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 11,
    textAlign: 'left',
  };

  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('button', {
      onClick: () => setOpen(!open),
      style: {
        background: 'var(--button-bg)',
        color: 'var(--button-text)',
        border: '1px solid var(--border-primary)',
        borderRadius: 4,
        padding: '3px 10px',
        cursor: 'pointer',
        fontSize: 11,
      },
    }, 'Import'),
    open && React.createElement('div', {
      style: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 100,
        minWidth: 160,
      },
      onMouseLeave: () => setOpen(false),
    },
      React.createElement('button', { onClick: handleImportXml, style: itemStyle }, 'Import ArchiMate XML'),
      React.createElement('button', { onClick: handleImportCsv, style: itemStyle }, 'Import CSV (Archi)'),
    ),
  );
}

function notationLabel(viewpointType: string | undefined): string {
  if (!viewpointType) return '';
  if (viewpointType.startsWith('uml')) return 'UML';
  if (viewpointType === 'wireframe') return 'Wireframe';
  return 'ArchiMate';
}

export function Shell(): React.ReactElement {
  const canUndo = useUndoRedoStore(s => s.canUndo);
  const canRedo = useUndoRedoStore(s => s.canRedo);
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);

  const leftPanelOpen = usePanelStore(s => s.leftPanelOpen);
  const rightPanelOpen = usePanelStore(s => s.rightPanelOpen);
  const bottomPanelOpen = usePanelStore(s => s.bottomPanelOpen);
  const bottomPanelHeight = usePanelStore(s => s.bottomPanelHeight);
  const toggleLeftPanel = usePanelStore(s => s.toggleLeftPanel);
  const toggleRightPanel = usePanelStore(s => s.toggleRightPanel);
  const toggleBottomPanel = usePanelStore(s => s.toggleBottomPanel);

  const selectedId = useInteractionStore(s => s.selectedId);
  const clearSelection = useInteractionStore(s => s.clearSelection);
  const select = useInteractionStore(s => s.select);
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const deleteElement = useModelStore(s => s.deleteElement);
  const currentView = useViewStore(s => s.currentView);

  const selectedElement = useMemo(
    () => selectedId ? elements.find(el => el.id === selectedId) : undefined,
    [selectedId, elements],
  );

  const selectedRelationships = useMemo(
    () => selectedId
      ? relationships.filter(r => r.source_id === selectedId || r.target_id === selectedId)
      : [],
    [selectedId, relationships],
  );

  const handleNavigate = useCallback((elementId: string) => {
    select(elementId);
  }, [select]);

  const handleCloseDetail = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleDelete = useCallback(async (elementId: string) => {
    await deleteElement(elementId);
    clearSelection();
  }, [deleteElement, clearSelection]);

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--button-active-bg, #3B82F6)' : 'var(--button-bg)',
    color: active ? '#FFFFFF' : 'var(--button-text)',
    border: '1px solid var(--border-primary)',
    borderRadius: 4,
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: 11,
  });

  const notation = notationLabel(currentView?.viewpoint_type);

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      transition: 'background-color 0.2s, color 0.2s',
    },
  },
    React.createElement(UndoRedoKeyHandler, null),
    React.createElement(NodeContextMenu, null),

    // ── Toolbar ──
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        height: 36,
        flexShrink: 0,
      },
    },
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: 10 },
      },
        React.createElement('span', {
          style: { fontSize: 13, fontWeight: 600, letterSpacing: 0.5 },
        }, 'arch-vis'),
        // Notation mode indicator
        notation ? React.createElement('span', {
          style: {
            fontSize: 9,
            fontWeight: 600,
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            padding: '2px 7px',
            borderRadius: 3,
            letterSpacing: 0.3,
            userSelect: 'none',
          },
        }, notation) : null,
        // Panel toggles
        React.createElement('button', {
          onClick: toggleLeftPanel,
          title: 'Toggle left panel',
          style: toggleBtnStyle(leftPanelOpen),
        }, 'Left'),
        React.createElement('button', {
          onClick: toggleRightPanel,
          title: 'Toggle right panel',
          style: toggleBtnStyle(rightPanelOpen),
        }, 'Right'),
      ),
      React.createElement('div', {
        style: { display: 'flex', gap: 8, alignItems: 'center' },
      },
        // Undo / Redo
        React.createElement('button', {
          onClick: () => undo(),
          disabled: !canUndo,
          title: 'Undo (Ctrl+Z)',
          style: {
            background: 'var(--button-bg)',
            color: canUndo ? 'var(--button-text)' : 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: canUndo ? 'pointer' : 'default',
            fontSize: 11,
            opacity: canUndo ? 1 : 0.4,
          },
        }, '\u21A9 Undo'),
        React.createElement('button', {
          onClick: () => redo(),
          disabled: !canRedo,
          title: 'Redo (Ctrl+Y)',
          style: {
            background: 'var(--button-bg)',
            color: canRedo ? 'var(--button-text)' : 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: canRedo ? 'pointer' : 'default',
            fontSize: 11,
            opacity: canRedo ? 1 : 0.4,
          },
        }, '\u21AA Redo'),
        React.createElement(ImportMenu, null),
        React.createElement(ExportMenu, null),
        React.createElement(ThemeToggle, null),
      ),
    ),

    // ── Main 3-column area ──
    React.createElement('div', {
      style: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      },
    },
      // Left panel (220px)
      leftPanelOpen && React.createElement('div', {
        style: {
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
        },
      },
        // Model tree (~60%)
        React.createElement('div', {
          style: { flex: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
        },
          React.createElement(ModelTree, { onClose: toggleLeftPanel }),
        ),
        // Divider
        React.createElement('div', {
          style: { height: 1, flexShrink: 0, background: 'var(--border-primary)' },
        }),
        // View switcher (~40%)
        React.createElement('div', {
          style: { flex: 2, overflow: 'auto' },
        },
          React.createElement(ViewSwitcher, null),
        ),
      ),

      // Centre column (canvas + bottom panel)
      React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      },
        // Canvas
        React.createElement('div', {
          style: { flex: 1, position: 'relative', overflow: 'hidden' },
        },
          React.createElement(Canvas, null),
        ),

        // Bottom panel (collapsible)
        React.createElement('div', {
          style: {
            height: bottomPanelOpen ? bottomPanelHeight : 0,
            flexShrink: 0,
            borderTop: bottomPanelOpen ? '1px solid var(--border-primary)' : 'none',
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.15s ease',
          },
        },
          // Collapse/expand handle
          React.createElement('div', {
            style: {
              height: 20,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-primary)',
              fontSize: 10,
              color: 'var(--text-muted)',
              userSelect: 'none',
            },
            onClick: toggleBottomPanel,
            title: 'Toggle detail panel',
          }, bottomPanelOpen ? '\u25BC Properties' : '\u25B2 Properties'),
          // Detail panel content
          React.createElement('div', {
            style: { flex: 1, overflow: 'auto' },
          },
            selectedElement
              ? React.createElement(DetailPanel, {
                  element: selectedElement,
                  relationships: selectedRelationships,
                  elements,
                  onClose: handleCloseDetail,
                  onNavigate: handleNavigate,
                  onDelete: handleDelete,
                })
              : React.createElement('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontStyle: 'italic',
                  },
                }, 'Select an element to view properties'),
          ),
        ),
        // Toggle button visible when collapsed
        !bottomPanelOpen && React.createElement('div', {
          style: {
            height: 20,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border-primary)',
            fontSize: 10,
            color: 'var(--text-muted)',
            userSelect: 'none',
          },
          onClick: toggleBottomPanel,
          title: 'Show detail panel',
        }, '\u25B2 Properties'),
      ),

      // Right panel (200px)
      rightPanelOpen && React.createElement('div', {
        style: {
          width: 200,
          flexShrink: 0,
          borderLeft: '1px solid var(--border-primary)',
          background: 'var(--bg-secondary)',
          overflow: 'auto',
        },
      },
        React.createElement(Palette, null),
        React.createElement(LayerControls, null),
        React.createElement(DataOverlayControls, null),
      ),
    ),

    // ── Status bar ──
    React.createElement('div', {
      style: {
        height: 22,
        flexShrink: 0,
        padding: '0 14px',
        background: 'var(--status-bg)',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        fontSize: 10,
        color: 'var(--status-text)',
        gap: 16,
      },
    },
      React.createElement('span', null, 'arch-vis \u2014 ArchiMate Architecture Visualiser'),
      React.createElement('span', null, 'Shift+drag: box select  |  Shift+click: multi-select  |  Del: delete  |  Double-click: rename  |  Arrow keys: nudge (Shift\u00D710)  |  Ctrl+A: select all  |  Esc: deselect  |  Ctrl+Z: undo  |  Ctrl+Y: redo'),
    ),
  );
}
