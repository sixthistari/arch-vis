import { create } from 'zustand';
import type { View, ViewElement, ViewRelationship } from '../model/types';
import * as api from '../api/client';

interface ViewState {
  viewList: View[];
  currentView: View | null;
  viewElements: ViewElement[];
  viewRelationships: ViewRelationship[];
  loading: boolean;
  positionSaveError: string | null;
  loadViewList: () => Promise<void>;
  loadView: (id: string) => Promise<void>;
  switchView: (id: string) => Promise<void>;
  savePositions: (viewId: string, elements: ViewElement[]) => Promise<void>;
  createView: (name: string, viewpointType?: string) => Promise<void>;
}

export const useViewStore = create<ViewState>((set) => ({
  viewList: [],
  currentView: null,
  viewElements: [],
  viewRelationships: [],
  loading: false,
  positionSaveError: null,

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
    // Alias — identical to loadView
    const self = useViewStore.getState();
    await self.loadView(id);
  },

  savePositions: async (viewId: string, elements: ViewElement[]) => {
    try {
      const updated = await api.updateViewElements(viewId, elements);
      set({ viewElements: updated, positionSaveError: null });
    } catch (err) {
      // Retry once after 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const updated = await api.updateViewElements(viewId, elements);
        set({ viewElements: updated, positionSaveError: null });
      } catch (retryErr) {
        const message = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error('Position save failed after retry:', retryErr);
        set({ positionSaveError: `Position save failed: ${message}` });
      }
    }
  },

  createView: async (name: string, viewpointType?: string) => {
    const view = await api.createView({
      id: `view-${crypto.randomUUID()}`,
      name,
      viewpoint_type: (viewpointType ?? 'custom') as import('../model/types').ViewpointType,
    });
    const viewList = await api.fetchViews();
    const viewData = await api.fetchView(view.id);
    set({
      viewList,
      currentView: viewData.view,
      viewElements: viewData.viewElements ?? [],
      viewRelationships: viewData.viewRelationships ?? [],
    });
  },
}));
