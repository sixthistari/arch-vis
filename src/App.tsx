import React, { useEffect } from 'react';
import { ThemeProvider } from './theme/provider';
import { Shell } from './ui/Shell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useModelStore } from './store/model';
import { useViewStore } from './store/view';
import { useThemeStore } from './store/theme';
import { usePanelStore } from './store/panel';

export function App(): React.ReactElement {
  const theme = useThemeStore(s => s.theme);
  const loadAll = useModelStore(s => s.loadAll);
  const loading = useModelStore(s => s.loading);
  const error = useModelStore(s => s.error);
  const loadViewList = useViewStore(s => s.loadViewList);
  const switchView = useViewStore(s => s.switchView);
  const viewList = useViewStore(s => s.viewList);
  const currentView = useViewStore(s => s.currentView);

  useEffect(() => {
    const init = async () => {
      await loadAll();
      await loadViewList();
    };
    init();
  }, [loadAll, loadViewList]);

  // Auto-select first view once loaded — only when no view is active yet
  useEffect(() => {
    if (viewList.length > 0 && !currentView) {
      const defaultView = viewList.find(v => v.id === 'view-flat-layered') ?? viewList.find(v => v.render_mode === 'flat') ?? viewList[0];
      if (defaultView) {
        usePanelStore.getState().openTab(defaultView.id, defaultView.name);
        switchView(defaultView.id);
      }
    }
  }, [viewList, switchView, currentView]);

  if (error) {
    return React.createElement(ThemeProvider, { theme },
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--text-primary)',
          background: 'var(--bg-primary)',
        },
      },
        React.createElement('div', { style: { textAlign: 'center' } },
          React.createElement('div', { style: { fontSize: 16, marginBottom: 8 } }, 'Failed to load'),
          React.createElement('div', { style: { fontSize: 12, color: 'var(--text-muted)' } }, error),
          React.createElement('div', { style: { fontSize: 11, marginTop: 12, color: 'var(--text-secondary)' } },
            'Ensure the API server is running on port 3001'),
        ),
      ),
    );
  }

  if (loading) {
    return React.createElement(ThemeProvider, { theme },
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--text-secondary)',
          background: 'var(--bg-primary)',
          fontSize: 13,
        },
      }, 'Loading architecture model\u2026'),
    );
  }

  return React.createElement(ThemeProvider, { theme },
    React.createElement(ErrorBoundary, { name: 'Application' },
      React.createElement(Shell, null),
    ),
  );
}
