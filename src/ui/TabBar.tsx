import React, { useCallback } from 'react';
import { usePanelStore } from '../store/panel';
import { useViewStore } from '../store/view';

// ═══════════════════════════════════════
// TabBar — shows open view tabs above the canvas
// ═══════════════════════════════════════

export function TabBar(): React.ReactElement {
  const openTabs = usePanelStore(s => s.openTabs);
  const activeTabId = usePanelStore(s => s.activeTabId);
  const setActiveTab = usePanelStore(s => s.setActiveTab);
  const closeTab = usePanelStore(s => s.closeTab);
  const switchView = useViewStore(s => s.switchView);

  const handleTabClick = useCallback((viewId: string) => {
    setActiveTab(viewId);
    switchView(viewId);
  }, [setActiveTab, switchView]);

  const handleClose = useCallback((e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    const wasActive = usePanelStore.getState().activeTabId === viewId;
    closeTab(viewId);
    // If the closed tab was active, switch to the new active tab
    if (wasActive) {
      const newActiveId = usePanelStore.getState().activeTabId;
      if (newActiveId) {
        switchView(newActiveId);
      }
    }
  }, [closeTab, switchView]);

  if (openTabs.length === 0) return React.createElement(React.Fragment, null);

  return React.createElement('div', {
    'data-panel': 'tab-bar',
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 0,
      padding: '0 4px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-primary)',
      height: 30,
      flexShrink: 0,
      overflow: 'hidden',
    },
  },
    ...openTabs.map(tab => {
      const isActive = tab.viewId === activeTabId;
      return React.createElement('div', {
        key: tab.viewId,
        onClick: () => handleTabClick(tab.viewId),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
          height: isActive ? 28 : 26,
          background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          borderTop: isActive ? '2px solid var(--highlight)' : '2px solid transparent',
          borderLeft: '1px solid var(--border-primary)',
          borderRight: '1px solid var(--border-primary)',
          borderBottom: isActive ? '1px solid var(--bg-primary)' : '1px solid var(--border-primary)',
          borderRadius: '4px 4px 0 0',
          cursor: 'pointer',
          fontSize: 11,
          userSelect: 'none' as const,
          maxWidth: 180,
          minWidth: 60,
          marginBottom: isActive ? -1 : 0,
          transition: 'background 0.1s, color 0.1s',
          position: 'relative' as const,
        },
      },
        React.createElement('span', {
          style: {
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
            fontWeight: isActive ? 600 : 400,
          },
        }, tab.viewName),
        React.createElement('button', {
          onClick: (e: React.MouseEvent) => handleClose(e, tab.viewId),
          title: 'Close tab',
          style: {
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
            padding: '0 2px',
            borderRadius: 2,
            flexShrink: 0,
          },
          onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'none';
          },
        }, '\u00D7'),
      );
    }),
  );
}
