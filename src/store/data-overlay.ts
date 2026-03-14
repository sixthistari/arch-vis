import { create } from 'zustand';

interface DataOverlayState {
  colourByProperty: string | null;  // 'status' | 'domain' | 'maturity' | null
  showStatusBadge: boolean;
  displayFields: string[];  // max 2 property keys to show below element name

  setColourByProperty: (prop: string | null) => void;
  toggleStatusBadge: () => void;
  setDisplayFields: (fields: string[]) => void;
}

export const useDataOverlayStore = create<DataOverlayState>((set) => ({
  colourByProperty: null,
  showStatusBadge: false,
  displayFields: [],

  setColourByProperty: (prop) => set({ colourByProperty: prop }),
  toggleStatusBadge: () => set((s) => ({ showStatusBadge: !s.showStatusBadge })),
  setDisplayFields: (fields) => set({ displayFields: fields.slice(0, 2) }),
}));
