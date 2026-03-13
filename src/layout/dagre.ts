import dagre from 'dagre';
import type { LayoutInput, LayoutOutput } from './types';

export function computeDagreLayout(
  elements: LayoutInput[],
  relationships: Array<{ id: string; sourceId: string; targetId: string }>,
): LayoutOutput[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 30,
    ranksep: 60,
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const elementIds = new Set(elements.map(e => e.id));

  for (const el of elements) {
    g.setNode(el.id, { width: el.width, height: el.height });
  }

  for (const rel of relationships) {
    if (elementIds.has(rel.sourceId) && elementIds.has(rel.targetId)) {
      g.setEdge(rel.sourceId, rel.targetId);
    }
  }

  dagre.layout(g);

  return elements.map((el) => {
    const node = g.node(el.id);
    return {
      id: el.id,
      wx: node ? node.x - node.width / 2 : 0,
      wy: node ? node.y - node.height / 2 : 0,
      wz: 0,
    };
  });
}
