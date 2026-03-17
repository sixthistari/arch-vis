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
import { importArchimateXml, importCsv, saveModelFile, openModelFile, resetModel } from '../api/client';
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
import { notifySuccess, notifyError, notifyWarning } from '../store/notification';

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
        await importArchimateXml(text);
        window.location.reload();
      } catch (err) {
        console.error('ArchiMate XML import failed:', err);
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
          notifyWarning('No elements CSV file found', 'Name files with "elements", "relations", or "properties".');
          return;
        }

        await importCsv({
          elements: elementsCsv,
          relations: relationsCsv,
          properties: propertiesCsv || undefined,
        });
        window.location.reload();
      } catch (err) {
        console.error('CSV import failed:', err);
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

function FileMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);

  const handleNew = useCallback(async () => {
    setOpen(false);
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
  }, []);

  const handleOpen = useCallback(async () => {
    setOpen(false);
    if (!window.confirm('Opening a model will replace the current model. Continue?')) return;
    try {
      await openModelFile();
      // Toast fires from importModelFull in client.ts
      window.location.reload();
    } catch (err) {
      if (err instanceof Error && err.message === 'No file selected') return;
      console.error('Open model failed:', err);
      // Error toast fires from importModelFull in client.ts
    }
  }, []);

  const handleSave = useCallback(async () => {
    setOpen(false);
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
  }, []);

  const handleClose = useCallback(async () => {
    setOpen(false);
    if (!window.confirm('Close the current model? Unsaved changes will be lost.')) return;
    try {
      await resetModel(true);
      window.location.reload();
    } catch (err) {
      console.error('Close model failed:', err);
      notifyError('Failed to close model', {
        operation: 'Close model',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
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

  const shortcutStyle: React.CSSProperties = {
    float: 'right',
    color: 'var(--text-muted)',
    fontSize: 10,
    marginLeft: 16,
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
    }, 'File'),
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
        minWidth: 200,
      },
      onMouseLeave: () => setOpen(false),
    },
      React.createElement('button', { onClick: handleNew, style: itemStyle },
        'New Model',
        React.createElement('span', { style: shortcutStyle }, 'Ctrl+N'),
      ),
      React.createElement('button', { onClick: handleOpen, style: itemStyle },
        'Open Model\u2026',
        React.createElement('span', { style: shortcutStyle }, 'Ctrl+O'),
      ),
      React.createElement('button', { onClick: handleSave, style: itemStyle },
        'Save Model',
        React.createElement('span', { style: shortcutStyle }, 'Ctrl+S'),
      ),
      React.createElement('div', {
        style: { height: 1, background: 'var(--border-primary)', margin: '2px 0' },
      }),
      React.createElement('button', { onClick: handleClose, style: itemStyle },
        'Close Model (Reload Seed)',
      ),
    ),
  );
}

function ViewMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const leftPanelOpen = usePanelStore(s => s.leftPanelOpen);
  const rightPanelOpen = usePanelStore(s => s.rightPanelOpen);
  const bottomPanelOpen = usePanelStore(s => s.bottomPanelOpen);
  const fullScreen = usePanelStore(s => s.fullScreen);
  const toggleLeftPanel = usePanelStore(s => s.toggleLeftPanel);
  const toggleRightPanel = usePanelStore(s => s.toggleRightPanel);
  const toggleBottomPanel = usePanelStore(s => s.toggleBottomPanel);
  const toggleFullScreen = usePanelStore(s => s.toggleFullScreen);

  // Close menu on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  const checkMark = (active: boolean) => active ? '\u2713 ' : '    ';

  const toggle = (fn: () => void) => () => { fn(); };

  const divider = React.createElement('div', {
    style: { height: 1, background: 'var(--border-primary)', margin: '2px 0' },
  });

  return React.createElement('div', { ref: menuRef, style: { position: 'relative' } },
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
    }, 'View'),
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
        fontFamily: 'monospace',
      },
    },
      React.createElement('button', { onClick: toggle(toggleLeftPanel), style: itemStyle },
        checkMark(leftPanelOpen), 'Model Tree & Views',
      ),
      React.createElement('button', { onClick: toggle(toggleRightPanel), style: itemStyle },
        checkMark(rightPanelOpen), 'Palette & Controls',
      ),
      React.createElement('button', { onClick: toggle(toggleBottomPanel), style: itemStyle },
        checkMark(bottomPanelOpen), 'Properties Panel',
      ),
      divider,
      React.createElement('button', { onClick: toggle(toggleFullScreen), style: itemStyle },
        checkMark(fullScreen), 'Full Screen',
        React.createElement('span', {
          style: { float: 'right', color: 'var(--text-muted)', fontSize: 10, marginLeft: 16 },
        }, 'F11'),
      ),
    ),
  );
}

