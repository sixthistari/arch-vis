import { describe, it, expect, beforeEach } from 'vitest';
import { useClipboardStore, type ClipboardEntry } from '../clipboard';

function makeEntry(overrides: Partial<ClipboardEntry> = {}): ClipboardEntry {
  return {
    originalId: 'el-1',
    name: 'Test Element',
    archimateType: 'ApplicationComponent',
    layer: 'Application',
    relX: 0,
    relY: 0,
    ...overrides,
  };
}

describe('useClipboardStore', () => {
  beforeEach(() => {
    useClipboardStore.setState({ entries: [] });
  });

  it('starts with an empty entries array', () => {
    expect(useClipboardStore.getState().entries).toEqual([]);
  });

  it('copy() sets entries', () => {
    const entries = [makeEntry()];
    useClipboardStore.getState().copy(entries);
    expect(useClipboardStore.getState().entries).toEqual(entries);
  });

  it('copy() replaces previous entries', () => {
    useClipboardStore.getState().copy([makeEntry({ originalId: 'a' })]);
    const second = [makeEntry({ originalId: 'b' })];
    useClipboardStore.getState().copy(second);
    expect(useClipboardStore.getState().entries).toHaveLength(1);
    expect(useClipboardStore.getState().entries[0]!.originalId).toBe('b');
  });

  it('copy() handles multiple entries', () => {
    const entries = [
      makeEntry({ originalId: '1', relX: 0, relY: 0 }),
      makeEntry({ originalId: '2', relX: 100, relY: 50 }),
    ];
    useClipboardStore.getState().copy(entries);
    expect(useClipboardStore.getState().entries).toHaveLength(2);
  });

  it('clear() empties entries', () => {
    useClipboardStore.getState().copy([makeEntry()]);
    useClipboardStore.getState().clear();
    expect(useClipboardStore.getState().entries).toEqual([]);
  });

  it('clear() on already-empty store is safe', () => {
    useClipboardStore.getState().clear();
    expect(useClipboardStore.getState().entries).toEqual([]);
  });

  it('preserves all ClipboardEntry fields', () => {
    const entry = makeEntry({
      originalId: 'x-99',
      name: 'Mining Rig',
      archimateType: 'Equipment',
      layer: 'Physical',
      relX: 42,
      relY: 77,
    });
    useClipboardStore.getState().copy([entry]);
    const stored = useClipboardStore.getState().entries[0]!;
    expect(stored.originalId).toBe('x-99');
    expect(stored.name).toBe('Mining Rig');
    expect(stored.archimateType).toBe('Equipment');
    expect(stored.layer).toBe('Physical');
    expect(stored.relX).toBe(42);
    expect(stored.relY).toBe(77);
  });
});
