/**
 * UML Use Case Diagram layout algorithm.
 *
 * Produces a proper UCD layout:
 * - Actors on the left (and optionally right) of a system boundary
 * - Use cases arranged vertically inside the boundary
 * - System boundary rectangle returned as metadata for rendering
 */
import type { Element, Relationship } from '../model/types';

// ═══════════════════════════════════════
// Layout constants
// ═══════════════════════════════════════

const UC_WIDTH = 140;
const UC_HEIGHT = 50;
const UC_SPACING_Y = 30;
const UC_PAD_X = 60;
const UC_PAD_Y_TOP = 50;   // top padding inside boundary (room for title)
const UC_PAD_Y_BOTTOM = 30;
const ACTOR_WIDTH = 60;
const ACTOR_HEIGHT = 100;
const BOUNDARY_GAP = 100;  // gap between boundary edge and actors
const MAX_UC_PER_COL = 8;

export interface UcdBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UcdLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  boundary: UcdBoundary;
}

/**
 * Compute Use Case Diagram layout.
 *
 * Separates actors from use cases, places use cases in a vertical column
 * (or two columns if many) inside a system boundary, and positions actors
 * outside the boundary on the left and/or right.
 */
export function computeUcdLayout(
  elements: Element[],
  relationships: Relationship[],
): UcdLayoutResult {
  const positions = new Map<string, { x: number; y: number }>();

  const actors = elements.filter(e => e.archimate_type === 'uml-actor');
  const useCases = elements.filter(e => e.archimate_type === 'uml-use-case');

  // If no use cases, fall back to simple vertical list
  if (useCases.length === 0) {
    for (let i = 0; i < actors.length; i++) {
      positions.set(actors[i]!.id, { x: 40, y: 40 + i * (ACTOR_HEIGHT + 40) });
    }
    return { positions, boundary: { x: 0, y: 0, width: 0, height: 0 } };
  }

  // ── Determine column layout for use cases ──────────────────────────────
  const numCols = useCases.length > MAX_UC_PER_COL ? 2 : 1;
  const ucPerCol = Math.ceil(useCases.length / numCols);

  // ── System boundary dimensions ─────────────────────────────────────────
  const boundaryW = numCols * (UC_WIDTH + UC_PAD_X) + UC_PAD_X;
  const boundaryH = UC_PAD_Y_TOP + ucPerCol * (UC_HEIGHT + UC_SPACING_Y) - UC_SPACING_Y + UC_PAD_Y_BOTTOM;

  // ── Partition actors: left vs right ────────────────────────────────────
  // Build connectivity: for each actor, count connections to use cases
  // in the first half vs second half of the use case list.
  // Simple heuristic: if <= 3 actors, all go left.
  // Otherwise, split to minimise edge crossings.
  let leftActors: Element[];
  let rightActors: Element[];

  if (actors.length <= 3) {
    leftActors = actors;
    rightActors = [];
  } else {
    // Build a set of use case IDs in first and second half
    const midpoint = Math.ceil(useCases.length / 2);
    const firstHalfIds = new Set(useCases.slice(0, midpoint).map(uc => uc.id));
    const secondHalfIds = new Set(useCases.slice(midpoint).map(uc => uc.id));

    leftActors = [];
    rightActors = [];

    for (const actor of actors) {
      let firstHalfCount = 0;
      let secondHalfCount = 0;
      for (const rel of relationships) {
        const otherId = rel.source_id === actor.id ? rel.target_id
          : rel.target_id === actor.id ? rel.source_id : null;
        if (!otherId) continue;
        if (firstHalfIds.has(otherId)) firstHalfCount++;
        if (secondHalfIds.has(otherId)) secondHalfCount++;
      }
      // Put actors with more second-half connections on the right
      if (secondHalfCount > firstHalfCount && rightActors.length < Math.floor(actors.length / 2)) {
        rightActors.push(actor);
      } else {
        leftActors.push(actor);
      }
    }

    // Ensure at least one actor on each side if we split
    if (rightActors.length === 0 && leftActors.length > 1) {
      rightActors.push(leftActors.pop()!);
    }
  }

  // ── Compute boundary position ──────────────────────────────────────────
  const leftActorSpace = leftActors.length > 0 ? ACTOR_WIDTH + BOUNDARY_GAP : 40;
  const boundaryX = leftActorSpace + 20;
  const boundaryY = 20;

  // ── Position use cases inside boundary ─────────────────────────────────
  for (let i = 0; i < useCases.length; i++) {
    const col = Math.floor(i / ucPerCol);
    const row = i % ucPerCol;
    positions.set(useCases[i]!.id, {
      x: boundaryX + UC_PAD_X + col * (UC_WIDTH + UC_PAD_X),
      y: boundaryY + UC_PAD_Y_TOP + row * (UC_HEIGHT + UC_SPACING_Y),
    });
  }

  // ── Position left actors ───────────────────────────────────────────────
  // Centre vertically relative to boundary
  const leftActorTotalH = leftActors.length * ACTOR_HEIGHT + (leftActors.length - 1) * 40;
  const leftActorStartY = boundaryY + Math.max(0, (boundaryH - leftActorTotalH) / 2);
  for (let i = 0; i < leftActors.length; i++) {
    positions.set(leftActors[i]!.id, {
      x: 20,
      y: leftActorStartY + i * (ACTOR_HEIGHT + 40),
    });
  }

  // ── Position right actors ──────────────────────────────────────────────
  if (rightActors.length > 0) {
    const rightX = boundaryX + boundaryW + BOUNDARY_GAP;
    const rightActorTotalH = rightActors.length * ACTOR_HEIGHT + (rightActors.length - 1) * 40;
    const rightActorStartY = boundaryY + Math.max(0, (boundaryH - rightActorTotalH) / 2);
    for (let i = 0; i < rightActors.length; i++) {
      positions.set(rightActors[i]!.id, {
        x: rightX,
        y: rightActorStartY + i * (ACTOR_HEIGHT + 40),
      });
    }
  }

  return {
    positions,
    boundary: { x: boundaryX, y: boundaryY, width: boundaryW, height: boundaryH },
  };
}
