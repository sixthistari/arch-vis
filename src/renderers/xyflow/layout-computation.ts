/**
 * Layout computation — grid layout and layer/sublayer ordering.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Element, SublayerConfig } from '../../model/types';

// ═══════════════════════════════════════
// Layer ordering for auto-layout
// ═══════════════════════════════════════

// Fallback layer order when sublayerConfig is not available
export const FALLBACK_LAYER_ORDER: Record<string, number> = {
  motivation: 0,
  strategy: 1,
  business: 2,
  business_upper: 2,
  business_lower: 3,
  application: 4,
  data: 5,
  technology: 6,
  implementation: 7,
};

// Fallback sublayer order (archimate_type → sort order within its layer)
export const FALLBACK_SUBLAYER_ORDER: Record<string, number> = {
  'stakeholder': 0, 'driver': 10, 'assessment': 20, 'goal': 30, 'outcome': 40,
  'principle': 50, 'constraint': 50, 'requirement': 60, 'meaning': 35, 'value': 45,
  'value-stream': 0, 'course-of-action': 10, 'capability': 20, 'resource': 30,
  'business-actor': 0, 'business-role': 0, 'business-collaboration': 5,
  'business-service': 10, 'business-interface': 15,
  'business-process': 20, 'business-function': 20, 'business-interaction': 20,
  'business-event': 25, 'business-object': 30, 'contract': 30, 'representation': 30, 'product': 35,
  'application-service': 0, 'application-interface': 5,
  'application-process': 10, 'application-function': 10, 'application-interaction': 10,
  'application-event': 15, 'application-component': 20, 'application-collaboration': 20,
  'data-object': 30,
  'technology-service': 0, 'technology-interface': 5,
  'technology-process': 10, 'technology-function': 10, 'technology-interaction': 10,
  'technology-event': 15, 'node': 20, 'device': 20, 'system-software': 25,
  'technology-collaboration': 20, 'communication-network': 30, 'path': 30, 'artifact': 35,
  'gap': 0, 'plateau': 10, 'implementation-event': 15, 'deliverable': 20, 'work-package': 30,
};

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
      layerLabels: {
        motivation: 'Motivation', strategy: 'Strategy', business: 'Business',
        business_upper: 'Business — Functions & Processes', business_lower: 'Business — Services & Information',
        application: 'Application', technology: 'Technology',
        data: 'Data & Artifacts', implementation: 'Implementation & Migration',
      },
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
