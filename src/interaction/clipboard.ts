/**
 * Internal clipboard for canvas copy/paste operations.
 *
 * Stores serialised node data (not system clipboard) so paste can
 * create new elements via API with offset positions.
 */
import { create } from 'zustand';

export interface ClipboardEntry {
  /** Original element ID (used to compute relative offsets, NOT re-used on paste). */
  originalId: string;
  name: string;
  archimateType: string;
  layer: string;
  /** Position relative to the group's top-left corner. */
  relX: number;
  relY: number;
}

interface ClipboardState {
  entries: ClipboardEntry[];
  copy: (entries: ClipboardEntry[]) => void;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  entries: [],
  copy: (entries) => set({ entries }),
  clear: () => set({ entries: [] }),
}));
