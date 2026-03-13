import type { LayoutInput, SublayerEntry } from './types';

interface FlatBand {
  layerKey: string;
  y: number;
  height: number;
}

export interface FlatPosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Compute 2D positions for the flat renderer.
 * Elements are placed in a grid within their matching layer band,
 * spread across the band width and height with no overlaps.
 */
export function computeFlatLayout(
  elements: LayoutInput[],
  bands: FlatBand[],
  sublayers: SublayerEntry[],
): FlatPosition[] {
  // Build a lookup: layerKey → band
  const bandByLayer = new Map<string, FlatBand>();
  for (const band of bands) {
    bandByLayer.set(band.layerKey, band);
  }

  // Build sublayer→bandKey lookup for routing elements to split layers
  // (e.g. business → business_upper or business_lower)
  const sublayerToBandKey = new Map<string, string>();
  for (const sl of sublayers) {
    sublayerToBandKey.set(sl.name, sl.layerKey);
  }

  // Group elements by their matching band
  const groups = new Map<string, LayoutInput[]>();
  for (const el of elements) {
    const bandKey = findBandKey(el, bandByLayer, sublayerToBandKey, sublayers);
    const group = groups.get(bandKey);
    if (group) {
      group.push(el);
    } else {
      groups.set(bandKey, [el]);
    }
  }

  const results: FlatPosition[] = [];
  const bandWidth = 1100; // usable horizontal space
  const padding = 20;

  for (const [bandKey, group] of groups) {
    const band = bandByLayer.get(bandKey);
    if (!band) {
      // Fallback: stack unmatched elements at the bottom
      for (let i = 0; i < group.length; i++) {
        results.push({
          id: group[i]!.id,
          x: padding + (i % 8) * 130,
          y: bands.length * 180 + 50 + Math.floor(i / 8) * 50,
        });
      }
      continue;
    }

    const count = group.length;
    const usableW = bandWidth - padding * 2;
    const usableH = band.height - 10;

    // Grid: aim for a wide layout (more columns than rows)
    const cols = Math.max(1, Math.min(count, Math.ceil(Math.sqrt(count * 2.5))));
    const rows = Math.ceil(count / cols);

    const cellW = usableW / cols;
    const cellH = usableH / Math.max(1, rows);

    for (let i = 0; i < count; i++) {
      const el = group[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Centre element within its cell
      const x = padding + col * cellW + (cellW - el.width) / 2;
      const y = band.y + row * cellH + (cellH - el.height) / 2;

      results.push({ id: el.id, x, y });
    }
  }

  return results;
}

/**
 * Match an element to its band key, using sublayer info to handle split
 * layers (e.g. business → business_upper / business_lower).
 */
function findBandKey(
  el: LayoutInput,
  bandByLayer: Map<string, FlatBand>,
  sublayerToBandKey: Map<string, string>,
  sublayers: SublayerEntry[],
): string {
  // Direct match (e.g. layer is "application", band key is "application")
  if (bandByLayer.has(el.layer)) return el.layer;

  // Try sublayer-based routing (e.g. sublayer "services" → bandKey "business_lower")
  if (el.sublayer) {
    const bandKey = sublayerToBandKey.get(el.sublayer);
    if (bandKey && bandByLayer.has(bandKey)) {
      // Verify it's the right base layer
      const elBase = el.layer.replace(/_.*/, '');
      const slBase = bandKey.replace(/_.*/, '');
      if (elBase === slBase) return bandKey;
    }
  }

  // Try archimate_type matching through sublayer config
  for (const sl of sublayers) {
    if (sl.elementTypes.includes(el.archimateType) && bandByLayer.has(sl.layerKey)) {
      return sl.layerKey;
    }
  }

  // Try base layer match (e.g. "business" → "business_upper")
  const base = el.layer.replace(/_.*/, '');
  for (const key of bandByLayer.keys()) {
    if (key === base || key.startsWith(base + '_')) {
      return key;
    }
  }

  return el.layer;
}
