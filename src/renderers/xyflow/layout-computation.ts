/**
 * Layout computation — grid layout and layer/sublayer ordering.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Element, SublayerConfig } from '../../model/types';
import {
  LAYER_ORDER as FALLBACK_LAYER_ORDER,
  SUBLAYER_ORDER as FALLBACK_SUBLAYER_ORDER,
  LAYER_LABELS as FALLBACK_LAYER_LABELS,
} from '../../shared/layer-config';

export { FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER };

/** Derive layer and sublayer ordering from sublayer config YAML (loaded via API). */
export function buildOrderMaps(config: SublayerConfig | null): {
  layerOrder: Record<string, number>;
  sublayerOrder: Record<string, number>;
  layerLabels: Record<string, string>;
} {
  if (!config) {
    return {
      layerOrder: FALLBACK_LAYER_ORDER,
      sublayerOrder: FALLBACK_SUBLAYER_ORDER,
      layerLabels: FALLBACK_LAYER_LABELS,
    };
  }

  const layerOrder: Record<string, number> = {};
  const sublayerOrder: Record<string, number> = {};
  const layerLabels: Record<string, string> = {};

  let layerIdx = 0;
  // Track the first config key for each base layer (e.g. business_upper → business)
  const baseLayerSeen = new Map<string, number>();
  for (const [layerKey, layerConfig] of Object.entries(config.layers)) {
    layerOrder[layerKey] = layerIdx;
    layerLabels[layerKey] = layerConfig.label;

    // Also map the base layer name (strip _upper, _lower suffixes) for elements
    // that use the base layer key in the database
    const baseName = layerKey.replace(/_(upper|lower)$/, '');
    if (!baseLayerSeen.has(baseName)) {
      baseLayerSeen.set(baseName, layerIdx);
      if (!(baseName in layerOrder)) {
        layerOrder[baseName] = layerIdx;
        layerLabels[baseName] = layerConfig.label.replace(/ — .*$/, '');
      }
    }

    layerIdx++;
    layerConfig.sublayers.forEach((sublayer, sublayerIdx) => {
      const order = sublayerIdx * 10;
      for (const type of sublayer.element_types) {
        // Don't overwrite if already assigned (type appears in multiple sublayers)
        if (!(type in sublayerOrder)) sublayerOrder[type] = order;
      }
    });
  }

  return { layerOrder, sublayerOrder, layerLabels };
}

/**
 * Compute grid layout positions for elements without saved positions.
 * Returns absolute positions (not relative to layer bands).
 */
export function computeGridLayout(
  elements: Element[],
  layerOrder: Record<string, number>,
  sublayerOrder: Record<string, number>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group by layer
  const byLayer = new Map<string, Element[]>();
  for (const el of elements) {
    const group = byLayer.get(el.layer) ?? [];
    group.push(el);
    byLayer.set(el.layer, group);
  }

  // Sort layers by ArchiMate order
  const sortedLayers = [...byLayer.entries()].sort(
    ([a], [b]) => (layerOrder[a] ?? 99) - (layerOrder[b] ?? 99)
  );

  const COL_WIDTH = 210;       // wider for routing channels between elements
  const ROW_HEIGHT = 80;       // taller for horizontal routing channels
  const LAYER_HEADER = 30;
  const LAYER_GAP = 90;        // more space between layers for cross-layer routes
  const LEFT_PAD = 30;
  const MAX_COLS = 8;
  let currentY = 20;

  for (const [, layerElements] of sortedLayers) {
    // Group elements by sublayer order → each sublayer becomes a row
    const sublayerGroups = new Map<number, Element[]>();
    for (const el of layerElements) {
      const order = sublayerOrder[el.archimate_type] ?? 50;
      const group = sublayerGroups.get(order) ?? [];
      group.push(el);
      sublayerGroups.set(order, group);
    }

    // Sort sublayer groups by order value
    const sortedSublayers = [...sublayerGroups.entries()].sort(([a], [b]) => a - b);

    // Layer header space
    currentY += LAYER_HEADER;

    for (const [, sublayerElements] of sortedSublayers) {
      // Each sublayer row
      for (let i = 0; i < sublayerElements.length; i++) {
        const col = i % MAX_COLS;
        const row = Math.floor(i / MAX_COLS);
        positions.set(sublayerElements[i]!.id, {
          x: LEFT_PAD + col * COL_WIDTH,
          y: currentY + row * ROW_HEIGHT,
        });
      }
      const rows = Math.ceil(sublayerElements.length / MAX_COLS);
      currentY += rows * ROW_HEIGHT;
    }

    currentY += LAYER_GAP;
  }

  return positions;
}
