/**
 * Edge routing integration — handle distribution, edge type mapping, port detection.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Edge } from '@xyflow/react';
import type { ArchimateEdgeData } from './edges/ArchimateEdge';
import type { Relationship } from '../../model/types';
import type { PortSide } from '../../layout/edge-routing';
import { getEdgeType } from '../../model/notation';

/**
 * Determine direction between two nodes and pick the best side.
 * Returns the side ('t', 'b', 'l', 'r') for source and target.
 *
 * Logic:
 *   - If vertical distance < 40px (same row), use left/right handles.
 *   - If target is below with significant gap, use bottom→top.
 *   - If target is above, use top→bottom.
 */
export function computeHandleSides(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
  srcW: number,
  tgtW: number,
  srcH: number,
  tgtH: number,
): { srcSide: string; tgtSide: string } {
  const srcCx = srcPos.x + srcW / 2;
  const srcCy = srcPos.y + srcH / 2;
  const tgtCx = tgtPos.x + tgtW / 2;
  const tgtCy = tgtPos.y + tgtH / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;
  const absDy = Math.abs(dy);

  // Same row — use left/right
  if (absDy < Math.max(srcH, tgtH)) {
    return dx > 0
      ? { srcSide: 'r', tgtSide: 'l' }
      : { srcSide: 'l', tgtSide: 'r' };
  }

  // Target below → bottom→top
  if (dy > 0) {
    return { srcSide: 'b', tgtSide: 't' };
  }

  // Target above → top→bottom
  return { srcSide: 't', tgtSide: 'b' };
}

// Handle IDs per side — 5 positions at 15%, 30%, 50%, 70%, 85%
const SIDE_HANDLES: Record<string, string[]> = {
  t: ['t0', 't1', 't2', 't3', 't4'],
  b: ['b0', 'b1', 'b2', 'b3', 'b4'],
  l: ['l0', 'l1', 'l2', 'l3', 'l4'],
  r: ['r0', 'r1', 'r2', 'r3', 'r4'],
};

/**
 * Convert relationships to xyflow edges with handle usage tracking.
 * Distributes edges across the 3 handles per side (25%, 50%, 75%)
 * to prevent lines from stacking on the same connection point.
 */
export function relationshipsToEdges(
  relationships: Relationship[],
  nodePositions: Map<string, { x: number; y: number; w: number; h: number }>,
  theme: 'dark' | 'light' = 'dark',
): Edge<ArchimateEdgeData>[] {
  // Track how many edges are using each handle on each node
  // Key: "nodeId:handleSide" → next available slot index (0, 1, 2)
  const handleUsage = new Map<string, number>();

  // Step offsets per slot — varies the routing channel to prevent stacking
  const SLOT_OFFSETS = [20, 12, 28, 8, 36];

  function nextHandle(nodeId: string, side: string): { handleId: string; slotIndex: number } {
    const key = `${nodeId}:${side}`;
    const slotIndex = handleUsage.get(key) ?? 0;
    handleUsage.set(key, slotIndex + 1);
    const handles = SIDE_HANDLES[side] ?? ['t1'];
    // Distribute: middle first, then spread outward
    const order = [2, 1, 3, 0, 4];
    const pick = order[slotIndex % 5]!;
    return { handleId: handles[pick]!, slotIndex };
  }

  return relationships.map((rel) => {
    const srcPos = nodePositions.get(rel.source_id);
    const tgtPos = nodePositions.get(rel.target_id);

    let sourceHandle: string | undefined;
    let targetHandle: string | undefined;

    let stepOffset = 20;

    if (srcPos && tgtPos) {
      const { srcSide, tgtSide } = computeHandleSides(srcPos, tgtPos, srcPos.w, tgtPos.w, srcPos.h, tgtPos.h);
      const srcResult = nextHandle(rel.source_id, srcSide);
      sourceHandle = srcResult.handleId;
      const tgtResult = nextHandle(rel.target_id, tgtSide);
      targetHandle = `${tgtResult.handleId}-t`;
      // Vary the step offset per slot to prevent horizontal/vertical line stacking
      stepOffset = SLOT_OFFSETS[srcResult.slotIndex % SLOT_OFFSETS.length]!;
    }

    const edgeType = getEdgeType(rel.archimate_type);

    return {
      id: rel.id,
      type: edgeType,
      source: rel.source_id,
      target: rel.target_id,
      sourceHandle,
      targetHandle,
      reconnectable: true,
      data: {
        relationshipType: rel.archimate_type,
        label: rel.label ?? undefined,
        specialisation: rel.specialisation,
        stepOffset,
        theme,
        ...(edgeType === 'uml-edge' ? { edgeType: rel.archimate_type } : {}),
        ...(edgeType === 'sequence-message' ? {
          messageType: rel.archimate_type.replace('uml-', '').replace('-message', '') as string,
          sequenceNumber: (rel.properties as Record<string, unknown>)?.sequenceNumber as number | undefined,
        } : {}),
      },
    };
  });
}

/** Detect which face of a node box a port coordinate sits on. */
export function detectPortSide(
  px: number, py: number,
  b: { x: number; y: number; w: number; h: number },
): PortSide {
  const dl = Math.abs(px - b.x);
  const dr = Math.abs(px - (b.x + b.w));
  const dt = Math.abs(py - b.y);
  const db = Math.abs(py - (b.y + b.h));
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return 'left';
  if (m === dr) return 'right';
  if (m === dt) return 'top';
  return 'bottom';
}
