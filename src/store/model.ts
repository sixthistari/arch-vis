import { create } from 'zustand';
import Graph from 'graphology';
import type { Element, Relationship, Domain, SublayerConfig, ValidRelationship, CreateElementInput, UpdateElementInput } from '../model/types';
import { buildGraphFromData } from '../model/graph';
import * as api from '../api/client';

interface ModelState {
  elements: Element[];
  relationships: Relationship[];
  domains: Domain[];
  sublayerConfig: SublayerConfig | null;
  validRelationships: ValidRelationship[];
  graph: Graph;
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  createElement: (data: CreateElementInput) => Promise<Element>;
  updateElement: (id: string, data: Omit<UpdateElementInput, 'id'>) => Promise<Element>;
  deleteElement: (id: string) => Promise<void>;
  updateElementStatus: (id: string, status: Element['status']) => Promise<void>;
}

let loadAllPromise: Promise<void> | null = null;

function addElementToGraph(graph: Graph, el: Element): void {
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

function updateElementInGraph(graph: Graph, el: Element): void {
  if (graph.hasNode(el.id)) {
    graph.replaceNodeAttributes(el.id, {
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

function removeElementFromGraph(graph: Graph, id: string): void {
  if (graph.hasNode(id)) {
    graph.dropNode(id); // also drops all attached edges
  }
}

export const useModelStore = create<ModelState>((set, get) => ({
  elements: [],
  relationships: [],
  domains: [],
  sublayerConfig: null,
  validRelationships: [],
  graph: new Graph({ multi: true, type: 'directed' }),
  loading: false,
  error: null,

  loadAll: async () => {
    // Deduplicate: if already in flight, return the existing promise
    if (loadAllPromise) return loadAllPromise;

    set({ loading: true, error: null });

    loadAllPromise = (async () => {
      try {
        const [elements, relationships, domains, sublayerConfig, validRelationships] = await Promise.all([
          api.fetchElements(),
          api.fetchRelationships(),
          api.fetchDomains(),
          api.fetchSublayerConfig(),
          api.fetchValidRelationships(),
        ]);

        const graph = buildGraphFromData(elements, relationships);

        set({
          elements,
          relationships,
          domains,
          sublayerConfig,
          validRelationships,
          graph,
          loading: false,
        });
      } catch (err) {
        set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load data' });
      } finally {
        loadAllPromise = null;
      }
    })();

    return loadAllPromise;
  },

  createElement: async (data: CreateElementInput) => {
    const el = await api.createElement(data);
    const { elements, graph } = get();
    addElementToGraph(graph, el);
    set({ elements: [...elements, el] });
    return el;
  },

  updateElement: async (id: string, data: Omit<UpdateElementInput, 'id'>) => {
    const { elements, graph } = get();
    const idx = elements.findIndex(e => e.id === id);
    const previous = idx >= 0 ? elements[idx] : null;

    // Optimistic update
    if (previous) {
      const optimistic = { ...previous, ...data } as Element;
      const next = [...elements];
      next[idx] = optimistic;
      updateElementInGraph(graph, optimistic);
      set({ elements: next });
    }

    try {
      const el = await api.updateElement(id, data);
      // Apply server response
      const current = get().elements;
      const currentIdx = current.findIndex(e => e.id === id);
      if (currentIdx >= 0) {
        const next = [...current];
        next[currentIdx] = el;
        updateElementInGraph(get().graph, el);
        set({ elements: next });
      }
      return el;
    } catch (err) {
      // Rollback on error
      if (previous) {
        const current = get().elements;
        const currentIdx = current.findIndex(e => e.id === id);
        if (currentIdx >= 0) {
          const next = [...current];
          next[currentIdx] = previous;
          updateElementInGraph(get().graph, previous);
          set({ elements: next });
        }
      }
      throw err;
    }
  },

  deleteElement: async (id: string) => {
    const { elements, relationships, graph } = get();
    const previous = elements.find(e => e.id === id);
    if (!previous) return;

    // Collect edges that will be dropped when the node is removed
    const affectedRelationships = graph.hasNode(id)
      ? graph.edges(id).map(edgeKey => relationships.find(r => r.id === edgeKey)).filter(Boolean) as Relationship[]
      : [];

    // Optimistic update
    removeElementFromGraph(graph, id);
    const removedRelIds = new Set(affectedRelationships.map(r => r.id));
    set({
      elements: elements.filter(e => e.id !== id),
      relationships: relationships.filter(r => !removedRelIds.has(r.id)),
    });

    try {
      await api.deleteElement(id);
    } catch (err) {
      // Rollback: re-add element and its edges
      const current = get();
      addElementToGraph(current.graph, previous);
      for (const rel of affectedRelationships) {
        if (current.graph.hasNode(rel.source_id) && current.graph.hasNode(rel.target_id) && !current.graph.hasEdge(rel.id)) {
          current.graph.addEdgeWithKey(rel.id, rel.source_id, rel.target_id, {
            id: rel.id,
            archimate_type: rel.archimate_type,
            specialisation: rel.specialisation,
            label: rel.label,
            source_id: rel.source_id,
            target_id: rel.target_id,
          });
        }
      }
      set({
        elements: [...current.elements, previous],
        relationships: [...current.relationships, ...affectedRelationships],
      });
      throw err;
    }
  },

  updateElementStatus: async (id: string, status: Element['status']) => {
    const { elements, graph } = get();
    const idx = elements.findIndex(e => e.id === id);
    if (idx < 0) return;

    const previous: Element = elements[idx]!;

    // Optimistic update
    const optimistic: Element = { ...previous, status };
    const next = [...elements];
    next[idx] = optimistic;
    updateElementInGraph(graph, optimistic);
    set({ elements: next });

    try {
      const el = await api.updateElement(id, { status });
      // Apply server response
      const current = get().elements;
      const currentIdx = current.findIndex(e => e.id === id);
      if (currentIdx >= 0) {
        const updated = [...current];
        updated[currentIdx] = el;
        updateElementInGraph(get().graph, el);
        set({ elements: updated });
      }
    } catch (err) {
      // Rollback
      const current = get().elements;
      const currentIdx = current.findIndex(e => e.id === id);
      if (currentIdx >= 0) {
        const rolled = [...current];
        rolled[currentIdx] = previous;
        updateElementInGraph(get().graph, previous);
        set({ elements: rolled });
      }
      throw err;
    }
  },
}));
