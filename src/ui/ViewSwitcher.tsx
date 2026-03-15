import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useViewStore } from '../store/view';
import { usePanelStore } from '../store/panel';
import * as api from '../api/client';
import type { View } from '../model/types';
import { ARCHIMATE_VIEWPOINTS, getArchiMateViewpoint } from '../notation/archimate-viewpoints';

/** Return a short display label for a viewpoint_type value. */
function viewpointLabel(vt: string): string {
  const named = getArchiMateViewpoint(vt);
  if (named) return named.name;
  // Fallback: humanise the raw ID
  return vt.replace(/_/g, ' ');
}

// ═══════════════════════════════════════
// Viewpoint type classification
// ═══════════════════════════════════════

const UML_VIEWPOINTS = new Set([
  'uml_class', 'uml_component', 'uml_sequence', 'uml_activity', 'uml_usecase',
]);

const WIREFRAME_VIEWPOINTS = new Set(['wireframe']);

const DATA_VIEWPOINTS = new Set(['data_conceptual', 'data_logical', 'data_physical']);

function classifyView(view: View): 'archimate' | 'uml' | 'wireframe' | 'data' {
  if (UML_VIEWPOINTS.has(view.viewpoint_type)) return 'uml';
  if (WIREFRAME_VIEWPOINTS.has(view.viewpoint_type)) return 'wireframe';
  if (DATA_VIEWPOINTS.has(view.viewpoint_type)) return 'data';
  // All am_* named viewpoints are ArchiMate
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
  onDuplicate: (viewId: string) => void;
  defaultViewpointType: string;
}

function ViewSection({ title, views, currentViewId, onSwitch, onCreate, onDuplicate, defaultViewpointType }: ViewSectionProps) {
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
      React.createElement('div', {
        key: view.id,
        className: 'view-row',
        style: {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          position: 'relative' as const,
        },
      },
        React.createElement('button', {
          onClick: () => onSwitch(view.id),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flex: 1,
            background: currentViewId === view.id ? 'var(--bg-tertiary)' : 'transparent',
            color: currentViewId === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: 'none',
            borderLeft: currentViewId === view.id ? '3px solid var(--highlight)' : '3px solid transparent',
            padding: '6px 12px',
            cursor: 'pointer',
            textAlign: 'left' as const,
            fontSize: 11,
            transition: 'all 0.15s',
            minWidth: 0,
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
          }, viewpointLabel(view.viewpoint_type)),
          view.render_mode === 'spatial' ? React.createElement('span', {
            style: {
              fontSize: 8,
              opacity: 0.5,
              marginLeft: 2,
              fontStyle: 'italic',
            },
          }, '3D') : null,
        ),
        // Duplicate button (visible on hover via CSS class)
        React.createElement('button', {
          className: 'view-duplicate-btn',
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDuplicate(view.id); },
          title: 'Duplicate view',
          style: {
            position: 'absolute' as const,
            right: 4,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 11,
            padding: '2px 4px',
            borderRadius: 3,
            opacity: 0,
            transition: 'opacity 0.15s',
          },
        }, '\u2398'),
      ),
    ),
  );
}

// ═══════════════════════════════════════
// ViewSwitcher (main export)
// ═══════════════════════════════════════

/** Viewpoint options shown in the dropdown when creating an ArchiMate view. */
const ARCHIMATE_VIEWPOINT_OPTIONS = [
  { value: 'custom', label: 'Custom (no restrictions)' },
  { value: 'layered', label: 'Layered (all layers)' },
  ...ARCHIMATE_VIEWPOINTS.map(vp => ({ value: vp.id, label: vp.name })),
];

