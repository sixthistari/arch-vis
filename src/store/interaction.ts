import { create } from 'zustand';

interface InteractionState {
  selectedId: string | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  select: (id: string | null) => void;
  clearSelection: () => void;
  setHighlight: (nodes: Set<string>, edges: Set<string>) => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  selectedId: null,
  highlightedNodes: new Set<string>(),
  highlightedEdges: new Set<string>(),

  select: (id) => set({ selectedId: id }),

  clearSelection: () => set({
    selectedId: null,
    highlightedNodes: new Set<string>(),
    highlightedEdges: new Set<string>(),
  }),

  setHighlight: (nodes, edges) => set({
    highlightedNodes: nodes,
    highlightedEdges: edges,
  }),
}));
