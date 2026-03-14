import { describe, it, expect } from 'vitest';
import { buildGraphFromData, getNeighbours, getEdgesForNode } from '@/model/graph';
import type { Element, Relationship } from '@/model/types';

function makeElement(overrides: Partial<Element> & { id: string; name: string }): Element {
  return {
    archimate_type: 'application-component',
    specialisation: null,
    layer: 'application',
    sublayer: null,
    domain_id: null,
    status: 'active',
    description: null,
    properties: null,
    confidence: null,
    source_session_id: null,
    parent_id: null,
    created_by: null,
    source: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function makeRelationship(
  overrides: Partial<Relationship> & { id: string; source_id: string; target_id: string },
): Relationship {
  return {
    archimate_type: 'serving',
    specialisation: null,
    label: null,
    description: null,
    properties: null,
    confidence: null,
    created_by: null,
    source: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe('buildGraphFromData', () => {
  it('creates nodes from elements', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A' }),
      makeElement({ id: 'b', name: 'B' }),
    ];
    const graph = buildGraphFromData(elements, []);
    expect(graph.order).toBe(2);
    expect(graph.hasNode('a')).toBe(true);
    expect(graph.hasNode('b')).toBe(true);
  });

  it('creates edges from relationships', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A' }),
      makeElement({ id: 'b', name: 'B' }),
    ];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'a', target_id: 'b' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    expect(graph.size).toBe(1);
    expect(graph.hasEdge('r1')).toBe(true);
  });

  it('stores node attributes from element fields', () => {
    const elements = [
      makeElement({ id: 'x', name: 'MyComp', layer: 'technology', archimate_type: 'node' }),
    ];
    const graph = buildGraphFromData(elements, []);
    const attrs = graph.getNodeAttributes('x');
    expect(attrs.name).toBe('MyComp');
    expect(attrs.layer).toBe('technology');
    expect(attrs.archimate_type).toBe('node');
  });

  it('stores edge attributes from relationship fields', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A' }),
      makeElement({ id: 'b', name: 'B' }),
    ];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'a', target_id: 'b', archimate_type: 'flow', label: 'data' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    const attrs = graph.getEdgeAttributes('r1');
    expect(attrs.archimate_type).toBe('flow');
    expect(attrs.label).toBe('data');
  });

  it('skips relationships with missing source node (orphan)', () => {
    const elements = [makeElement({ id: 'b', name: 'B' })];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'missing', target_id: 'b' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    expect(graph.size).toBe(0);
    expect(graph.order).toBe(1);
  });

  it('skips relationships with missing target node (orphan)', () => {
    const elements = [makeElement({ id: 'a', name: 'A' })];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'a', target_id: 'missing' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    expect(graph.size).toBe(0);
  });

  it('handles duplicate element IDs gracefully', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A1' }),
      makeElement({ id: 'a', name: 'A2' }),
    ];
    const graph = buildGraphFromData(elements, []);
    expect(graph.order).toBe(1);
  });

  it('handles empty arrays', () => {
    const graph = buildGraphFromData([], []);
    expect(graph.order).toBe(0);
    expect(graph.size).toBe(0);
  });
});

describe('getNeighbours', () => {
  it('returns adjacent nodes and connecting edges', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A' }),
      makeElement({ id: 'b', name: 'B' }),
      makeElement({ id: 'c', name: 'C' }),
    ];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'a', target_id: 'b' }),
      makeRelationship({ id: 'r2', source_id: 'a', target_id: 'c' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    const neighbours = getNeighbours(graph, 'a');
    expect(neighbours.nodes.sort()).toEqual(['b', 'c']);
    expect(neighbours.edges.sort()).toEqual(['r1', 'r2']);
  });

  it('returns empty for a non-existent node', () => {
    const graph = buildGraphFromData([], []);
    const neighbours = getNeighbours(graph, 'nope');
    expect(neighbours.nodes).toEqual([]);
    expect(neighbours.edges).toEqual([]);
  });
});

describe('getEdgesForNode', () => {
  it('returns edge data for a node', () => {
    const elements = [
      makeElement({ id: 'a', name: 'A' }),
      makeElement({ id: 'b', name: 'B' }),
    ];
    const rels = [
      makeRelationship({ id: 'r1', source_id: 'a', target_id: 'b', archimate_type: 'flow' }),
    ];
    const graph = buildGraphFromData(elements, rels);
    const edges = getEdgesForNode(graph, 'a');
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe('r1');
    expect(edges[0]!.archimate_type).toBe('flow');
  });

  it('returns empty for a non-existent node', () => {
    const graph = buildGraphFromData([], []);
    expect(getEdgesForNode(graph, 'nope')).toEqual([]);
  });
});
