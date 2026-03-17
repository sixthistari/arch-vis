import { PLANE_WIDTH, PLANE_DEPTH } from '../shared/spatial-projection';
import { layerWorldY } from '../renderers/spatial/layers';
import type { LayoutInput, LayoutOutput, SublayerEntry } from './types';

/**
 * Assign world-space positions for spatial 3D rendering.
 * wy = centred around origin (motivation top, implementation bottom)
 * wx = spread across plane width
 * wz = sublayer depth offset + jitter for visual separation
 */
export function computeSpatialLayout(
  elements: LayoutInput[],
  sublayers: SublayerEntry[],
  layerSpacing: number,
): LayoutOutput[] {
  // If no sublayer config, fall back to layer-based layout
  if (sublayers.length === 0) {
    return computeFallbackLayout(elements, layerSpacing);
  }

  // Group elements by their sublayer
  const sublayerMap = new Map<string, LayoutInput[]>();
  for (const el of elements) {
    const key = findSublayerKey(el, sublayers);
    const group = sublayerMap.get(key);
    if (group) {
      group.push(el);
    } else {
      sublayerMap.set(key, [el]);
    }
  }

  const results: LayoutOutput[] = [];
  const positioned = new Set<string>();

  // Usable area on each plane (with padding)
  const usableWidth = PLANE_WIDTH * 0.85;
  const usableDepth = PLANE_DEPTH * 0.75;

  // Count distinct layer indices to compute centred Y positions
  const totalLayers = new Set(sublayers.map(s => s.layerIndex)).size;

  for (const sublayer of sublayers) {
    const key = `${sublayer.layerKey}:${sublayer.name}`;
    const group = sublayerMap.get(key);
    if (!group) continue;

    const layerY = layerWorldY(sublayer.layerIndex, totalLayers, layerSpacing);

    // Sublayer depth offset — divide the full depth among sublayers
    const sublayerCount = sublayers.filter(s => s.layerKey === sublayer.layerKey).length;
    const sliceDepth = usableDepth / Math.max(1, sublayerCount);
    const sliceStart = -usableDepth / 2 + sublayer.sublayerIndex * sliceDepth;

    // Calculate grid dimensions — aim for a roughly square grid in screen space.
    // Width is wider than depth visually due to perspective, so bias towards
    // more columns than rows.
    const count = group.length;
    const avgWidth = group.reduce((sum, el) => sum + el.width, 0) / count;
    const minSpacing = avgWidth + 40;  // 40px gap between elements
    const maxCols = Math.max(1, Math.floor(usableWidth / minSpacing));
    const cols = Math.max(1, Math.min(count, maxCols));
    const rows = Math.ceil(count / cols);
    const rowDepth = rows <= 1 ? 0 : (sliceDepth * 0.8) / (rows - 1);
    const rowZBase = sliceStart + sliceDepth * 0.1;

    // Spacing: distribute evenly across usable width
    const xSpacing = cols <= 1 ? 0 : usableWidth / (cols - 1 || 1);
    for (let i = 0; i < count; i++) {
      const el = group[i]!;

      // Use saved positions if available
      if (el.savedX !== undefined && el.savedY !== undefined) {
        results.push({
          id: el.id,
          wx: el.savedX,
          wy: layerY,
          wz: sliceStart + sliceDepth / 2,
        });
        positioned.add(el.id);
        continue;
      }

      const col = i % cols;
      const row = Math.floor(i / cols);

      // Centre the grid on the plane
      const colsInRow = Math.min(cols, count - row * cols);
      const totalRowWidth = (colsInRow - 1) * xSpacing;
      const wx = -totalRowWidth / 2 + col * xSpacing;
      const wz = rows <= 1
        ? sliceStart + sliceDepth / 2
        : rowZBase + row * rowDepth;

      results.push({ id: el.id, wx, wy: layerY, wz });
      positioned.add(el.id);
    }
  }

  // Handle any elements that weren't positioned (unmatched sublayer key)
  const unmatched = elements.filter(el => !positioned.has(el.id));
  if (unmatched.length > 0) {
    const fallback = computeFallbackLayout(unmatched, layerSpacing);
    results.push(...fallback);
  }

  return results;
}

