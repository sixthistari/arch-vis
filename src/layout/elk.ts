import ELK from 'elkjs/lib/elk.bundled.js';
import type { LayoutInput, LayoutOutput, SublayerEntry } from './types';

const elk = new ELK();

export async function computeElkLayout(
  elements: LayoutInput[],
  relationships: Array<{ id: string; sourceId: string; targetId: string }>,
  sublayers: SublayerEntry[],
): Promise<LayoutOutput[]> {
  // Group elements by layer for hierarchical layout
  const layerGroups = new Map<string, LayoutInput[]>();
  for (const el of elements) {
    const layerKey = findLayerKey(el, sublayers);
    const group = layerGroups.get(layerKey);
    if (group) {
      group.push(el);
    } else {
      layerGroups.set(layerKey, [el]);
    }
  }

  const elementIds = new Set(elements.map(e => e.id));
  const validEdges = relationships.filter(r => elementIds.has(r.sourceId) && elementIds.has(r.targetId));

  // Build ELK graph with layer grouping
  const children: Array<{
    id: string;
    children: Array<{ id: string; width: number; height: number }>;
    layoutOptions: Record<string, string>;
  }> = [];

  let layerIdx = 0;
  for (const [layerKey, group] of layerGroups) {
    children.push({
      id: `layer-${layerKey}`,
      children: group.map(el => ({
        id: el.id,
        width: el.width,
        height: el.height,
      })),
      layoutOptions: {
        'elk.position': `(0, ${layerIdx * 200})`,
      },
    });
    layerIdx++;
  }

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '30',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    },
    children,
    edges: validEdges.map(r => ({
      id: r.id,
      sources: [r.sourceId],
      targets: [r.targetId],
    })),
  };

  try {
    const layout = await elk.layout(graph);
    const results: LayoutOutput[] = [];

    if (layout.children) {
      for (const layerNode of layout.children) {
        const layerX = layerNode.x ?? 0;
        const layerY = layerNode.y ?? 0;
        if (layerNode.children) {
          for (const child of layerNode.children) {
            results.push({
              id: child.id,
              wx: layerX + (child.x ?? 0),
              wy: layerY + (child.y ?? 0),
              wz: 0,
            });
          }
        }
      }
    }

    return results;
  } catch {
    // Fallback to simple grid
    return computeGridFallback(elements, sublayers);
  }
}

function computeGridFallback(elements: LayoutInput[], sublayers: SublayerEntry[]): LayoutOutput[] {
  const layerGroups = new Map<string, LayoutInput[]>();
  for (const el of elements) {
    const key = findLayerKey(el, sublayers);
    const group = layerGroups.get(key);
    if (group) group.push(el);
    else layerGroups.set(key, [el]);
  }

  const results: LayoutOutput[] = [];
  let layerY = 50;

  for (const [, group] of layerGroups) {
    const maxPerRow = 6;
    for (let i = 0; i < group.length; i++) {
      const col = i % maxPerRow;
      const row = Math.floor(i / maxPerRow);
      results.push({
        id: group[i]!.id,
        wx: 50 + col * 120,
        wy: layerY + row * 40,
        wz: 0,
      });
    }
    layerY += (Math.ceil(group.length / 6) * 40) + 80;
  }

  return results;
}

function findLayerKey(el: LayoutInput, sublayers: SublayerEntry[]): string {
  for (const sl of sublayers) {
    if (sl.elementTypes.includes(el.archimateType)) {
      return sl.layerKey;
    }
  }
  return el.layer;
}
