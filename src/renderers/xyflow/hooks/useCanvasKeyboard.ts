/**
 * useCanvasKeyboard — keyboard shortcuts for the xyflow canvas.
 * Handles arrow nudge, Escape deselect, and Ctrl+A select all.
 */
import React from 'react';
import type { Node, Edge } from '@xyflow/react';
import { recomputeBands } from '../layer-bands';

export function useCanvasKeyboard({
  nodesRef,
  edgesRef,
  setSelectedNodeIds,
  forceRender,
  onClearSelectionRef,
  onPositionChangeRef,
  nudgeSaveTimerRef,
  layerLabels,
  theme,
  resolveAbsolutePos,
}: {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  forceRender: React.Dispatch<React.SetStateAction<number>>;
  onClearSelectionRef: React.MutableRefObject<(() => void) | undefined>;
  onPositionChangeRef: React.MutableRefObject<((positions: { element_id: string; x: number; y: number }[]) => void) | undefined>;
  nudgeSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  layerLabels: Record<string, string>;
  theme: 'dark' | 'light';
  resolveAbsolutePos: (nodeId: string) => { x: number; y: number };
}): void {
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't intercept when focus is inside a text input
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Escape — clear selection
      if (e.key === 'Escape') {
        // Deselect all xyflow nodes
        nodesRef.current = nodesRef.current.map(n =>
          n.selected ? { ...n, selected: false } : n,
        );
        edgesRef.current = edgesRef.current.map(edge =>
          edge.selected ? { ...edge, selected: false } : edge,
        );
        setSelectedNodeIds(new Set());
        forceRender(n => n + 1);
        onClearSelectionRef.current?.();
        return;
      }

      // Ctrl+A — select all element nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        nodesRef.current = nodesRef.current.map(n =>
          n.type !== 'layer-band' ? { ...n, selected: true } : n,
        );
        setSelectedNodeIds(new Set(
          nodesRef.current.filter(n => n.type !== 'layer-band').map(n => n.id),
        ));
        forceRender(n => n + 1);
        return;
      }

      // Arrow keys — nudge selected nodes
      const NUDGE = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft')  dx = -NUDGE;
      if (e.key === 'ArrowRight') dx =  NUDGE;
      if (e.key === 'ArrowUp')    dy = -NUDGE;
      if (e.key === 'ArrowDown')  dy =  NUDGE;
      if (dx === 0 && dy === 0) return;

      e.preventDefault();
      // Nudge selected nodes (including layer bands — children move with them)
      nodesRef.current = nodesRef.current.map(n => {
        if (!n.selected) return n;
        return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
      });
      nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
      forceRender(n => n + 1);

      // Collect absolute positions of all affected element nodes for save
      const movedIds = new Set<string>();
      for (const n of nodesRef.current) {
        if (!n.selected) continue;
        if (n.type === 'layer-band') {
          // Layer band selected — all its children moved
          for (const c of nodesRef.current) {
            if (c.parentId === n.id && c.type !== 'layer-band') movedIds.add(c.id);
          }
        } else {
          movedIds.add(n.id);
        }
      }
      const movedPositions = [...movedIds].map(id => {
        const abs = resolveAbsolutePos(id);
        return { element_id: id, x: abs.x, y: abs.y };
      });

      // Debounce the position save so rapid key repeats don't flood the API
      if (nudgeSaveTimerRef.current) clearTimeout(nudgeSaveTimerRef.current);
      nudgeSaveTimerRef.current = setTimeout(() => {
        if (movedPositions.length > 0) {
          onPositionChangeRef.current?.(movedPositions);
        }
      }, 300);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [layerLabels, theme, nodesRef, edgesRef, setSelectedNodeIds, forceRender, onClearSelectionRef, onPositionChangeRef, nudgeSaveTimerRef, resolveAbsolutePos]);
}
