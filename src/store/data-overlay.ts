import { create } from 'zustand';

interface DataOverlayState {
  colourByProperty: string | null;  // 'status' | 'domain' | 'maturity' | null
  /** Numeric property key for continuous heatmap overlay (e.g. 'confidence', 'priority'). */
  heatmapProperty: string | null;
  showStatusBadge: boolean;
  displayFields: string[];  // max 2 property keys to show below element name

  setColourByProperty: (prop: string | null) => void;
  setHeatmapProperty: (prop: string | null) => void;
  toggleStatusBadge: () => void;
  setDisplayFields: (fields: string[]) => void;
}

export const useDataOverlayStore = create<DataOverlayState>((set) => ({
  colourByProperty: null,
  heatmapProperty: null,
  showStatusBadge: false,
  displayFields: [],

  setColourByProperty: (prop) => set({ colourByProperty: prop, heatmapProperty: null }),
  setHeatmapProperty: (prop) => set({ heatmapProperty: prop, colourByProperty: null }),
  toggleStatusBadge: () => set((s) => ({ showStatusBadge: !s.showStatusBadge })),
  setDisplayFields: (fields) => set({ displayFields: fields.slice(0, 2) }),
}));

/**
 * Interpolate a continuous heatmap colour for a value in [0, 1].
 * Gradient: blue (0) → green (0.5) → red (1).
 */
export function heatmapColour(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (clamped < 0.5) {
    // Blue → Green
    const s = clamped * 2;
    r = Math.round(30 * (1 - s) + 34 * s);
    g = Math.round(100 * (1 - s) + 197 * s);
    b = Math.round(200 * (1 - s) + 94 * s);
  } else {
    // Green → Red
    const s = (clamped - 0.5) * 2;
    r = Math.round(34 * (1 - s) + 220 * s);
    g = Math.round(197 * (1 - s) + 60 * s);
    b = Math.round(94 * (1 - s) + 50 * s);
  }
  return `rgb(${r},${g},${b})`;
}
