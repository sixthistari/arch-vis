import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewSwitcher } from './ViewSwitcher';
import { Palette } from './Palette';
import { LayerControls } from './LayerControls';
import { Canvas } from './Canvas';
import { ModelTree } from './ModelTree';
import { DetailPanel } from './DetailPanel';
import { useUndoRedoStore } from '../interaction/undo-redo';
import { saveModelFile, openModelFile, resetModel } from '../api/client';
import { DataOverlayControls } from './DataOverlayControls';
import { NodeContextMenu } from './ContextMenu';
import { ErrorBoundary } from './ErrorBoundary';
import { FindReplace } from './FindReplace';
import { RelationshipMatrix } from './RelationshipMatrix';
import { TabBar } from './TabBar';
import { usePanelStore } from '../store/panel';
import { useInteractionStore } from '../store/interaction';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useThemeStore } from '../store/theme';
import { useProjectStore } from '../store/project';
import { ValidationPanel } from './ValidationPanel';
import { SpecialisationsManager } from './SpecialisationsManager';
import { HelpPanel } from './HelpPanel';
import { ToastContainer } from './components/Toast';
import { notifySuccess, notifyError } from '../store/notification';
import { MenuBar } from './MenuBar';
import { ProjectDetailsModal } from './ProjectDetailsModal';

function UndoRedoKeyHandler() {
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);
  const canUndo = useUndoRedoStore(s => s.canUndo);
  const canRedo = useUndoRedoStore(s => s.canRedo);
  const toggleFullScreen = usePanelStore(s => s.toggleFullScreen);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // F1 — toggle help panel
      if (e.key === 'F1') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('arch-vis:toggle-help'));
        return;
      }
      // F11 — toggle full screen mode
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
        return;
      }
      // Ctrl+H — find & replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('arch-vis:toggle-find-replace'));
        return;
      }
      // Ctrl+S — save model
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('arch-vis:save-model'));
        return;
      }
      // Ctrl+O — open model
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('arch-vis:open-model'));
        return;
      }
      // Ctrl+N — new model
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('arch-vis:new-model'));
        return;
      }
      // Ctrl+P — print diagram
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
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
  }, [undo, redo, canUndo, canRedo, toggleFullScreen]);

  return null;
}

// ImportMenu, FileMenu, ViewMenu replaced by MenuBar component

