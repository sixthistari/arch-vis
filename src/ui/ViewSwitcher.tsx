import React, { useState, useRef, useEffect } from 'react';
import { useViewStore } from '../store/view';
import type { View } from '../model/types';

// ═══════════════════════════════════════
// Viewpoint type classification
// ═══════════════════════════════════════

const UML_VIEWPOINTS = new Set([
  'uml_class', 'uml_component', 'uml_sequence', 'uml_activity', 'uml_usecase',
]);

const WIREFRAME_VIEWPOINTS = new Set(['wireframe']);

function classifyView(view: View): 'archimate' | 'uml' | 'wireframe' {
  if (UML_VIEWPOINTS.has(view.viewpoint_type)) return 'uml';
  if (WIREFRAME_VIEWPOINTS.has(view.viewpoint_type)) return 'wireframe';
  return 'archimate';
}

// ═══════════════════════════════════════
// Section component
// ═══════════════════════════════════════

interface ViewSectionProps {
  title: string;
  views: View[];
  currentViewId: string | undefined;
  onSwitch: (id: string) => void;
  onCreate: (viewpointType: string) => void;
  defaultViewpointType: string;
}

function ViewSection({ title, views, currentViewId, onSwitch, onCreate, defaultViewpointType }: ViewSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return React.createElement('div', { style: { marginBottom: 4 } },
    // Section header
    React.createElement('div', {
      style: {
        fontSize: 10,
        color: 'var(--text-muted)',
        padding: '4px 12px 2px',
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none' as const,
      },
    },
      React.createElement('span', {
        onClick: () => setCollapsed(c => !c),
        style: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
      },
        React.createElement('span', null, collapsed ? '▸' : '▾'),
        title,
      ),
      React.createElement('button', {
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onCreate(defaultViewpointType); },
        title: `Create new ${title.toLowerCase()}`,
        style: {
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: '0 4px',
        },
      }, '+'),
    ),

    // View list
    !collapsed && views.map((view) =>
      React.createElement('button', {
        key: view.id,
        onClick: () => onSwitch(view.id),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          background: currentViewId === view.id ? 'var(--bg-tertiary)' : 'transparent',
          color: currentViewId === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
          border: 'none',
          borderLeft: currentViewId === view.id ? '3px solid var(--highlight)' : '3px solid transparent',
          padding: '6px 12px',
          cursor: 'pointer',
          textAlign: 'left' as const,
          fontSize: 11,
          transition: 'all 0.15s',
        },
      },
        React.createElement('span', {
          style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
        }, view.name),
        React.createElement('span', {
          style: {
            fontSize: 8,
            opacity: 0.6,
            background: 'var(--bg-tertiary)',
            borderRadius: 3,
            padding: '1px 4px',
            flexShrink: 0,
          },
        }, view.viewpoint_type),
        view.render_mode === 'spatial' ? React.createElement('span', {
          style: {
            fontSize: 8,
            opacity: 0.5,
            marginLeft: 2,
            fontStyle: 'italic',
          },
        }, '3D') : null,
      ),
    ),
  );
}

// ═══════════════════════════════════════
// ViewSwitcher (main export)
// ═══════════════════════════════════════

export function ViewSwitcher(): React.ReactElement {
  const { viewList, currentView, switchView, createView } = useViewStore();
  const [creating, setCreating] = useState<string | null>(null); // viewpointType or null
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ block: 'nearest' });
      }, 30);
    }
  }, [creating]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(null); return; }
    await createView(name, creating ?? undefined);
    setNewName('');
    setCreating(null);
  };

  const handleStartCreate = (viewpointType: string) => {
    setCreating(viewpointType);
    setNewName('');
  };

  // Classify views into sections
  const archimateViews = viewList.filter(v => classifyView(v) === 'archimate');
  const umlViews = viewList.filter(v => classifyView(v) === 'uml');
  const wireframeViews = viewList.filter(v => classifyView(v) === 'wireframe');

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '8px 0',
    },
  },
    React.createElement('div', {
      style: {
        fontSize: 10,
        color: 'var(--text-muted)',
        padding: '0 12px 4px',
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        fontWeight: 700,
      },
    }, 'Views'),

    // ArchiMate Views (always show section if any views exist)
    (archimateViews.length > 0 || viewList.length === 0) && React.createElement(ViewSection, {
      title: 'ArchiMate Views',
      views: archimateViews,
      currentViewId: currentView?.id,
      onSwitch: switchView,
      onCreate: handleStartCreate,
      defaultViewpointType: 'custom',
    }),

    // UML Diagrams
    umlViews.length > 0 && React.createElement(ViewSection, {
      title: 'UML Diagrams',
      views: umlViews,
      currentViewId: currentView?.id,
      onSwitch: switchView,
      onCreate: handleStartCreate,
      defaultViewpointType: 'uml_class',
    }),

    // Wireframes
    wireframeViews.length > 0 && React.createElement(ViewSection, {
      title: 'Wireframes',
      views: wireframeViews,
      currentViewId: currentView?.id,
      onSwitch: switchView,
      onCreate: handleStartCreate,
      defaultViewpointType: 'wireframe',
    }),

    // Always show UML + Wireframe create buttons even if no views exist yet
    umlViews.length === 0 && React.createElement(ViewSection, {
      title: 'UML Diagrams',
      views: [],
      currentViewId: currentView?.id,
      onSwitch: switchView,
      onCreate: handleStartCreate,
      defaultViewpointType: 'uml_class',
    }),

    wireframeViews.length === 0 && React.createElement(ViewSection, {
      title: 'Wireframes',
      views: [],
      currentViewId: currentView?.id,
      onSwitch: switchView,
      onCreate: handleStartCreate,
      defaultViewpointType: 'wireframe',
    }),

    // Inline create input
    creating ? React.createElement('input', {
      ref: inputRef,
      value: newName,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreate();
        if (e.key === 'Escape') { setCreating(null); setNewName(''); }
      },
      onBlur: handleCreate,
      placeholder: 'View name…',
      style: {
        margin: '2px 12px',
        padding: '4px 8px',
        fontSize: 11,
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--highlight)',
        borderRadius: 3,
        outline: 'none',
      },
    }) : null,
  );
}
