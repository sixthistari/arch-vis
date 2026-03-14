import { create } from 'zustand';

interface ContextMenuState {
  elementId: string;
  x: number;
  y: number;
}

interface InteractionState {
  selectedId: string | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  contextMenu: ContextMenuState | null;
  select: (id: string | null) => void;
  clearSelection: () => void;
  setHighlight: (nodes: Set<string>, edges: Set<string>) => void;
  showContextMenu: (elementId: string, x: number, y: number) => void;
  hideContextMenu: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  selectedId: null,
  highlightedNodes: new Set<string>(),
  highlightedEdges: new Set<string>(),
  contextMenu: null,

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

  showContextMenu: (elementId, x, y) => set({
    contextMenu: { elementId, x, y },
  }),

  hideContextMenu: () => set({ contextMenu: null }),
}));
