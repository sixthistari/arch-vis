/**
 * Edge routing integration — handle distribution, edge type mapping, port detection.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Edge } from '@xyflow/react';
import type { UnifiedEdgeData as ArchimateEdgeData } from './edges';
import type { Relationship } from '../../model/types';
import type { PortSide } from '../../layout/edge-routing';
import { getEdgeType } from '../../model/notation';

/**
 * Determine direction between two nodes and pick the best side.
 * Returns the side ('t', 'b', 'l', 'r') for source and target.
 *
 * Uses angle-based quadrant selection: the angle from source centre to
 * target centre is compared against the node's aspect-ratio threshold.
 * This ensures edges always leave perpendicular to the node edge they exit from,
 * even for diagonally placed nodes.
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

  // Aspect-ratio-aware threshold: angle at which the diagonal of the
  // source node's bounding box crosses from "mostly horizontal" to "mostly vertical"
  const angle = Math.atan2(Math.abs(dy), Math.abs(dx));
  const threshold = Math.atan2(srcH / 2, srcW / 2);

  if (angle < threshold) {
    // Predominantly horizontal → use left/right
    return dx > 0
      ? { srcSide: 'r', tgtSide: 'l' }
      : { srcSide: 'l', tgtSide: 'r' };
  }

  // Predominantly vertical → use top/bottom
  return dy > 0
    ? { srcSide: 'b', tgtSide: 't' }
    : { srcSide: 't', tgtSide: 'b' };
}

// Handle IDs per side — 5 positions at 15%, 30%, 50%, 70%, 85%
const SIDE_HANDLES: Record<string, string[]> = {
  t: ['t0', 't1', 't2', 't3', 't4'],
  b: ['b0', 'b1', 'b2', 'b3', 'b4'],
  l: ['l0', 'l1', 'l2', 'l3', 'l4'],
  r: ['r0', 'r1', 'r2', 'r3', 'r4'],
};

/** Fallback map: if a side is excluded, pick the best alternative. */
const SIDE_FALLBACK: Record<string, string> = {
  l: 'b', r: 't', t: 'l', b: 'r',
};

/** If the chosen side is excluded, redirect to the fallback side. */
function redirectExcludedSide(side: string, excludedSides?: string[]): string {
  if (!excludedSides || excludedSides.length === 0) return side;
  if (!excludedSides.includes(side)) return side;
  // Try the direct fallback first
  const fb = SIDE_FALLBACK[side];
  if (fb && !excludedSides.includes(fb)) return fb;
  // Last resort: pick any non-excluded side
  for (const s of ['t', 'b', 'l', 'r']) {
    if (!excludedSides.includes(s)) return s;
  }
  return side; // all excluded — shouldn't happen
}

/** Position entry for edge routing — includes optional excluded sides for non-rectangular shapes. */
export interface NodePositionEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Sides that have no handles (e.g. ['l', 'r'] for chevron shapes). */
  excludedSides?: string[];
}

/**
 * Convert relationships to xyflow edges with handle usage tracking.
 *
 * Handle assignment uses Y-sorted ordering: edges connecting to the same side
 * of a node are sorted by the Y-position of the opposite endpoint, then assigned
 * handles top-to-bottom (index 0 = topmost, 4 = bottommost). This prevents
 * edge crossings at actors and hub nodes where many edges fan out.
 */
