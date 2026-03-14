/**
 * Layer band computation — sizing and positioning of ArchiMate layer bands.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Node } from '@xyflow/react';
import type { Element } from '../../model/types';
import { getNotation } from '../../model/notation';
import { getShapeDefinition } from '../../notation/registry';

/** Padding inside a layer band around the child elements. */
export const BAND_PAD = { top: 30, bottom: 20, left: 15, right: 15 };
/** Vertical gap between adjacent layer bands. */
export const BAND_GAP = 40;

export interface LayerBandInfo {
  layer: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute layer band positions and sizes from element positions.
 * Bands are positioned so they don't overlap — each has exclusive vertical space.
 */
export function computeLayerBands(
  elements: Element[],
  positions: Map<string, { x: number; y: number }>,
  layerLabels: Record<string, string>,
  layerOrder: Record<string, number>,
): LayerBandInfo[] {
  const byLayer = new Map<string, { minX: number; minY: number; maxY: number; maxX: number }>();

  const NODE_SCALE = 1.6; // must match ArchimateNode scale constant
  for (const el of elements) {
    // Only ArchiMate elements participate in layer bands
    if (getNotation(el.archimate_type) !== 'archimate') continue;
    const pos = positions.get(el.id);
    if (!pos) continue;
    const shapeDef = getShapeDefinition(el.archimate_type);
    const elW = Math.round(shapeDef.defaultWidth * NODE_SCALE);
    const elH = Math.round(shapeDef.defaultHeight * NODE_SCALE);
    const existing = byLayer.get(el.layer);
    if (existing) {
      existing.minX = Math.min(existing.minX, pos.x);
      existing.minY = Math.min(existing.minY, pos.y);
      existing.maxY = Math.max(existing.maxY, pos.y + elH);
      existing.maxX = Math.max(existing.maxX, pos.x + elW);
    } else {
      byLayer.set(el.layer, { minX: pos.x, minY: pos.y, maxY: pos.y + elH, maxX: pos.x + elW });
    }
  }

  if (byLayer.size === 0) return [];

  // Compute uniform width — all bands use the widest layer's width
  let globalWidth = 800;
  for (const bounds of byLayer.values()) {
    globalWidth = Math.max(globalWidth, bounds.maxX - bounds.minX + BAND_PAD.left + BAND_PAD.right + 30);
  }

  // Sort layers by ArchiMate order for vertical stacking
  const sorted = [...byLayer.entries()].sort(
    ([a], [b]) => (layerOrder[a] ?? 99) - (layerOrder[b] ?? 99),
  );

  // Stack bands vertically with gaps — non-overlapping
  const bands: LayerBandInfo[] = [];
  let nextY = 0;
  for (const [layer, bounds] of sorted) {
    const contentH = bounds.maxY - bounds.minY;
    const bandH = contentH + BAND_PAD.top + BAND_PAD.bottom;
    bands.push({
      layer,
      label: layerLabels[layer] ?? layer,
      x: 0,
      y: nextY,
      width: globalWidth,
      height: bandH,
    });
    nextY += bandH + BAND_GAP;
  }

  return bands;
}

/**
 * Live band resize: recomputes band node dimensions from child element positions.
 * Child positions are RELATIVE to the band, so we just scan children.
 * Does NOT move bands — only resizes them to fit their children.
 */
export function recomputeBands(
  nodes: Node[],
  layerLabels: Record<string, string>,
  theme: 'dark' | 'light',
): Node[] {
  // Gather child bounds per band (positions are relative to band)
  const byBand = new Map<string, { maxX: number; maxY: number }>();

  for (const n of nodes) {
    if (n.type === 'layer-band' || !n.parentId) continue;
    const x = n.position.x;
    const y = n.position.y;
    const w = n.width ?? 130;
    const h = n.height ?? 50;
    const existing = byBand.get(n.parentId);
    if (existing) {
      existing.maxX = Math.max(existing.maxX, x + w);
      existing.maxY = Math.max(existing.maxY, y + h);
    } else {
      byBand.set(n.parentId, { maxX: x + w, maxY: y + h });
    }
  }

  // Compute uniform width across all bands
  let globalWidth = 800;
  for (const b of byBand.values()) {
    globalWidth = Math.max(globalWidth, b.maxX + BAND_PAD.left + BAND_PAD.right);
  }

  return nodes.map(n => {
    if (!n.id.startsWith('__band-')) return n;
    const layer = n.id.replace('__band-', '');
    const b = byBand.get(n.id);
    if (!b) return n;
    return {
      ...n,
      width: globalWidth,
      height: b.maxY + BAND_PAD.bottom,
      data: {
        ...n.data,
        bandHeight: b.maxY + BAND_PAD.bottom,
        bandWidth: globalWidth,
        label: layerLabels[layer] ?? layer,
        theme,
      },
    };
  });
}
