import { create } from 'zustand';

interface ContextMenuState {
  elementId: string;
  x: number;
  y: number;
}

interface FormatPainterState {
  active: boolean;
  sourceStyleOverrides: Record<string, unknown> | null;
}

interface InteractionState {
  selectedId: string | null;
  selectedNodeIds: Set<string>;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  contextMenu: ContextMenuState | null;
  formatPainter: FormatPainterState;
  select: (id: string | null) => void;
  setSelectedNodeIds: (ids: Set<string>) => void;
  clearSelection: () => void;
  setHighlight: (nodes: Set<string>, edges: Set<string>) => void;
  showContextMenu: (elementId: string, x: number, y: number) => void;
  hideContextMenu: () => void;
  activateFormatPainter: (styleOverrides: Record<string, unknown> | null) => void;
  deactivateFormatPainter: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  selectedId: null,
  selectedNodeIds: new Set<string>(),
  highlightedNodes: new Set<string>(),
  highlightedEdges: new Set<string>(),
  contextMenu: null,
  formatPainter: { active: false, sourceStyleOverrides: null },

  select: (id) => set({ selectedId: id }),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  clearSelection: () => set({
    selectedId: null,
    selectedNodeIds: new Set<string>(),
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

  activateFormatPainter: (styleOverrides) => set({
    formatPainter: {
      active: true,
      sourceStyleOverrides: styleOverrides ? { ...styleOverrides } : {},
    },
  }),

  deactivateFormatPainter: () => set({
    formatPainter: { active: false, sourceStyleOverrides: null },
  }),
}));
