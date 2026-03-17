import { describe, it, expect, vi, beforeEach } from 'vitest';
import Graph from 'graphology';
import { useModelStore } from '../model';
import type { Element, Relationship } from '../../model/types';

// Mock the API client
vi.mock('../../api/client', () => ({
  createElement: vi.fn(),
  updateElement: vi.fn(),
  deleteElement: vi.fn(),
  fetchElements: vi.fn(),
  fetchRelationships: vi.fn(),
  fetchDomains: vi.fn(),
  fetchSublayerConfig: vi.fn(),
  fetchValidRelationships: vi.fn(),
  updateRelationship: vi.fn(),
}));

// Mock buildGraphFromData
vi.mock('../../model/graph', () => ({
  buildGraphFromData: vi.fn(() => new Graph({ multi: true, type: 'directed' })),
}));

import * as api from '../../api/client';

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: 'el-1',
    name: 'Test Element',
    archimate_type: 'application-component',
    specialisation: null,
    layer: 'application',
    sublayer: null,
    domain_id: null,
    status: 'draft',
    description: null,
    properties: null,
    confidence: null,
    source_session_id: null,
    parent_id: null,
    created_by: null,
    source: null,
    folder: null,
    project_id: null,
    area: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: 'rel-1',
    archimate_type: 'serving',
    specialisation: null,
    source_id: 'el-1',
    target_id: 'el-2',
    label: null,
    description: null,
    properties: null,
    confidence: null,
    created_by: null,
    source: null,
    project_id: null,
    area: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function freshGraph(): Graph {
  return new Graph({ multi: true, type: 'directed' });
}

function resetStore(overrides: Partial<ReturnType<typeof useModelStore.getState>> = {}) {
  useModelStore.setState({
    elements: [],
    relationships: [],
    domains: [],
    sublayerConfig: null,
    validRelationships: [],
    graph: freshGraph(),
    loading: false,
    error: null,
    ...overrides,
  });
}

