import React from 'react';
import { useThemeStore } from '../store/theme';

export function ThemeToggle(): React.ReactElement {
  const { theme, toggleTheme } = useThemeStore();

  return React.createElement('button', {
    onClick: toggleTheme,
    title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
    style: {
      background: 'var(--button-bg)',
      color: 'var(--button-text)',
      border: '1px solid var(--border-primary)',
      borderRadius: 4,
      padding: '4px 10px',
      cursor: 'pointer',
      fontSize: 12,
      transition: 'background-color 0.2s',
    },
  }, theme === 'dark' ? 'Light' : 'Dark');
}
