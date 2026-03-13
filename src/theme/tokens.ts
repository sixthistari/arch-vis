export interface ThemeTokens {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCanvas: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderPrimary: string;
  borderSecondary: string;

  // UI elements
  buttonBg: string;
  buttonText: string;
  buttonHoverBg: string;
  panelBg: string;
  panelBorder: string;

  // Highlighting
  highlight: string;
  highlightEdge: string;
  dimNodeOpacity: number;
  dimEdgeOpacity: number;
  dimPlaneOpacity: number;

  // Selection
  selectionStroke: string;
  selectionGlow: string;

  // Status bar
  statusBg: string;
  statusText: string;
}

export type ThemeMode = 'dark' | 'light';
