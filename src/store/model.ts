import { create } from 'zustand';
import Graph from 'graphology';
import type { Element, Relationship, Domain, SublayerConfig, CreateElementInput, UpdateElementInput } from '../model/types';
import { buildGraphFromData } from '../model/graph';
import * as api from '../api/client';

interface ModelState {
  elements: Element[];
  relationships: Relationship[];
  domains: Domain[];
  sublayerConfig: SublayerConfig | null;
  graph: Graph;
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  createElement: (data: CreateElementInput) => Promise<Element>;
  updateElement: (id: string, data: Omit<UpdateElementInput, 'id'>) => Promise<Element>;
  deleteElement: (id: string) => Promise<void>;
  updateElementStatus: (id: string, status: string) => Promise<void>;
}

export const useModelStore = create<ModelState>((set, get) => ({
  elements: [],
  relationships: [],
  domains: [],
  sublayerConfig: null,
  graph: new Graph(),
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [elements, relationships, domains, sublayerConfig] = await Promise.all([
        api.fetchElements(),
        api.fetchRelationships(),
        api.fetchDomains(),
        api.fetchSublayerConfig(),
      ]);

      const graph = buildGraphFromData(elements, relationships);

      set({
        elements,
        relationships,
        domains,
        sublayerConfig,
        graph,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load data' });
    }
  },

  createElement: async (data: CreateElementInput) => {
    const el = await api.createElement(data);
    await get().loadAll();
    return el;
  },

  updateElement: async (id: string, data: Omit<UpdateElementInput, 'id'>) => {
    const el = await api.updateElement(id, data);
    await get().loadAll();
    return el;
  },

  deleteElement: async (id: string) => {
    await api.deleteElement(id);
    await get().loadAll();
  },

  updateElementStatus: async (id: string, status: string) => {
    const element = get().elements.find(e => e.id === id);
    if (!element) return;
    await api.updateElement(id, { status });
    await get().loadAll();
  },
}));