export function relationshipsToEdges(
  relationships: Relationship[],
  nodePositions: Map<string, NodePositionEntry>,
  theme: 'dark' | 'light' = 'dark',
): Edge<ArchimateEdgeData>[] {
  // Step offsets per slot — varies the routing channel to prevent stacking
  const SLOT_OFFSETS = [20, 12, 28, 8, 36];

  // Filter out relationships whose source or target node is not in the current view.
  const viewRelationships = relationships.filter(
    rel => nodePositions.has(rel.source_id) && nodePositions.has(rel.target_id),
  );

  // ── Phase 1: compute sides for every edge ────────────────────────────
  interface EdgeInfo {
    rel: Relationship;
    srcSide: string;
    tgtSide: string;
  }

  const edgeInfos: EdgeInfo[] = viewRelationships.map((rel) => {
    const srcPos = nodePositions.get(rel.source_id);
    const tgtPos = nodePositions.get(rel.target_id);
    let srcSide = 'r';
    let tgtSide = 'l';
    if (srcPos && tgtPos) {
      const sides = computeHandleSides(srcPos, tgtPos, srcPos.w, tgtPos.w, srcPos.h, tgtPos.h);
      srcSide = redirectExcludedSide(sides.srcSide, srcPos.excludedSides);
      tgtSide = redirectExcludedSide(sides.tgtSide, tgtPos.excludedSides);
    }
    return { rel, srcSide, tgtSide };
  });

  // ── Phase 2: group edges by (nodeId, side), sort by opposite Y ───────
  // Key: "nodeId:side:role" where role is 'src' or 'tgt'
  type HandleGroup = { edgeIdx: number; oppositeY: number }[];
  const groups = new Map<string, HandleGroup>();

  for (let i = 0; i < edgeInfos.length; i++) {
    const info = edgeInfos[i]!;
    const srcPos = nodePositions.get(info.rel.source_id);
    const tgtPos = nodePositions.get(info.rel.target_id);

    // Group the source-side handle
    const srcKey = `${info.rel.source_id}:${info.srcSide}:src`;
    const srcGroup = groups.get(srcKey) ?? [];
    srcGroup.push({ edgeIdx: i, oppositeY: tgtPos ? tgtPos.y + tgtPos.h / 2 : 0 });
    groups.set(srcKey, srcGroup);

    // Group the target-side handle
    const tgtKey = `${info.rel.target_id}:${info.tgtSide}:tgt`;
    const tgtGroup = groups.get(tgtKey) ?? [];
    tgtGroup.push({ edgeIdx: i, oppositeY: srcPos ? srcPos.y + srcPos.h / 2 : 0 });
    groups.set(tgtKey, tgtGroup);
  }

  // Sort each group by oppositeY (topmost first) → assign handles in order
  // handleAssignments[edgeIdx] = { srcHandle, tgtHandle, slotIndex }
  const srcHandles = new Map<number, { handleId: string; slotIndex: number }>();
  const tgtHandles = new Map<number, { handleId: string; slotIndex: number }>();

  for (const [key, group] of groups) {
    const side = key.split(':')[1]!;
    const role = key.split(':')[2]!;
    const handles = SIDE_HANDLES[side] ?? ['t1'];

    // Sort by opposite Y position (ascending = top first)
    group.sort((a, b) => a.oppositeY - b.oppositeY);

    // Centre the handle assignments: if fewer edges than handles, offset so
    // they're centred rather than starting from the top. E.g. 1 edge → index 2
    // (50%), 2 edges → indices 1,3 (30%,70%), 3 edges → indices 1,2,3.
    const startIdx = Math.max(0, Math.floor((handles.length - group.length) / 2));

    for (let slot = 0; slot < group.length; slot++) {
      const entry = group[slot]!;
      const handleIdx = (startIdx + slot) % handles.length;
      const handleId = handles[handleIdx]!;

      if (role === 'src') {
        srcHandles.set(entry.edgeIdx, { handleId, slotIndex: slot });
      } else {
        tgtHandles.set(entry.edgeIdx, { handleId, slotIndex: slot });
      }
    }
  }

  // ── Phase 3: build edge objects with assigned handles ─────────────────
  return edgeInfos.map((info, i) => {
    const srcH = srcHandles.get(i);
    const tgtH = tgtHandles.get(i);
    const sourceHandle = srcH?.handleId;
    const targetHandle = tgtH ? `${tgtH.handleId}-t` : undefined;
    const slotIndex = srcH?.slotIndex ?? 0;
    const stepOffset = SLOT_OFFSETS[slotIndex % SLOT_OFFSETS.length]!;
    const edgeType = getEdgeType(info.rel.archimate_type);

    return {
      id: info.rel.id,
      type: edgeType,
      source: info.rel.source_id,
      target: info.rel.target_id,
      sourceHandle,
      targetHandle,
      reconnectable: true,
      data: {
        relationshipType: info.rel.archimate_type,
        label: info.rel.label ?? undefined,
        specialisation: info.rel.specialisation,
        stepOffset,
        theme,
        ...(edgeType === 'uml-edge' ? { edgeType: info.rel.archimate_type } : {}),
        ...(edgeType === 'sequence-message' ? {
          messageType: info.rel.archimate_type.replace('uml-', '').replace('-message', '') as string,
          sequenceNumber: (info.rel.properties as Record<string, unknown>)?.sequenceNumber as number | undefined,
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
