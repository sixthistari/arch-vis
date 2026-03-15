import { create } from 'zustand';

export interface TabEntry {
  viewId: string;
  viewName: string;
}

interface PanelState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  /** Full screen mode — hides all panels, toolbar, and status bar */
  fullScreen: boolean;

  /** Open view tabs */
  openTabs: TabEntry[];
  /** Currently active tab (viewId) */
  activeTabId: string | null;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  toggleFullScreen: () => void;

  /** Open a view as a tab (adds if not already open) and set it active */
  openTab: (viewId: string, viewName: string) => void;
  /** Close a tab by viewId; switches to adjacent tab */
  closeTab: (viewId: string) => void;
  /** Set the active tab without adding */
  setActiveTab: (viewId: string) => void;
  /** Update a tab's name (e.g. after rename) */
  updateTabName: (viewId: string, viewName: string) => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
  bottomPanelHeight: 220,
  fullScreen: false,

  openTabs: [],
  activeTabId: null,

  toggleLeftPanel: () => set(s => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  toggleFullScreen: () => set(s => ({ fullScreen: !s.fullScreen })),

  openTab: (viewId: string, viewName: string) => set(s => {
    const existing = s.openTabs.find(t => t.viewId === viewId);
    if (existing) {
      return { activeTabId: viewId };
    }
    return {
      openTabs: [...s.openTabs, { viewId, viewName }],
      activeTabId: viewId,
    };
  }),

  closeTab: (viewId: string) => set(s => {
    const idx = s.openTabs.findIndex(t => t.viewId === viewId);
    if (idx === -1) return s;
    const newTabs = s.openTabs.filter(t => t.viewId !== viewId);
    let newActiveId = s.activeTabId;
    if (s.activeTabId === viewId) {
      if (newTabs.length === 0) {
        newActiveId = null;
      } else if (idx < newTabs.length) {
        newActiveId = newTabs[idx]!.viewId;
      } else {
        newActiveId = newTabs[newTabs.length - 1]!.viewId;
      }
    }
    return { openTabs: newTabs, activeTabId: newActiveId };
  }),

  setActiveTab: (viewId: string) => set({ activeTabId: viewId }),

  updateTabName: (viewId: string, viewName: string) => set(s => ({
    openTabs: s.openTabs.map(t => t.viewId === viewId ? { ...t, viewName } : t),
  })),
}));