export function ViewSwitcher(): React.ReactElement {
  const { viewList, currentView, switchView, createView } = useViewStore();
  const openTab = usePanelStore(s => s.openTab);
  const [creating, setCreating] = useState<string | null>(null); // viewpointType or null
  const [newName, setNewName] = useState('');
  const [selectedViewpoint, setSelectedViewpoint] = useState<string>('custom');
  const inputRef = useRef<HTMLInputElement>(null);

  // Open a view as a tab and switch to it
  const handleSwitchView = useCallback((viewId: string) => {
    const view = viewList.find(v => v.id === viewId);
    const name = view?.name ?? 'Untitled';
    openTab(viewId, name);
    switchView(viewId);
  }, [viewList, openTab, switchView]);

  useEffect(() => {
    if (creating) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ block: 'nearest' });
      }, 30);
    }
  }, [creating]);

  // Determine if the current create flow is for an ArchiMate view
  const isCreatingArchimate = creating !== null
    && !UML_VIEWPOINTS.has(creating)
    && !WIREFRAME_VIEWPOINTS.has(creating)
    && !DATA_VIEWPOINTS.has(creating);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(null); return; }
    // For ArchiMate views, use the selected named viewpoint; otherwise use the notation type
    const viewpointType = isCreatingArchimate ? selectedViewpoint : creating;
    await createView(name, viewpointType ?? undefined);
    // Open the newly created view as a tab
    const newView = useViewStore.getState().currentView;
    if (newView) {
      openTab(newView.id, newView.name);
    }
    setNewName('');
    setCreating(null);
    setSelectedViewpoint('custom');
  };

  const handleStartCreate = (viewpointType: string) => {
    setCreating(viewpointType);
    setNewName('');
    setSelectedViewpoint('custom');
  };

  const handleDuplicateView = useCallback(async (viewId: string) => {
    const newView = await api.duplicateView(viewId);
    const viewListUpdated = await api.fetchViews();
    useViewStore.setState({ viewList: viewListUpdated });
    // Switch to the duplicated view
    openTab(newView.id, newView.name);
    switchView(newView.id);
  }, [openTab, switchView]);

  // Classify views into sections
  const archimateViews = viewList.filter(v => classifyView(v) === 'archimate');
  const umlViews = viewList.filter(v => classifyView(v) === 'uml');
  const wireframeViews = viewList.filter(v => classifyView(v) === 'wireframe');
  const dataViews = viewList.filter(v => classifyView(v) === 'data');

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: '8px 0',
    },
  },
    // Hover style for duplicate button
    React.createElement('style', null,
      '.view-row:hover .view-duplicate-btn { opacity: 1 !important; }',
      '.view-duplicate-btn:hover { background: var(--bg-tertiary) !important; }',
    ),

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
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'custom',
    }),

    // UML Diagrams
    umlViews.length > 0 && React.createElement(ViewSection, {
      title: 'UML Diagrams',
      views: umlViews,
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'uml_class',
    }),

    // Wireframes
    wireframeViews.length > 0 && React.createElement(ViewSection, {
      title: 'Wireframes',
      views: wireframeViews,
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'wireframe',
    }),

    // Data Models
    dataViews.length > 0 && React.createElement(ViewSection, {
      title: 'Data Models',
      views: dataViews,
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'data_logical',
    }),

    // Always show UML + Wireframe + Data create buttons even if no views exist yet
    umlViews.length === 0 && React.createElement(ViewSection, {
      title: 'UML Diagrams',
      views: [],
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'uml_class',
    }),

    wireframeViews.length === 0 && React.createElement(ViewSection, {
      title: 'Wireframes',
      views: [],
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'wireframe',
    }),

    dataViews.length === 0 && React.createElement(ViewSection, {
      title: 'Data Models',
      views: [],
      currentViewId: currentView?.id,
      onSwitch: handleSwitchView,
      onCreate: handleStartCreate,
      onDuplicate: handleDuplicateView,
      defaultViewpointType: 'data_logical',
    }),

    // Inline create input (with optional viewpoint dropdown for ArchiMate)
    creating ? React.createElement('div', {
      style: {
        margin: '2px 12px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 3,
      },
    },
      // Viewpoint dropdown — only for ArchiMate views
      isCreatingArchimate && React.createElement('select', {
        value: selectedViewpoint,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedViewpoint(e.target.value),
        style: {
          padding: '3px 6px',
          fontSize: 10,
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 3,
          outline: 'none',
        },
      },
        ...ARCHIMATE_VIEWPOINT_OPTIONS.map(opt =>
          React.createElement('option', { key: opt.value, value: opt.value }, opt.label),
        ),
      ),
      // Name input
      React.createElement('input', {
        ref: inputRef,
        value: newName,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') handleCreate();
          if (e.key === 'Escape') { setCreating(null); setNewName(''); setSelectedViewpoint('custom'); }
        },
        onBlur: handleCreate,
        placeholder: 'View name\u2026',
        style: {
          padding: '4px 8px',
          fontSize: 11,
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--highlight)',
          borderRadius: 3,
          outline: 'none',
        },
      }),
    ) : null,
  );
}
