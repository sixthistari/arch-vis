/**
 * Undo/redo — command pattern for canvas mutations.
 *
 * Commands are recorded as execute/undo pairs.  The stack coalesces
 * rapid node-move events into a single undo step via a pending-move
 * buffer that is flushed on commit().
 */
import { create } from 'zustand';
import * as api from '../api/client';
import type { Element, CreateElementInput, Relationship, CreateRelationshipInput } from '../model/types';

// ── Command interface ─────────────────────────────────────────────────────

export interface Command {
  description: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────

interface UndoRedoState {
  past: Command[];
  future: Command[];
  /** Execute a command and push it onto the past stack. */
  run: (cmd: Command) => Promise<void>;
  /** Undo the last command. */
  undo: () => Promise<void>;
  /** Redo the last undone command. */
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
}

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  run: async (cmd: Command) => {
    await cmd.execute();
    set(state => ({
      past: [...state.past, cmd],
      future: [],
      canUndo: true,
      canRedo: false,
    }));
  },

  undo: async () => {
    const { past } = get();
    if (past.length === 0) return;
    const cmd = past[past.length - 1]!;
    await cmd.undo();
    set(state => ({
      past: state.past.slice(0, -1),
      future: [cmd, ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    }));
  },

  redo: async () => {
    const { future } = get();
    if (future.length === 0) return;
    const cmd = future[0]!;
    await cmd.execute();
    set(state => ({
      past: [...state.past, cmd],
      future: state.future.slice(1),
      canUndo: true,
      canRedo: state.future.length > 1,
    }));
  },
}));

// ── Command factories ─────────────────────────────────────────────────────

/** Create a new element and record undo. */
export function createElementCommand(
  data: CreateElementInput,
  onSuccess: (el: Element) => Promise<void>,
): Command {
  let createdId: string | null = null;

  return {
    description: `Create ${data.archimate_type} "${data.name}"`,
    execute: async () => {
      const el = await api.createElement(data);
      createdId = el.id;
      await onSuccess(el);
    },
    undo: async () => {
      if (createdId) {
        await api.deleteElement(createdId);
        await onSuccess(null as unknown as Element);
      }
    },
  };
}

/** Move an element — coalesces multiple moves into one step. */
export function moveElementCommand(
  elementId: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  viewId: string,
  onSuccess: () => Promise<void>,
): Command {
  return {
    description: `Move element`,
    execute: async () => {
      await api.updateViewElements(viewId, [{
        view_id: viewId,
        element_id: elementId,
        x: toX,
        y: toY,
        width: null,
        height: null,
        sublayer_override: null,
        style_overrides: null,
      }]);
      await onSuccess();
    },
    undo: async () => {
      await api.updateViewElements(viewId, [{
        view_id: viewId,
        element_id: elementId,
        x: fromX,
        y: fromY,
        width: null,
        height: null,
        sublayer_override: null,
        style_overrides: null,
      }]);
      await onSuccess();
    },
  };
}

/** Delete an element — stores previous data for undo. */
export function deleteElementCommand(
  element: Element,
  onSuccess: () => Promise<void>,
): Command {
  return {
    description: `Delete "${element.name}"`,
    execute: async () => {
      await api.deleteElement(element.id);
      await onSuccess();
    },
    undo: async () => {
      // Re-create with same data
      await api.createElement({
        id: element.id,
        name: element.name,
        archimate_type: element.archimate_type,
        layer: element.layer,
        specialisation: element.specialisation,
        sublayer: element.sublayer,
        domain_id: element.domain_id,
        status: element.status,
        description: element.description,
      });
      await onSuccess();
    },
  };
}

/** Rename an element. */
export function renameElementCommand(
  elementId: string,
  oldName: string,
  newName: string,
  onSuccess: () => Promise<void>,
): Command {
  return {
    description: `Rename to "${newName}"`,
    execute: async () => {
      await api.updateElement(elementId, { name: newName });
      await onSuccess();
    },
    undo: async () => {
      await api.updateElement(elementId, { name: oldName });
      await onSuccess();
    },
  };
}

/** Create a relationship and record undo. */
export function createRelationshipCommand(
  data: CreateRelationshipInput,
  onSuccess: (rel: Relationship) => Promise<void>,
): Command {
  let createdId: string | null = null;

  return {
    description: `Create ${data.archimate_type} relationship`,
    execute: async () => {
      const rel = await api.createRelationship(data);
      createdId = rel.id;
      await onSuccess(rel);
    },
    undo: async () => {
      if (createdId) {
        await api.deleteRelationship(createdId);
        await onSuccess(null as unknown as Relationship);
      }
    },
  };
}

/** Delete a relationship and record undo. */
export function deleteRelationshipCommand(
  relationship: Relationship,
  onSuccess: () => Promise<void>,
): Command {
  return {
    description: `Delete relationship`,
    execute: async () => {
      await api.deleteRelationship(relationship.id);
      await onSuccess();
    },
    undo: async () => {
      await api.createRelationship({
        id: relationship.id,
        archimate_type: relationship.archimate_type,
        source_id: relationship.source_id,
        target_id: relationship.target_id,
        label: relationship.label ?? undefined,
        description: relationship.description ?? undefined,
        specialisation: relationship.specialisation ?? undefined,
      });
      await onSuccess();
    },
  };
}