function ProjectSelector(): React.ReactElement {
  const projects = useProjectStore(s => s.projects);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const switchProject = useProjectStore(s => s.switchProject);
  const createProject = useProjectStore(s => s.createProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const updateProject = useProjectStore(s => s.updateProject);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
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
        setCreating(false);
        setRenaming(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    await createProject({ name });
    setNewName('');
    setCreating(false);
  };

  const handleSwitch = async (id: string) => {
    if (id === currentProjectId) return;
    setOpen(false);
    await switchProject(id);
  };

  const handleDelete = async (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (!window.confirm(`Delete project "${proj?.name}"? All its elements, relationships, and views will be permanently deleted.`)) return;
    await deleteProject(id);
    setOpen(false);
  };

  const handleRename = async () => {
    if (!renaming || !renameName.trim()) { setRenaming(null); return; }
    await updateProject(renaming, { name: renameName.trim() });
    setRenaming(null);
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 11,
    textAlign: 'left',
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
        renaming === proj.id
          ? React.createElement('div', { key: proj.id, style: { padding: '4px 12px' } },
              React.createElement('input', {
                autoFocus: true,
                value: renameName,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRenameName(e.target.value),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setRenaming(null);
                },
                onBlur: handleRename,
                style: {
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--highlight)',
                  borderRadius: 3,
                  padding: '3px 6px',
                  fontSize: 11,
                  outline: 'none',
                },
              }),
            )
          : React.createElement('div', {
              key: proj.id,
              style: {
                ...itemStyle,
                background: proj.id === currentProjectId ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: proj.id === currentProjectId ? 600 : 400,
              },
            },
              React.createElement('span', {
                onClick: () => handleSwitch(proj.id),
                style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
              },
                proj.id === currentProjectId ? '\u2713 ' : '  ',
                proj.name,
              ),
              React.createElement('span', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
                React.createElement('button', {
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setRenaming(proj.id);
                    setRenameName(proj.name);
                  },
                  title: 'Rename',
                  style: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10, padding: '0 2px' },
                }, '\u270E'),
                projects.length > 1 && React.createElement('button', {
                  onClick: (e: React.MouseEvent) => { e.stopPropagation(); handleDelete(proj.id); },
                  title: 'Delete project',
                  style: { background: 'none', border: 'none', color: '#e05252', cursor: 'pointer', fontSize: 10, padding: '0 2px' },
                }, '\u2716'),
              ),
            ),
      ),
      // Separator
      React.createElement('div', {
        style: { height: 1, background: 'var(--border-primary)', margin: '2px 0' },
      }),
      // Create new project
      creating
        ? React.createElement('div', { style: { padding: '6px 12px' } },
            React.createElement('input', {
              autoFocus: true,
              value: newName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              },
              onBlur: handleCreate,
              placeholder: 'Project name\u2026',
              style: {
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--highlight)',
                borderRadius: 3,
                padding: '3px 6px',
                fontSize: 11,
                outline: 'none',
              },
            }),
          )
        : React.createElement('button', {
            onClick: () => setCreating(true),
            style: {
              ...itemStyle,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            },
          }, '+ New Project'),
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
  const toggleBottomPanel = usePanelStore(s => s.toggleBottomPanel);
  const fullScreen = usePanelStore(s => s.fullScreen);
  const toggleFullScreen = usePanelStore(s => s.toggleFullScreen);
  const openTabs = usePanelStore(s => s.openTabs);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [specsManagerOpen, setSpecsManagerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
        // Toast fires from importModelFull in client.ts
        window.location.reload();
      } catch (err) {
        if (err instanceof Error && err.message === 'No file selected') return;
        console.error('Open model failed:', err);
        // Error toast fires from importModelFull in client.ts
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
  const activateFormatPainter = useInteractionStore(s => s.activateFormatPainter);
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

  const handleFormatPainterClick = useCallback(() => {
    if (formatPainter.active) {
      deactivateFormatPainter();
      return;
    }
    // Activate: copy style_overrides from selected element's view_element
    if (!selectedId) {
      window.alert('Select an element first to copy its appearance.');
      return;
    }
    const ve = viewElements.find(v => v.element_id === selectedId);
    const overrides = (ve?.style_overrides as Record<string, unknown>) ?? {};
    activateFormatPainter(overrides);
  }, [formatPainter.active, selectedId, viewElements, activateFormatPainter, deactivateFormatPainter]);

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

    // ── Toolbar ──
    React.createElement('div', {
      'data-panel': 'toolbar',
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
        // Project selector
        React.createElement(ProjectSelector, null),
        // File menu
        React.createElement(FileMenu, null),
        // View menu (show/hide panels, full screen)
        React.createElement(ViewMenu, null),
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
        React.createElement('button', {
          onClick: handleFormatPainterClick,
          title: formatPainter.active ? 'Exit format painter (Escape)' : 'Format Painter \u2014 copy appearance to other elements',
          style: {
            background: formatPainter.active ? 'var(--highlight)' : 'var(--button-bg)',
            color: formatPainter.active ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, formatPainter.active ? '\uD83D\uDD8C\uFE0F Painting\u2026' : '\uD83D\uDD8C\uFE0F Format Painter'),
        React.createElement('button', {
          onClick: () => setFindReplaceOpen(o => !o),
          title: 'Find & Replace (Ctrl+H)',
          style: {
            background: findReplaceOpen ? 'var(--highlight)' : 'var(--button-bg)',
            color: findReplaceOpen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, '\uD83D\uDD0D'),
        React.createElement('button', {
          onClick: () => {
            const next = !validationOpen;
            setValidationOpen(next);
            if (next && !bottomPanelOpen) toggleBottomPanel();
          },
          title: 'Validate model',
          style: {
            background: validationOpen ? 'var(--highlight)' : 'var(--button-bg)',
            color: validationOpen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, 'Validate'),
        React.createElement('button', {
          onClick: () => setMatrixOpen(o => !o),
          title: 'Relationship Matrix',
          style: {
            background: matrixOpen ? 'var(--highlight)' : 'var(--button-bg)',
            color: matrixOpen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, 'Matrix'),
        React.createElement('button', {
          onClick: () => setSpecsManagerOpen(o => !o),
          title: 'Manage Specialisations',
          style: {
            background: specsManagerOpen ? 'var(--highlight)' : 'var(--button-bg)',
            color: specsManagerOpen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, 'Specs'),
        React.createElement(ImportMenu, null),
        React.createElement(ExportMenu, null),
        React.createElement('button', {
          onClick: toggleFullScreen,
          title: fullScreen ? 'Exit full screen (F11)' : 'Full screen (F11)',
          style: {
            background: fullScreen ? 'var(--highlight)' : 'var(--button-bg)',
            color: fullScreen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, fullScreen ? '\u2716 Exit' : '\u26F6'),
        React.createElement('button', {
          onClick: () => setHelpOpen(o => !o),
          title: 'Feature Reference (F1)',
          style: {
            background: helpOpen ? 'var(--highlight)' : 'var(--button-bg)',
            color: helpOpen ? '#000' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
          },
        }, '?'),
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
      !fullScreen && leftPanelOpen && React.createElement('div', {
        'data-panel': 'left',
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