function ProjectSelector(): React.ReactElement {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const switchProject = useProjectStore(s => s.switchProject);
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Load projects on mount
  useEffect(() => {
    useProjectStore.getState().loadProjects();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Listen for arch-vis:open-project event to open dropdown
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('arch-vis:open-project', handler);
    return () => window.removeEventListener('arch-vis:open-project', handler);
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleSwitch = async (id: string) => {
    if (id === currentProjectId) return;
    setOpen(false);
    await switchProject(id);
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 11,
    textAlign: 'left',
  };

  const actionBtnStyle: React.CSSProperties = {
    ...itemStyle,
    color: 'var(--text-muted)',
    gap: 6,
  };

  return React.createElement('div', { ref: menuRef, style: { position: 'relative' } },
    React.createElement('button', {
      onClick: () => setOpen(!open),
      title: 'Switch project',
      style: {
        background: 'var(--button-bg)',
        color: 'var(--button-text)',
        border: '1px solid var(--border-primary)',
        borderRadius: 4,
        padding: '3px 10px',
        cursor: 'pointer',
        fontSize: 11,
        maxWidth: 140,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    }, currentProject?.name ?? 'Project'),
    open && React.createElement('div', {
      style: {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 4,
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 100,
        minWidth: 220,
        maxHeight: 300,
        overflowY: 'auto',
      },
    },
      // Project list
      ...projects.map(proj =>
        React.createElement('button', {
          key: proj.id,
          onClick: () => handleSwitch(proj.id),
          style: {
            ...itemStyle,
            background: proj.id === currentProjectId ? 'var(--bg-tertiary)' : 'transparent',
            fontWeight: proj.id === currentProjectId ? 600 : 400,
          },
        },
          proj.id === currentProjectId ? '\u2713 ' : '  ',
          proj.name,
        ),
      ),
      // Separator
      React.createElement('div', {
        style: { height: 1, background: 'var(--border-primary)', margin: '2px 0' },
      }),
      // New Project button
      React.createElement('button', {
        onClick: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent('arch-vis:new-project'));
        },
        style: actionBtnStyle,
      }, '+ New Project'),
      // Project Details button
      React.createElement('button', {
        onClick: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent('arch-vis:project-settings'));
        },
        style: actionBtnStyle,
      }, 'Project Details\u2026'),
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
  const leftPanelOpen = usePanelStore(s => s.leftPanelOpen);
  const rightPanelOpen = usePanelStore(s => s.rightPanelOpen);
  const bottomPanelOpen = usePanelStore(s => s.bottomPanelOpen);
  const bottomPanelHeight = usePanelStore(s => s.bottomPanelHeight);
  const toggleLeftPanel = usePanelStore(s => s.toggleLeftPanel);
  const toggleBottomPanel = usePanelStore(s => s.toggleBottomPanel);
  const fullScreen = usePanelStore(s => s.fullScreen);
  const openTabs = usePanelStore(s => s.openTabs);
  const modelTreeCollapsed = usePanelStore(s => s.modelTreeCollapsed);
  const viewsCollapsed = usePanelStore(s => s.viewsCollapsed);
  const leftPanelSplit = usePanelStore(s => s.leftPanelSplit);
  const toggleModelTree = usePanelStore(s => s.toggleModelTree);
  const toggleViews = usePanelStore(s => s.toggleViews);
  const setLeftPanelSplit = usePanelStore(s => s.setLeftPanelSplit);
  const leftPanelRef = React.useRef<HTMLDivElement>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [specsManagerOpen, setSpecsManagerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'new' | 'edit'>('new');
  const shellTheme = useThemeStore(s => s.theme);

  // Ctrl+H toggle via custom event from UndoRedoKeyHandler
  useEffect(() => {
    const handler = () => setFindReplaceOpen(o => !o);
    document.addEventListener('arch-vis:toggle-find-replace', handler);
    return () => document.removeEventListener('arch-vis:toggle-find-replace', handler);
  }, []);

  // F1 toggle help panel via custom event from UndoRedoKeyHandler
  useEffect(() => {
    const handler = () => setHelpOpen(o => !o);
    document.addEventListener('arch-vis:toggle-help', handler);
    return () => document.removeEventListener('arch-vis:toggle-help', handler);
  }, []);

  // Project modal via custom events
  useEffect(() => {
    const handleNewProject = () => {
      setProjectModalMode('new');
      setProjectModalOpen(true);
    };
    const handleProjectSettings = () => {
      setProjectModalMode('edit');
      setProjectModalOpen(true);
    };
    window.addEventListener('arch-vis:new-project', handleNewProject);
    window.addEventListener('arch-vis:project-settings', handleProjectSettings);
    return () => {
      window.removeEventListener('arch-vis:new-project', handleNewProject);
      window.removeEventListener('arch-vis:project-settings', handleProjectSettings);
    };
  }, []);

  // File operation keyboard shortcuts via custom events
  useEffect(() => {
    const handleSave = async () => {
      try {
        await saveModelFile();
        notifySuccess('Model saved');
      } catch (err) {
        console.error('Save model failed:', err);
        notifyError('Save failed', {
          operation: 'Save model',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    };
    const handleOpen = async () => {
      if (!window.confirm('Opening a model will replace the current model. Continue?')) return;
      try {
        await openModelFile();
        window.location.reload();
      } catch (err) {
        if (err instanceof Error && err.message === 'No file selected') return;
        console.error('Open model failed:', err);
      }
    };
    const handleNew = async () => {
      if (!window.confirm('Create a new model? Unsaved changes will be lost.')) return;
      try {
        await resetModel(false);
        window.location.reload();
      } catch (err) {
        console.error('New model failed:', err);
        notifyError('Failed to create new model', {
          operation: 'New model',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    };
    document.addEventListener('arch-vis:save-model', handleSave);
    document.addEventListener('arch-vis:open-model', handleOpen);
    document.addEventListener('arch-vis:new-model', handleNew);
    return () => {
      document.removeEventListener('arch-vis:save-model', handleSave);
      document.removeEventListener('arch-vis:open-model', handleOpen);
      document.removeEventListener('arch-vis:new-model', handleNew);
    };
  }, []);

  const selectedId = useInteractionStore(s => s.selectedId);
  const clearSelection = useInteractionStore(s => s.clearSelection);
  const select = useInteractionStore(s => s.select);
  const formatPainter = useInteractionStore(s => s.formatPainter);
  const deactivateFormatPainter = useInteractionStore(s => s.deactivateFormatPainter);
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const deleteElement = useModelStore(s => s.deleteElement);
  const currentView = useViewStore(s => s.currentView);
  const viewElements = useViewStore(s => s.viewElements);
  const savePositions = useViewStore(s => s.savePositions);
  const positionSaveError = useViewStore(s => s.positionSaveError);

  // Cursor change when format painter is active
  useEffect(() => {
    if (formatPainter.active) {
      document.body.style.cursor = 'crosshair';
      return () => { document.body.style.cursor = ''; };
    }
  }, [formatPainter.active]);

  // Escape key to deactivate format painter
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && formatPainter.active) {
        e.preventDefault();
        deactivateFormatPainter();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [formatPainter.active, deactivateFormatPainter]);

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
    findReplaceOpen && React.createElement(FindReplace, {
      onClose: () => setFindReplaceOpen(false),
      theme: shellTheme,
    }),
    matrixOpen && React.createElement(RelationshipMatrix, {
      onClose: () => setMatrixOpen(false),
    }),
    specsManagerOpen && React.createElement(SpecialisationsManager, {
      onClose: () => setSpecsManagerOpen(false),
    }),
    helpOpen && React.createElement(HelpPanel, {
      onClose: () => setHelpOpen(false),
    }),
    projectModalOpen && React.createElement(ProjectDetailsModal, {
      mode: projectModalMode,
      onClose: () => setProjectModalOpen(false),
    }),

    // ── Menu Bar ──
    React.createElement(MenuBar, {
      onToggleFindReplace: () => setFindReplaceOpen(o => !o),
      onToggleValidation: () => {
        const next = !validationOpen;
        setValidationOpen(next);
        if (next && !bottomPanelOpen) toggleBottomPanel();
      },
      onToggleMatrix: () => setMatrixOpen(o => !o),
      onToggleSpecs: () => setSpecsManagerOpen(o => !o),
      onToggleHelp: () => setHelpOpen(o => !o),
      findReplaceOpen,
      validationOpen,
      matrixOpen,
      specsManagerOpen,
    }),

    // ── Secondary bar: project selector + notation indicator ──
    React.createElement('div', {
      'data-panel': 'toolbar',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        height: 28,
        flexShrink: 0,
        gap: 8,
      },
    },
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8 },
      },
        React.createElement(ProjectSelector, null),
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
      ),
      formatPainter.active ? React.createElement('span', {
        style: { fontSize: 10, color: '#F59E0B', fontWeight: 600 },
      }, 'Format Painter active \u2014 click elements to apply, Escape to exit') : null,
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
      !fullScreen && leftPanelOpen && React.createElement('div', {
        'data-panel': 'left',
        ref: leftPanelRef,
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
        // Model tree collapsed header (when collapsed)
        modelTreeCollapsed && React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            flexShrink: 0,
            borderBottom: '1px solid var(--border-primary)',
            cursor: 'pointer',
            userSelect: 'none',
          },
          onClick: toggleModelTree,
        },
          React.createElement('span', {
            style: { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' },
          }, 'Model'),
          React.createElement('span', {
            style: { fontSize: 10, color: 'var(--text-muted)' },
          }, '▸'),
        ),
        // Model tree section (when expanded)
        React.createElement('div', {
          style: {
            flex: viewsCollapsed ? 1 : (modelTreeCollapsed ? 0 : leftPanelSplit),
            overflow: 'hidden',
            display: modelTreeCollapsed ? 'none' : 'flex',
            flexDirection: 'column',
            minHeight: modelTreeCollapsed ? 0 : 60,
          },
        },
          !modelTreeCollapsed && React.createElement(ModelTree, { onClose: toggleLeftPanel, onCollapse: toggleModelTree }),
        ),
        // Resize handle between Model tree and Views
        React.createElement('div', {
          'data-resize': 'left-split',
          style: {
            height: (modelTreeCollapsed || viewsCollapsed) ? 1 : 5,
            flexShrink: 0,
            background: 'var(--border-primary)',
            cursor: (modelTreeCollapsed || viewsCollapsed) ? 'default' : 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          },
          onMouseDown: (modelTreeCollapsed || viewsCollapsed) ? undefined : (e: React.MouseEvent) => {
            e.preventDefault();
            const panel = leftPanelRef.current;
            if (!panel) return;
            const startY = e.clientY;
            const panelRect = panel.getBoundingClientRect();
            const panelHeight = panelRect.height;
            const startSplit = leftPanelSplit;
            const onMove = (me: MouseEvent) => {
              const delta = me.clientY - startY;
              const newSplit = startSplit + delta / panelHeight;
              setLeftPanelSplit(newSplit);
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
            };
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          },
        },
          // Grip dots (only when both sections visible)
          !(modelTreeCollapsed || viewsCollapsed) && React.createElement('div', {
            style: {
              width: 20,
              height: 3,
              borderTop: '1px dotted var(--text-muted)',
              borderBottom: '1px dotted var(--text-muted)',
              opacity: 0.5,
            },
          }),
        ),
        // Views header bar (always visible — acts as collapse/expand toggle)
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            flexShrink: 0,
            borderBottom: viewsCollapsed ? 'none' : '1px solid var(--border-primary)',
            cursor: 'pointer',
            userSelect: 'none',
          },
          onClick: toggleViews,
        },
          React.createElement('span', {
            style: {
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 700,
            },
          }, 'Views'),
          React.createElement('span', {
            style: { fontSize: 10, color: 'var(--text-muted)' },
          }, viewsCollapsed ? '▸' : '▾'),
        ),
        // View switcher content
        React.createElement('div', {
          style: {
            flex: modelTreeCollapsed ? 1 : (viewsCollapsed ? 0 : (1 - leftPanelSplit)),
            overflow: viewsCollapsed ? 'hidden' : 'auto',
            minHeight: viewsCollapsed ? 0 : 40,
            display: viewsCollapsed ? 'none' : 'block',
          },
        },
          React.createElement(ViewSwitcher, null),
        ),
      ),

      // Centre column (tab bar + canvas + bottom panel)
      React.createElement('div', {
        style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      },
        // Tab bar
        React.createElement(TabBar, null),
        // Canvas (or empty state when no tabs open)
        React.createElement('div', {
          style: { flex: 1, position: 'relative', overflow: 'hidden' },
        },
          openTabs.length === 0
            ? React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  flexDirection: 'column',
                  gap: 8,
                },
              },
                React.createElement('span', { style: { fontSize: 28, opacity: 0.3 } }, '\u25A1'),
                React.createElement('span', null, 'Open a view from the sidebar to get started'),
              )
            : React.createElement(ErrorBoundary, { name: 'Canvas' },
                React.createElement(Canvas, null),
              ),
        ),

        // Bottom panel (collapsible) — Properties + Validation tabs
        React.createElement('div', {
          'data-panel': 'bottom',
          style: {
            height: fullScreen ? 0 : ((bottomPanelOpen || validationOpen) ? bottomPanelHeight : 0),
            flexShrink: 0,
            borderTop: (bottomPanelOpen || validationOpen) ? '1px solid var(--border-primary)' : 'none',
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.15s ease',
          },
        },
          // Tab bar for bottom panel
          React.createElement('div', {
            style: {
              height: 22,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-primary)',
              fontSize: 10,
              userSelect: 'none',
            },
          },
            React.createElement('button', {
              onClick: () => {
                if (validationOpen) { setValidationOpen(false); if (!bottomPanelOpen) toggleBottomPanel(); }
                else if (bottomPanelOpen) toggleBottomPanel();
                else toggleBottomPanel();
              },
              style: {
                background: (bottomPanelOpen && !validationOpen) ? 'var(--bg-secondary)' : 'transparent',
                color: (bottomPanelOpen && !validationOpen) ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRight: '1px solid var(--border-primary)',
                padding: '2px 14px',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: (bottomPanelOpen && !validationOpen) ? 600 : 400,
              },
            }, 'Properties'),
            React.createElement('button', {
              onClick: () => {
                setValidationOpen(true);
                if (!bottomPanelOpen) toggleBottomPanel();
              },
              style: {
                background: validationOpen ? 'var(--bg-secondary)' : 'transparent',
                color: validationOpen ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRight: '1px solid var(--border-primary)',
                padding: '2px 14px',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: validationOpen ? 600 : 400,
              },
            }, 'Validation'),
            // Collapse button
            React.createElement('button', {
              onClick: () => {
                if (bottomPanelOpen) toggleBottomPanel();
                setValidationOpen(false);
              },
              style: {
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 10,
                marginLeft: 'auto',
              },
              title: 'Collapse panel',
            }, '\u25BC'),
          ),
          // Panel content — either Properties or Validation
          React.createElement('div', {
            style: { flex: 1, overflow: 'auto' },
          },
            validationOpen
              ? React.createElement(ErrorBoundary, { name: 'Validation Panel' },
                  React.createElement(ValidationPanel, {
                    onClose: () => setValidationOpen(false),
                  }),
                )
              : React.createElement(ErrorBoundary, { name: 'Detail Panel' },
                  selectedElement
                    ? React.createElement(DetailPanel, {
                        element: selectedElement,
                        relationships: selectedRelationships,
                        elements,
                        onClose: handleCloseDetail,
                        onNavigate: handleNavigate,
                        onDelete: handleDelete,
                        viewId: currentView?.id ?? null,
                        viewElements,
                        savePositions,
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
        ),
        // Toggle button visible when collapsed
        !(bottomPanelOpen || validationOpen) && React.createElement('div', {
          'data-panel': 'bottom-toggle',
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
      !fullScreen && rightPanelOpen && React.createElement('div', {
        'data-panel': 'right',
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
    !fullScreen && React.createElement('div', {
      'data-panel': 'status',
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
      formatPainter.active
        ? React.createElement('span', {
            style: { color: '#F59E0B', fontWeight: 600 },
          }, 'Format Painter active \u2014 click elements to apply appearance. Press Escape or click the button to exit.')
        : React.createElement('span', null, 'Ctrl+S: save  |  Ctrl+O: open  |  Ctrl+N: new  |  Ctrl+Z: undo  |  Ctrl+Y: redo  |  Del: delete  |  Shift+drag: box select  |  Ctrl+P: print'),
      positionSaveError ? React.createElement('span', {
        title: positionSaveError,
        style: {
          color: '#F59E0B',
          fontWeight: 600,
          marginLeft: 'auto',
        },
      }, '\u26A0 Position save failed') : null,
    ),

    // ── Toast notifications ──
    React.createElement(ToastContainer, null),
  );
}
