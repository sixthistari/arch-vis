import { describe, it, expect } from 'vitest';
import { computeHighlight } from '../src/interaction/highlight';
import Graph from 'graphology';

describe('computeHighlight', () => {
  function makeGraph() {
    const g = new Graph();
    g.addNode('a');
    g.addNode('b');
    g.addNode('c');
    g.addNode('d');
    g.addEdgeWithKey('e1', 'a', 'b');
    g.addEdgeWithKey('e2', 'a', 'c');
    g.addEdgeWithKey('e3', 'c', 'd');
    return g;
  }

  it('highlights selected node and immediate neighbours', () => {
    const g = makeGraph();
    const result = computeHighlight(g, 'a');
    expect(result.nodes.has('a')).toBe(true);
    expect(result.nodes.has('b')).toBe(true);
    expect(result.nodes.has('c')).toBe(true);
    expect(result.nodes.has('d')).toBe(false);
    expect(result.edges.has('e1')).toBe(true);
    expect(result.edges.has('e2')).toBe(true);
    expect(result.edges.has('e3')).toBe(false);
  });

  it('returns empty sets for unknown node', () => {
    const g = makeGraph();
    const result = computeHighlight(g, 'unknown');
    expect(result.nodes.size).toBe(0);
    expect(result.edges.size).toBe(0);
  });

  it('includes edges in both directions', () => {
    const g = makeGraph();
    const result = computeHighlight(g, 'c');
    expect(result.nodes.has('c')).toBe(true);
    expect(result.nodes.has('a')).toBe(true);
    expect(result.nodes.has('d')).toBe(true);
    expect(result.edges.has('e2')).toBe(true);
    expect(result.edges.has('e3')).toBe(true);
  });

  it('handles isolated nodes', () => {
    const g = new Graph();
    g.addNode('lonely');
    const result = computeHighlight(g, 'lonely');
    expect(result.nodes.has('lonely')).toBe(true);
    expect(result.nodes.size).toBe(1);
    expect(result.edges.size).toBe(0);
  });
});
