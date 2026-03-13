import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { ViewSwitcher } from './ViewSwitcher';
import { Palette } from './Palette';
import { Canvas } from './Canvas';
import { ExportMenu } from './ExportMenu';
import { ModelTree } from './ModelTree';
import { useUndoRedoStore } from '../interaction/undo-redo';

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

export function Shell(): React.ReactElement {
  const [showModelTree, setShowModelTree] = useState(true);
  const canUndo = useUndoRedoStore(s => s.canUndo);
  const canRedo = useUndoRedoStore(s => s.canRedo);
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);

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
    // Top bar
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
        // Model tree toggle
        React.createElement('button', {
          onClick: () => setShowModelTree(v => !v),
          title: 'Toggle model tree',
          style: {
            background: showModelTree ? 'var(--button-active-bg, #3B82F6)' : 'var(--button-bg)',
            color: showModelTree ? '#FFFFFF' : 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, 'Model'),
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
        }, '↩ Undo'),
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
        }, '↪ Redo'),
        // Import
        React.createElement('button', {
          onClick: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xml,.archimate';
            input.onchange = () => {
              if (input.files?.[0]) {
                window.alert(`Import of "${input.files[0].name}" is not yet implemented.\nArchiMate XML parsing coming soon.`);
              }
            };
            input.click();
          },
          style: {
            background: 'var(--button-bg)',
            color: 'var(--button-text)',
            border: '1px solid var(--border-primary)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: 'pointer',
            fontSize: 11,
          },
        }, 'Import ArchiMate'),
        React.createElement(ExportMenu, null),
        React.createElement(ThemeToggle, null),
      ),
    ),

    // Main content
    React.createElement('div', {
      style: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      },
    },
      // Left sidebar: model tree + palette + view switcher
      React.createElement('div', {
        style: {
          display: 'flex',
          flexShrink: 0,
          overflow: 'hidden',
          borderRight: '1px solid var(--border-primary)',
        },
      },
        // Model tree panel
        showModelTree && React.createElement('div', {
          style: {
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
          React.createElement(ModelTree, { onClose: () => setShowModelTree(false) }),
        ),

        // View switcher + palette
        React.createElement('div', {
          style: {
            width: 180,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            overflow: 'auto',
          },
        },
          React.createElement(ViewSwitcher, null),
          React.createElement(Palette, null),
        ),
      ),

      // Canvas area
      React.createElement('div', {
        style: { flex: 1, position: 'relative', overflow: 'hidden' },
      },
        React.createElement(Canvas, null),
      ),
    ),

    // Status bar
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
      React.createElement('span', null, 'arch-vis — ArchiMate Architecture Visualiser'),
      React.createElement('span', null, 'Shift+drag: box select  |  Shift+click: multi-select  |  Del: delete  |  Double-click: rename  |  Ctrl+Z: undo  |  Ctrl+Y: redo'),
    ),
  );
}
