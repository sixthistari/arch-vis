import React, { useEffect } from 'react';
import type { ThemeTokens, ThemeMode } from './tokens';
import { darkTheme } from './dark';
import { lightTheme } from './light';

const ThemeContext = React.createContext<{ theme: ThemeMode; tokens: ThemeTokens }>({
  theme: 'dark',
  tokens: darkTheme,
});

export function useThemeTokens(): { theme: ThemeMode; tokens: ThemeTokens } {
  return React.useContext(ThemeContext);
}

function getTokens(theme: ThemeMode): ThemeTokens {
  return theme === 'dark' ? darkTheme : lightTheme;
}

function applyCSS(tokens: ThemeTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', tokens.bgPrimary);
  root.style.setProperty('--bg-secondary', tokens.bgSecondary);
  root.style.setProperty('--bg-tertiary', tokens.bgTertiary);
  root.style.setProperty('--bg-canvas', tokens.bgCanvas);
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--border-primary', tokens.borderPrimary);
  root.style.setProperty('--border-secondary', tokens.borderSecondary);
  root.style.setProperty('--button-bg', tokens.buttonBg);
  root.style.setProperty('--button-text', tokens.buttonText);
  root.style.setProperty('--button-hover-bg', tokens.buttonHoverBg);
  root.style.setProperty('--panel-bg', tokens.panelBg);
  root.style.setProperty('--panel-border', tokens.panelBorder);
  root.style.setProperty('--highlight', tokens.highlight);
  root.style.setProperty('--status-bg', tokens.statusBg);
  root.style.setProperty('--status-text', tokens.statusText);
  root.style.transition = 'background-color 0.2s, color 0.2s';
}

interface ThemeProviderProps {
  theme: ThemeMode;
  children?: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps): React.ReactElement {
  const tokens = getTokens(theme);

  useEffect(() => {
    applyCSS(tokens);
    document.body.style.backgroundColor = tokens.bgPrimary;
    document.body.style.color = tokens.textPrimary;
  }, [tokens]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, tokens } },
    children,
  );
}
