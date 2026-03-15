import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useUndoRedoStore,
  type Command,
  moveElementCommand,
  removeFromViewCommand,
  renameElementCommand,
  deleteElementCommand,
} from '../undo-redo';

// Mock the API client used by command factories
vi.mock('../../api/client', () => ({
  updateViewElements: vi.fn().mockResolvedValue(undefined),
  removeViewElements: vi.fn().mockResolvedValue(undefined),
  updateElement: vi.fn().mockResolvedValue(undefined),
  deleteElement: vi.fn().mockResolvedValue(undefined),
  createElement: vi.fn().mockResolvedValue({ id: 'el-1' }),
}));

import * as api from '../../api/client';

function resetStore() {
  useUndoRedoStore.setState({
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
  });
}

function mockCommand(desc = 'test'): Command {
  return {
    description: desc,
    execute: vi.fn().mockResolvedValue(undefined),
    undo: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useUndoRedoStore — core stack', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('starts empty with canUndo/canRedo false', () => {
    const s = useUndoRedoStore.getState();
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it('run() executes the command and pushes to past', async () => {
    const cmd = mockCommand();
    await useUndoRedoStore.getState().run(cmd);
    expect(cmd.execute).toHaveBeenCalledOnce();
    const s = useUndoRedoStore.getState();
    expect(s.past).toHaveLength(1);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('push() adds to past without executing', () => {
    const cmd = mockCommand();
    useUndoRedoStore.getState().push(cmd);
    expect(cmd.execute).not.toHaveBeenCalled();
    expect(useUndoRedoStore.getState().past).toHaveLength(1);
    expect(useUndoRedoStore.getState().canUndo).toBe(true);
  });

  it('run() clears the future stack', async () => {
    const cmd1 = mockCommand('a');
    const cmd2 = mockCommand('b');
    await useUndoRedoStore.getState().run(cmd1);
    await useUndoRedoStore.getState().undo();
    // Now cmd1 is in future
    expect(useUndoRedoStore.getState().future).toHaveLength(1);
    await useUndoRedoStore.getState().run(cmd2);
    expect(useUndoRedoStore.getState().future).toHaveLength(0);
    expect(useUndoRedoStore.getState().canRedo).toBe(false);
  });

  it('undo() moves last command from past to future', async () => {
    const cmd = mockCommand();
    await useUndoRedoStore.getState().run(cmd);
    await useUndoRedoStore.getState().undo();
    expect(cmd.undo).toHaveBeenCalledOnce();
    const s = useUndoRedoStore.getState();
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(1);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(true);
  });

  it('redo() moves first command from future to past', async () => {
    const cmd = mockCommand();
    await useUndoRedoStore.getState().run(cmd);
    await useUndoRedoStore.getState().undo();
    await useUndoRedoStore.getState().redo();
    // execute called twice: once in run, once in redo
    expect(cmd.execute).toHaveBeenCalledTimes(2);
    const s = useUndoRedoStore.getState();
    expect(s.past).toHaveLength(1);
    expect(s.future).toHaveLength(0);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('undo() on empty stack is a no-op', async () => {
    await useUndoRedoStore.getState().undo();
    expect(useUndoRedoStore.getState().past).toHaveLength(0);
  });

  it('redo() on empty future is a no-op', async () => {
    await useUndoRedoStore.getState().redo();
    expect(useUndoRedoStore.getState().future).toHaveLength(0);
  });

  it('multiple undo/redo preserves order', async () => {
    const a = mockCommand('a');
    const b = mockCommand('b');
    await useUndoRedoStore.getState().run(a);
    await useUndoRedoStore.getState().run(b);
    // Undo b first
    await useUndoRedoStore.getState().undo();
    expect(b.undo).toHaveBeenCalledOnce();
    expect(useUndoRedoStore.getState().past).toHaveLength(1);
    // Undo a
    await useUndoRedoStore.getState().undo();
    expect(a.undo).toHaveBeenCalledOnce();
    // Redo a first (it is at front of future)
    await useUndoRedoStore.getState().redo();
    expect(a.execute).toHaveBeenCalledTimes(2);
  });
});

describe('command factories', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('moveElementCommand — execute calls updateViewElements with toX/toY', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const cmd = moveElementCommand('el-1', 10, 20, 100, 200, 'view-1', onSuccess);
    await cmd.execute();
    expect(api.updateViewElements).toHaveBeenCalledWith('view-1', [
      expect.objectContaining({ element_id: 'el-1', x: 100, y: 200 }),
    ]);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('moveElementCommand — undo calls updateViewElements with fromX/fromY', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const cmd = moveElementCommand('el-1', 10, 20, 100, 200, 'view-1', onSuccess);
    await cmd.undo();
    expect(api.updateViewElements).toHaveBeenCalledWith('view-1', [
      expect.objectContaining({ element_id: 'el-1', x: 10, y: 20 }),
    ]);
  });

  it('removeFromViewCommand — execute removes, undo re-adds', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const savedViewElements = [
      { view_id: 'v1', element_id: 'e1', x: 0, y: 0, width: null, height: null, sublayer_override: null, style_overrides: null, z_index: 0 },
    ] as any;
    const cmd = removeFromViewCommand('v1', ['e1'], savedViewElements, onSuccess);
    await cmd.execute();
    expect(api.removeViewElements).toHaveBeenCalledWith('v1', ['e1']);
    await cmd.undo();
    expect(api.updateViewElements).toHaveBeenCalledWith('v1', savedViewElements);
  });

  it('renameElementCommand — execute sets newName, undo sets oldName', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const cmd = renameElementCommand('el-1', 'Old', 'New', onSuccess);
    await cmd.execute();
    expect(api.updateElement).toHaveBeenCalledWith('el-1', { name: 'New' });
    await cmd.undo();
    expect(api.updateElement).toHaveBeenCalledWith('el-1', { name: 'Old' });
  });

  it('deleteElementCommand — execute deletes, undo re-creates', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const element = {
      id: 'el-1',
      name: 'Test',
      archimate_type: 'ApplicationComponent',
      layer: 'Application',
      specialisation: null,
      sublayer: 'active-structure',
      domain_id: null,
      status: 'current',
      description: null,
    } as any;
    const cmd = deleteElementCommand(element, onSuccess);
    await cmd.execute();
    expect(api.deleteElement).toHaveBeenCalledWith('el-1');
    await cmd.undo();
    expect(api.createElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'el-1', name: 'Test', archimate_type: 'ApplicationComponent' }),
    );
  });
});
