import { create } from 'zustand';

interface LayerVisibilityState {
  hiddenLayers: Set<string>;
  lockedLayers: Set<string>;
  layerOpacity: Record<string, number>;
  showRelationships: boolean;

  toggleHidden: (layer: string) => void;
  toggleLocked: (layer: string) => void;
  setOpacity: (layer: string, opacity: number) => void;
  toggleRelationships: () => void;
  reset: () => void;
}

export const useLayerVisibilityStore = create<LayerVisibilityState>((set) => ({
  hiddenLayers: new Set(),
  lockedLayers: new Set(),
  layerOpacity: {},
  showRelationships: true,

  toggleHidden: (layer) => set((state) => {
    const next = new Set(state.hiddenLayers);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    return { hiddenLayers: next };
  }),

  toggleLocked: (layer) => set((state) => {
    const next = new Set(state.lockedLayers);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    return { lockedLayers: next };
  }),

  setOpacity: (layer, opacity) => set((state) => ({
    layerOpacity: { ...state.layerOpacity, [layer]: opacity },
  })),

  toggleRelationships: () => set((state) => ({
    showRelationships: !state.showRelationships,
  })),

  reset: () => set({
    hiddenLayers: new Set(),
    lockedLayers: new Set(),
    layerOpacity: {},
    showRelationships: true,
  }),
}));
