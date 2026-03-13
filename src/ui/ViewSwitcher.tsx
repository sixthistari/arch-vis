import React from 'react';
import { useViewStore } from '../store/view';

export function ViewSwitcher(): React.ReactElement {
  const { viewList, currentView, switchView } = useViewStore();

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
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
    }, 'Views'),
    ...viewList.map((view) =>
      React.createElement('button', {
        key: view.id,
        onClick: () => switchView(view.id),
        style: {
          background: currentView?.id === view.id ? 'var(--bg-tertiary)' : 'transparent',
          color: currentView?.id === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
          border: 'none',
          borderLeft: currentView?.id === view.id ? '3px solid var(--highlight)' : '3px solid transparent',
          padding: '6px 12px',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: 11,
          transition: 'all 0.15s',
        },
      },
        view.name,
        view.render_mode === 'spatial' ? React.createElement('span', {
          style: {
            fontSize: 8,
            opacity: 0.5,
            marginLeft: 4,
            fontStyle: 'italic',
          },
        }, '(experimental)') : null,
      ),
    ),
  );
}
