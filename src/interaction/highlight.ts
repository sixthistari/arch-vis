import type Graph from 'graphology';

export interface HighlightResult {
  nodes: Set<string>;
  edges: Set<string>;
}

export type HighlightDirection = 'all' | 'incoming' | 'outgoing';

export function computeHighlight(graph: Graph, nodeId: string, direction: HighlightDirection = 'all'): HighlightResult {
  const nodes = new Set<string>();
  const edges = new Set<string>();

  if (!graph.hasNode(nodeId)) {
    return { nodes, edges };
  }

  nodes.add(nodeId);

  if (direction === 'incoming' || direction === 'all') {
    graph.forEachInEdge(nodeId, (edgeKey, _attrs, source) => {
      edges.add(edgeKey);
      nodes.add(source);
    });
  }

  if (direction === 'outgoing' || direction === 'all') {
    graph.forEachOutEdge(nodeId, (edgeKey, _attrs, _source, target) => {
      edges.add(edgeKey);
      nodes.add(target);
    });
  }

  // For undirected edges in 'all' mode, keep the original behaviour
  if (direction === 'all') {
    graph.forEachUndirectedEdge(nodeId, (edgeKey, _attrs, source, target) => {
      edges.add(edgeKey);
      nodes.add(source);
      nodes.add(target);
    });
  }

  return { nodes, edges };
}
