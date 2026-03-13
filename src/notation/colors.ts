type Theme = 'dark' | 'light';

interface LayerColours {
  stroke: string;
  fill: string;
  planeFill: string;
}

// Dark mode: fills at ~0.78 so node backgrounds occlude lines routed beneath them.
// Nodes render above edges in z-order; the fill must be opaque enough to cover them.
const DARK_LAYER_COLOURS: Record<string, LayerColours> = {
  motivation: { stroke: '#C084D8', fill: 'rgba(192,132,216,0.78)', planeFill: 'rgba(192,132,216,0.12)' },
  strategy: { stroke: '#D4A843', fill: 'rgba(212,168,67,0.78)', planeFill: 'rgba(212,168,67,0.12)' },
  business: { stroke: '#E8C840', fill: 'rgba(232,200,64,0.78)', planeFill: 'rgba(232,200,64,0.12)' },
  business_upper: { stroke: '#E8C840', fill: 'rgba(232,200,64,0.78)', planeFill: 'rgba(232,200,64,0.12)' },
  business_lower: { stroke: '#E8C840', fill: 'rgba(232,200,64,0.78)', planeFill: 'rgba(232,200,64,0.12)' },
  application: { stroke: '#4AADE8', fill: 'rgba(74,173,232,0.78)', planeFill: 'rgba(74,173,232,0.14)' },
  technology: { stroke: '#5BBD72', fill: 'rgba(91,189,114,0.78)', planeFill: 'rgba(91,189,114,0.14)' },
  data: { stroke: '#E07848', fill: 'rgba(224,120,72,0.78)', planeFill: 'rgba(224,120,72,0.12)' },
  implementation: { stroke: '#A0A0A0', fill: 'rgba(160,160,160,0.78)', planeFill: 'rgba(160,160,160,0.12)' },
};

// Light mode: fills at ~0.60 — less saturated backgrounds over a white canvas,
// still opaque enough to cover lines beneath nodes.
const LIGHT_LAYER_COLOURS: Record<string, LayerColours> = {
  motivation: { stroke: '#9B59B6', fill: 'rgba(204,175,216,0.60)', planeFill: 'rgba(204,175,216,0.25)' },
  strategy: { stroke: '#B8860B', fill: 'rgba(245,222,179,0.60)', planeFill: 'rgba(245,222,179,0.25)' },
  business: { stroke: '#DAA520', fill: 'rgba(255,255,181,0.60)', planeFill: 'rgba(255,255,181,0.25)' },
  business_upper: { stroke: '#DAA520', fill: 'rgba(255,255,181,0.60)', planeFill: 'rgba(255,255,181,0.25)' },
  business_lower: { stroke: '#DAA520', fill: 'rgba(255,255,181,0.60)', planeFill: 'rgba(255,255,181,0.25)' },
  application: { stroke: '#2980B9', fill: 'rgba(181,228,255,0.60)', planeFill: 'rgba(181,228,255,0.25)' },
  technology: { stroke: '#27AE60', fill: 'rgba(181,255,181,0.60)', planeFill: 'rgba(181,255,181,0.25)' },
  data: { stroke: '#D35400', fill: 'rgba(255,208,181,0.60)', planeFill: 'rgba(255,208,181,0.25)' },
  implementation: { stroke: '#7F8C8D', fill: 'rgba(189,195,199,0.60)', planeFill: 'rgba(189,195,199,0.25)' },
};

export function getLayerColours(layer: string, theme: Theme): LayerColours {
  const map = theme === 'dark' ? DARK_LAYER_COLOURS : LIGHT_LAYER_COLOURS;
  // Try exact match, then try base layer (strip _upper/_lower)
  const baseLayer = layer.replace(/_upper|_lower/, '');
  return map[layer] ?? map[baseLayer] ?? { stroke: '#888', fill: 'rgba(128,128,128,0.07)', planeFill: 'rgba(128,128,128,0.10)' };
}

export function getLayerStroke(layer: string, theme: Theme): string {
  return getLayerColours(layer, theme).stroke;
}

export function getLayerFill(layer: string, theme: Theme): string {
  return getLayerColours(layer, theme).fill;
}

export const HIGHLIGHT_COLOURS = {
  dark: { highlight: '#F59E0B', highlightEdge: '#F59E0B' },
  light: { highlight: '#D97706', highlightEdge: '#D97706' },
} as const;
