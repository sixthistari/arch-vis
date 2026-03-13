import { create } from 'zustand';
import type { View, ViewElement, ViewRelationship } from '../model/types';
import * as api from '../api/client';

interface ViewState {
  viewList: View[];
  currentView: View | null;
  viewElements: ViewElement[];
  viewRelationships: ViewRelationship[];
  loading: boolean;
  loadViewList: () => Promise<void>;
  loadView: (id: string) => Promise<void>;
  switchView: (id: string) => Promise<void>;
  savePositions: (viewId: string, elements: ViewElement[]) => Promise<void>;
}

export const useViewStore = create<ViewState>((set) => ({
  viewList: [],
  currentView: null,
  viewElements: [],
  viewRelationships: [],
  loading: false,

  loadViewList: async () => {
    const viewList = await api.fetchViews();
    set({ viewList });
  },

  loadView: async (id: string) => {
    set({ loading: true });
    try {
      const viewData = await api.fetchView(id);
      set({
        currentView: viewData.view,
        viewElements: viewData.viewElements ?? [],
        viewRelationships: viewData.viewRelationships ?? [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  switchView: async (id: string) => {
    set({ loading: true });
    try {
      const viewData = await api.fetchView(id);
      set({
        currentView: viewData.view,
        viewElements: viewData.viewElements ?? [],
        viewRelationships: viewData.viewRelationships ?? [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  savePositions: async (viewId: string, elements: ViewElement[]) => {
    try {
      const updated = await api.updateViewElements(viewId, elements);
      set({ viewElements: updated });
    } catch {
      // Position save failed — positions will be lost on refresh
    }
  },
}));