/**
 * Fallback layout when sublayer config is missing or for unmatched elements.
 * Groups by raw layer name and spreads across width and depth.
 */
function computeFallbackLayout(
  elements: LayoutInput[],
  layerSpacing: number,
): LayoutOutput[] {
  const results: LayoutOutput[] = [];
  const usableWidth = PLANE_WIDTH * 0.85;

  // Group by layer
  const layerGroups = new Map<string, LayoutInput[]>();
  const layerOrder: string[] = [];
  for (const el of elements) {
    const group = layerGroups.get(el.layer);
    if (group) {
      group.push(el);
    } else {
      layerGroups.set(el.layer, [el]);
      layerOrder.push(el.layer);
    }
  }

  const totalLayers = layerOrder.length;

  for (let li = 0; li < layerOrder.length; li++) {
    const layerKey = layerOrder[li]!;
    const group = layerGroups.get(layerKey)!;
    const layerY = layerWorldY(li, totalLayers, layerSpacing);
    const count = group.length;

    const avgWidth = group.reduce((sum, el) => sum + el.width, 0) / count;
    const minSpacing = avgWidth + 40;  // 40px gap between elements
    const maxCols = Math.max(1, Math.floor(usableWidth / minSpacing));
    const cols = Math.max(1, Math.min(count, maxCols));
    const usableDepth = PLANE_DEPTH * 0.75;
    const rows = Math.ceil(count / cols);
    const rowDepth = rows <= 1 ? 0 : (usableDepth * 0.8) / (rows - 1);
    const rowZBase = -usableDepth * 0.4;

    const xSpacing = cols <= 1 ? 0 : usableWidth / (cols - 1 || 1);

    for (let i = 0; i < count; i++) {
      const el = group[i]!;
      if (el.savedX !== undefined && el.savedY !== undefined) {
        results.push({
          id: el.id,
          wx: el.savedX,
          wy: layerY,
          wz: 0,
        });
        continue;
      }

      const col = i % cols;
      const row = Math.floor(i / cols);

      const colsInRow = Math.min(cols, count - row * cols);
      const totalRowWidth = (colsInRow - 1) * xSpacing;
      const wx = -totalRowWidth / 2 + col * xSpacing;
      const wz = rows <= 1 ? 0 : rowZBase + row * rowDepth;

      results.push({ id: el.id, wx, wy: layerY, wz });
    }
  }

  return results;
}

function findSublayerKey(el: LayoutInput, sublayers: SublayerEntry[]): string {
  // Try to match by sublayer name first (from element data)
  if (el.sublayer) {
    for (const sl of sublayers) {
      if (sl.name === el.sublayer) {
        // Verify layer matches (business maps to business_upper or business_lower)
        const elBaseLayer = el.layer.replace(/_.*/, '');
        const slBaseLayer = sl.layerKey.replace(/_.*/, '');
        if (elBaseLayer === slBaseLayer) {
          return `${sl.layerKey}:${sl.name}`;
        }
      }
    }
  }

  // Match by archimate_type in sublayer config
  for (const sl of sublayers) {
    if (sl.elementTypes.includes(el.archimateType)) {
      return `${sl.layerKey}:${sl.name}`;
    }
  }

  // Fallback: first sublayer of the matching layer
  const elBaseLayer = el.layer.replace(/_.*/, '');
  for (const sl of sublayers) {
    const slBaseLayer = sl.layerKey.replace(/_.*/, '');
    if (sl.layerKey === el.layer || slBaseLayer === elBaseLayer) {
      return `${sl.layerKey}:${sl.name}`;
    }
  }

  return 'unknown:unknown';
}