describe('useModelStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // ─── Initial state ────────────────────────────────────────────

  it('has empty initial state', () => {
    const state = useModelStore.getState();
    expect(state.elements).toEqual([]);
    expect(state.relationships).toEqual([]);
    expect(state.domains).toEqual([]);
    expect(state.graph.order).toBe(0); // no nodes
    expect(state.graph.size).toBe(0);  // no edges
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ─── createElement ────────────────────────────────────────────

  it('createElement calls api and adds element to store', async () => {
    const created = makeElement({ id: 'new-1', name: 'New Element' });
    vi.mocked(api.createElement).mockResolvedValue(created);

    const result = await useModelStore.getState().createElement({
      id: 'new-1',
      name: 'New Element',
      archimate_type: 'application-component',
      specialisation: null,
      layer: 'application',
    });

    expect(api.createElement).toHaveBeenCalledOnce();
    expect(result).toEqual(created);

    const state = useModelStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0]!.id).toBe('new-1');
  });

  it('createElement adds node to graph', async () => {
    const created = makeElement({ id: 'new-2' });
    vi.mocked(api.createElement).mockResolvedValue(created);

    await useModelStore.getState().createElement({
      id: 'new-2',
      name: 'Test Element',
      archimate_type: 'application-component',
      specialisation: null,
      layer: 'application',
    });

    const graph = useModelStore.getState().graph;
    expect(graph.hasNode('new-2')).toBe(true);
    expect(graph.getNodeAttribute('new-2', 'name')).toBe('Test Element');
  });

  it('createElement propagates API errors', async () => {
    vi.mocked(api.createElement).mockRejectedValue(new Error('Network error'));

    await expect(
      useModelStore.getState().createElement({
        id: 'fail-1',
        name: 'Fail',
        archimate_type: 'application-component',
        specialisation: null,
        layer: 'application',
      }),
    ).rejects.toThrow('Network error');

    // Store should remain empty on error
    expect(useModelStore.getState().elements).toHaveLength(0);
  });

  // ─── updateElement ────────────────────────────────────────────

  it('updateElement applies optimistic update immediately', async () => {
    const original = makeElement({ id: 'el-1', name: 'Original' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Original', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [original], graph });

    // Make the API call hang so we can inspect optimistic state
    let resolveApi!: (value: Element) => void;
    vi.mocked(api.updateElement).mockReturnValue(
      new Promise(resolve => { resolveApi = resolve; }),
    );

    const updatePromise = useModelStore.getState().updateElement('el-1', { name: 'Updated' });

    // Optimistic state should be applied immediately (synchronously after await point)
    // Give microtask a tick
    await Promise.resolve();

    const optimisticState = useModelStore.getState();
    expect(optimisticState.elements[0]!.name).toBe('Updated');

    // Resolve API with server response
    const serverResponse = makeElement({ id: 'el-1', name: 'Updated', updated_at: '2026-02-01T00:00:00Z' });
    resolveApi(serverResponse);
    await updatePromise;

    const finalState = useModelStore.getState();
    expect(finalState.elements[0]!.name).toBe('Updated');
    expect(finalState.elements[0]!.updated_at).toBe('2026-02-01T00:00:00Z');
  });

  it('updateElement rolls back on API error', async () => {
    const original = makeElement({ id: 'el-1', name: 'Original' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Original', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [original], graph });

    vi.mocked(api.updateElement).mockRejectedValue(new Error('Server error'));

    await expect(
      useModelStore.getState().updateElement('el-1', { name: 'Bad Update' }),
    ).rejects.toThrow('Server error');

    // Should have rolled back to original
    const state = useModelStore.getState();
    expect(state.elements[0]!.name).toBe('Original');
    expect(state.graph.getNodeAttribute('el-1', 'name')).toBe('Original');
  });

  it('updateElement updates graph node attributes', async () => {
    const original = makeElement({ id: 'el-1', name: 'Original' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Original', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [original], graph });

    const updated = makeElement({ id: 'el-1', name: 'Renamed' });
    vi.mocked(api.updateElement).mockResolvedValue(updated);

    await useModelStore.getState().updateElement('el-1', { name: 'Renamed' });

    expect(useModelStore.getState().graph.getNodeAttribute('el-1', 'name')).toBe('Renamed');
  });

  // ─── deleteElement ────────────────────────────────────────────

  it('deleteElement removes element from store and graph', async () => {
    const el = makeElement({ id: 'el-1' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Test Element', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [el], graph });

    vi.mocked(api.deleteElement).mockResolvedValue(undefined);

    await useModelStore.getState().deleteElement('el-1');

    const state = useModelStore.getState();
    expect(state.elements).toHaveLength(0);
    expect(state.graph.hasNode('el-1')).toBe(false);
  });

  it('deleteElement also removes connected relationships', async () => {
    const el1 = makeElement({ id: 'el-1', name: 'Source' });
    const el2 = makeElement({ id: 'el-2', name: 'Target' });
    const rel = makeRelationship({ id: 'rel-1', source_id: 'el-1', target_id: 'el-2' });

    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Source', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    graph.addNode('el-2', {
      id: 'el-2', name: 'Target', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    graph.addEdgeWithKey('rel-1', 'el-1', 'el-2', {
      id: 'rel-1', archimate_type: 'serving', specialisation: null,
      label: null, source_id: 'el-1', target_id: 'el-2',
    });

    resetStore({ elements: [el1, el2], relationships: [rel], graph });

    vi.mocked(api.deleteElement).mockResolvedValue(undefined);

    await useModelStore.getState().deleteElement('el-1');

    const state = useModelStore.getState();
    expect(state.elements).toHaveLength(1);
    expect(state.elements[0]!.id).toBe('el-2');
    expect(state.relationships).toHaveLength(0);
    expect(state.graph.hasNode('el-1')).toBe(false);
  });

  it('deleteElement rolls back on API error, restoring element and relationships', async () => {
    const el1 = makeElement({ id: 'el-1', name: 'Source' });
    const el2 = makeElement({ id: 'el-2', name: 'Target' });
    const rel = makeRelationship({ id: 'rel-1', source_id: 'el-1', target_id: 'el-2' });

    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Source', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    graph.addNode('el-2', {
      id: 'el-2', name: 'Target', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    graph.addEdgeWithKey('rel-1', 'el-1', 'el-2', {
      id: 'rel-1', archimate_type: 'serving', specialisation: null,
      label: null, source_id: 'el-1', target_id: 'el-2',
    });

    resetStore({ elements: [el1, el2], relationships: [rel], graph });

    vi.mocked(api.deleteElement).mockRejectedValue(new Error('Delete failed'));

    await expect(
      useModelStore.getState().deleteElement('el-1'),
    ).rejects.toThrow('Delete failed');

    const state = useModelStore.getState();
    // Element should be restored
    expect(state.elements.find(e => e.id === 'el-1')).toBeDefined();
    // Relationship should be restored
    expect(state.relationships.find(r => r.id === 'rel-1')).toBeDefined();
    // Graph should have the node back
    expect(state.graph.hasNode('el-1')).toBe(true);
    expect(state.graph.hasEdge('rel-1')).toBe(true);
  });

  it('deleteElement is a no-op for non-existent element', async () => {
    resetStore();
    vi.mocked(api.deleteElement).mockResolvedValue(undefined);

    await useModelStore.getState().deleteElement('non-existent');

    // API should not be called
    expect(api.deleteElement).not.toHaveBeenCalled();
  });

  // ─── updateElementStatus ─────────────────────────────────────

  it('updateElementStatus updates status optimistically', async () => {
    const original = makeElement({ id: 'el-1', status: 'draft' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Test Element', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [original], graph });

    const updated = makeElement({ id: 'el-1', status: 'active' });
    vi.mocked(api.updateElement).mockResolvedValue(updated);

    await useModelStore.getState().updateElementStatus('el-1', 'active');

    expect(api.updateElement).toHaveBeenCalledWith('el-1', { status: 'active' });
    expect(useModelStore.getState().elements[0]!.status).toBe('active');
  });

  it('updateElementStatus rolls back on API error', async () => {
    const original = makeElement({ id: 'el-1', status: 'draft' });
    const graph = freshGraph();
    graph.addNode('el-1', {
      id: 'el-1', name: 'Test Element', archimate_type: 'application-component',
      specialisation: null, layer: 'application', sublayer: null, domain_id: null,
    });
    resetStore({ elements: [original], graph });

    vi.mocked(api.updateElement).mockRejectedValue(new Error('Status update failed'));

    await expect(
      useModelStore.getState().updateElementStatus('el-1', 'active'),
    ).rejects.toThrow('Status update failed');

    expect(useModelStore.getState().elements[0]!.status).toBe('draft');
  });

  it('updateElementStatus is a no-op for non-existent element', async () => {
    resetStore();

    await useModelStore.getState().updateElementStatus('non-existent', 'active');

    expect(api.updateElement).not.toHaveBeenCalled();
  });

  // ─── loadAll ──────────────────────────────────────────────────

  it('loadAll fetches all data and builds graph', async () => {
    const elements = [makeElement({ id: 'el-1' })];
    const relationships = [makeRelationship({ id: 'rel-1', source_id: 'el-1', target_id: 'el-2' })];
    const domains = [{ id: 'd-1', name: 'Domain 1', description: null, colour: null, created_at: null, updated_at: null }];

    vi.mocked(api.fetchElements).mockResolvedValue(elements);
    vi.mocked(api.fetchRelationships).mockResolvedValue(relationships);
    vi.mocked(api.fetchDomains).mockResolvedValue(domains as any);
    vi.mocked(api.fetchSublayerConfig).mockResolvedValue({} as any);
    vi.mocked(api.fetchValidRelationships).mockResolvedValue([]);

    await useModelStore.getState().loadAll();

    const state = useModelStore.getState();
    expect(state.elements).toEqual(elements);
    expect(state.relationships).toEqual(relationships);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('loadAll sets error on failure', async () => {
    vi.mocked(api.fetchElements).mockRejectedValue(new Error('Network down'));
    vi.mocked(api.fetchRelationships).mockResolvedValue([]);
    vi.mocked(api.fetchDomains).mockResolvedValue([]);
    vi.mocked(api.fetchSublayerConfig).mockResolvedValue({} as any);
    vi.mocked(api.fetchValidRelationships).mockResolvedValue([]);

    await useModelStore.getState().loadAll();

    const state = useModelStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network down');
  });
});
