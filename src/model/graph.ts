import Graph from 'graphology';
import type { Element, Relationship } from './types';

export interface EdgeData {
  id: string;
  archimate_type: string;
  specialisation: string | null;
  label: string | null;
  source_id: string;
  target_id: string;
}

export interface NodeData {
  id: string;
  name: string;
  archimate_type: string;
  specialisation: string | null;
  layer: string;
  sublayer: string | null;
  domain_id: string | null;
}

export interface Neighbours {
  nodes: string[];
  edges: string[];
}

/**
 * Build a Graphology DirectedGraph from element and relationship arrays.
 * Nodes are keyed by element.id; edges are keyed by relationship.id.
 */
export function buildGraphFromData(
  elements: Element[],
  relationships: Relationship[],
): Graph<NodeData, EdgeData> {
  const graph = new Graph<NodeData, EdgeData>();

  for (const el of elements) {
    if (!graph.hasNode(el.id)) {
      graph.addNode(el.id, {
        id: el.id,
        name: el.name,
        archimate_type: el.archimate_type,
        specialisation: el.specialisation,
        layer: el.layer,
        sublayer: el.sublayer,
        domain_id: el.domain_id,
      });
    }
  }

  for (const rel of relationships) {
    // Only add edge if both endpoints exist in the graph
    if (graph.hasNode(rel.source_id) && graph.hasNode(rel.target_id)) {
      if (!graph.hasEdge(rel.id)) {
        graph.addEdgeWithKey(rel.id, rel.source_id, rel.target_id, {
          id: rel.id,
          archimate_type: rel.archimate_type,
          specialisation: rel.specialisation,
          label: rel.label,
          source_id: rel.source_id,
          target_id: rel.target_id,
        });
      }
    }
  }

  return graph;
}

/**
 * Get immediate neighbours of a node: all adjacent node IDs and connecting edge IDs.
 */
export function getNeighbours(
  graph: Graph<NodeData, EdgeData>,
  nodeId: string,
): Neighbours {
  if (!graph.hasNode(nodeId)) {
    return { nodes: [], edges: [] };
  }

  const nodes = new Set<string>();
  const edges: string[] = [];

  graph.forEachEdge(nodeId, (edgeKey, _attrs, source, target) => {
    edges.push(edgeKey);
    if (source === nodeId) {
      nodes.add(target);
    } else {
      nodes.add(source);
    }
  });

  return { nodes: Array.from(nodes), edges };
}

/**
 * Get all edges (as EdgeData) connected to a node.
 */
export function getEdgesForNode(
  graph: Graph<NodeData, EdgeData>,
  nodeId: string,
): EdgeData[] {
  if (!graph.hasNode(nodeId)) {
    return [];
  }

  const result: EdgeData[] = [];

  graph.forEachEdge(nodeId, (_edgeKey, attrs) => {
    result.push(attrs);
  });

  return result;
}
