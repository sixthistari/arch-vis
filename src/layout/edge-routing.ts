/**
 * Obstacle-avoiding orthogonal edge routing using A* on a sparse grid.
 *
 * Edges route around node bounding boxes rather than through them.
 * The grid is built from node boundary x/y values plus endpoint coordinates.
 * A* with a bend penalty finds short, low-bend paths through clear corridors.
 */

const MARGIN = 12;          // px clearance added to each side of every node
const CORNER_RADIUS = 4;    // SVG rounded-corner radius
const BEND_PENALTY = 120;   // extra cost per direction change (prefer fewer turns)
const SHARING_PENALTY = 60; // extra cost per step through an already-routed corridor
const NUDGE_SPACING = 5;    // px between parallel edges nudged in same corridor

// ─── Public types ─────────────────────────────────────────────────────────────

export type PortSide = 'left' | 'right' | 'top' | 'bottom';

export interface RouteEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sx1: number; sy1: number;   // source port (on source node boundary)
  sx2: number; sy2: number;   // target port (on target node boundary)
  srcSide?: PortSide;         // which face the source port is on
  tgtSide?: PortSide;         // which face the target port is on
}

export interface RouteElement {
  id: string;
  sx: number; sy: number;
  width: number; height: number;
  scale: number;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface Rect { id: string; l: number; t: number; r: number; b: number; }

interface ANode {
  xi: number; yi: number;
  g: number;
  parent: string | null;
  lastDir: 'h' | 'v' | null;
}

/** An already-routed segment recorded as a soft obstacle for subsequent edges. */
interface SegmentTube {
  x1: number; y1: number; x2: number; y2: number;
}

// ─── Obstacle helpers ─────────────────────────────────────────────────────────

/** Expand element bounds by MARGIN on each side. */
function expandRect(el: RouteElement): Rect {
  const w = el.width * el.scale;
  const h = el.height * el.scale;
  return {
    id: el.id,
    l: el.sx - MARGIN,
    t: el.sy - MARGIN,
    r: el.sx + w + MARGIN,
    b: el.sy + h + MARGIN,
  };
}

/**
 * True if an axis-aligned segment (x1,y1)→(x2,y2) strictly passes through
 * the interior of rect (touching the boundary is allowed — that's the corridor).
 */
function segmentHitsRect(
  x1: number, y1: number, x2: number, y2: number,
  rect: Rect,
): boolean {
  const { l, t, r, b } = rect;
  if (Math.abs(y1 - y2) < 0.1) {
    // Horizontal segment
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    return y1 > t && y1 < b && xMax > l && xMin < r;
  } else {
    // Vertical segment
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    return x1 > l && x1 < r && yMax > t && yMin < b;
  }
}

function isSegmentClear(
  x1: number, y1: number, x2: number, y2: number,
  rects: Rect[],
): boolean {
  for (const rect of rects) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

// ─── Soft-obstacle helpers ────────────────────────────────────────────────────

/** Record the segments of a routed path as soft-obstacle tubes. */
function recordSegments(pts: { x: number; y: number }[], tubes: SegmentTube[]): void {
  for (let i = 0; i < pts.length - 1; i++) {
    tubes.push({ x1: pts[i]!.x, y1: pts[i]!.y, x2: pts[i + 1]!.x, y2: pts[i + 1]!.y });
  }
}

/**
 * True if the axis-aligned segment (cx,cy)→(nx,ny) shares a corridor with any tube.
 * "Shares" means collinear (same axis, same fixed coord) with overlapping range.
 */
function segmentOverlapsTube(
  cx: number, cy: number, nx: number, ny: number,
  tubes: SegmentTube[],
): boolean {
  const segIsH = Math.abs(ny - cy) < 0.5;
  for (const t of tubes) {
    const tubeIsH = Math.abs(t.y2 - t.y1) < 0.5;
    if (segIsH !== tubeIsH) continue;
    if (segIsH) {
      if (Math.abs(cy - t.y1) > 0.5) continue;
      const sMin = Math.min(cx, nx); const sMax = Math.max(cx, nx);
      const tMin = Math.min(t.x1, t.x2); const tMax = Math.max(t.x1, t.x2);
      if (sMax > tMin && sMin < tMax) return true;
    } else {
      if (Math.abs(cx - t.x1) > 0.5) continue;
      const sMin = Math.min(cy, ny); const sMax = Math.max(cy, ny);
      const tMin = Math.min(t.y1, t.y2); const tMax = Math.max(t.y1, t.y2);
      if (sMax > tMin && sMin < tMax) return true;
    }
  }
  return false;
}

/** Corridor key for nudge grouping — null for diagonal/zero-length segments. */
function corridorKey(pt1: { x: number; y: number }, pt2: { x: number; y: number }): string | null {
  if (Math.abs(pt1.y - pt2.y) < 0.5) {
    const xLen = Math.abs(pt2.x - pt1.x);
    if (xLen < 1) return null;
    return `h:${Math.round(pt1.y)}`;
  }
  if (Math.abs(pt1.x - pt2.x) < 0.5) {
    const yLen = Math.abs(pt2.y - pt1.y);
    if (yLen < 1) return null;
    return `v:${Math.round(pt1.x)}`;
  }
  return null; // diagonal
}

// ─── A* routing ───────────────────────────────────────────────────────────────

/**
 * A* search on a sparse orthogonal grid.
 *
 * allXs and allYs are sorted arrays of candidate x/y coordinates
 * derived from node boundaries and edge endpoints.
 * rects are the expanded obstacle rectangles (source/target node excluded).
 */
/** Map a port face to the required first-step direction (away from the node). */
function sideToDir(side: PortSide): 'h' | 'v' {
  return side === 'left' || side === 'right' ? 'h' : 'v';
}

function aStarRoute(
  sx: number, sy: number,
  tx: number, ty: number,
  rects: Rect[],
  allXs: number[],
  allYs: number[],
  srcSide?: PortSide,
  tgtSide?: PortSide,
  tubes: SegmentTube[] = [],
): { x: number; y: number }[] {
  // Build index maps
  const xiMap = new Map<number, number>(allXs.map((x, i) => [x, i]));
  const yiMap = new Map<number, number>(allYs.map((y, i) => [y, i]));

  const sxi = xiMap.get(sx);
  const syi = yiMap.get(sy);
  const txi = xiMap.get(tx);
  const tyi = yiMap.get(ty);

  // Fallback if any coordinate is not in the grid
  if (sxi === undefined || syi === undefined || txi === undefined || tyi === undefined) {
    return [{ x: sx, y: sy }, { x: tx, y: ty }];
  }

  const startKey = `${sxi},${syi}`;
  const endKey = `${txi},${tyi}`;
  if (startKey === endKey) return [{ x: sx, y: sy }];

  const heuristic = (xi: number, yi: number) =>
    Math.abs(allXs[xi]! - tx) + Math.abs(allYs[yi]! - ty);

  // node data keyed by grid coordinate string
  const info = new Map<string, ANode>();
  // open set: key → f score
  const openF = new Map<string, number>();
  const closed = new Set<string>();

  const startNode: ANode = { xi: sxi, yi: syi, g: 0, parent: null, lastDir: null };
  info.set(startKey, startNode);
  openF.set(startKey, heuristic(sxi, syi));

  while (openF.size > 0) {
    // Pop lowest-f node
    let bestKey = '';
    let bestF = Infinity;
    for (const [k, f] of openF) {
      if (f < bestF) { bestF = f; bestKey = k; }
    }
    openF.delete(bestKey);
    closed.add(bestKey);

    if (bestKey === endKey) {
      // Reconstruct and return path
      return reconstructPath(info, bestKey, allXs, allYs);
    }

    const curr = info.get(bestKey)!;
    const cx = allXs[curr.xi]!;
    const cy = allYs[curr.yi]!;

    const neighbors: ['h' | 'v', number, number][] = [
      ['h', curr.xi + 1, curr.yi],
      ['h', curr.xi - 1, curr.yi],
      ['v', curr.xi, curr.yi + 1],
      ['v', curr.xi, curr.yi - 1],
    ];

    const isStart = bestKey === startKey;
    const isPreEnd = tgtSide !== undefined && (
      (sideToDir(tgtSide) === 'h' && curr.yi === tyi) ||
      (sideToDir(tgtSide) === 'v' && curr.xi === txi)
    );

    for (const [dir, nxi, nyi] of neighbors) {
      if (nxi < 0 || nxi >= allXs.length || nyi < 0 || nyi >= allYs.length) continue;
      const nKey = `${nxi},${nyi}`;
      if (closed.has(nKey)) continue;

      // Force the first step to exit in the departure direction (away from source face)
      if (isStart && srcSide && dir !== sideToDir(srcSide)) continue;
      // Force the last approach to arrive in the arrival direction (into target face)
      if (isPreEnd && tgtSide && nxi === txi && nyi === tyi && dir !== sideToDir(tgtSide)) continue;

      const nx = allXs[nxi]!;
      const ny = allYs[nyi]!;

      if (!isSegmentClear(cx, cy, nx, ny, rects)) continue;

      const segLen = Math.abs(nx - cx) + Math.abs(ny - cy);
      const bendCost = (curr.lastDir !== null && curr.lastDir !== dir) ? BEND_PENALTY : 0;
      const sharingCost = segmentOverlapsTube(cx, cy, nx, ny, tubes) ? SHARING_PENALTY : 0;
      const g = curr.g + segLen + bendCost + sharingCost;
      const existing = info.get(nKey);
      if (existing && existing.g <= g) continue;

      info.set(nKey, { xi: nxi, yi: nyi, g, parent: bestKey, lastDir: dir });
      openF.set(nKey, g + heuristic(nxi, nyi));
    }
  }

  // No path found — straight line fallback
  return [{ x: sx, y: sy }, { x: tx, y: ty }];
}

function reconstructPath(
  info: Map<string, ANode>,
  endKey: string,
  allXs: number[],
  allYs: number[],
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let key: string | null = endKey;
  while (key) {
    const node: ANode = info.get(key)!;
    pts.unshift({ x: allXs[node.xi]!, y: allYs[node.yi]! });
    key = node.parent;
  }
  return collinearSimplify(pts);
}

/** Remove collinear waypoints (3 points on same line → keep only endpoints). */
function collinearSimplify(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  const result = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = result[result.length - 1]!;
    const curr = pts[i]!;
    const next = pts[i + 1]!;
    // Cross product — if zero, three points are collinear
    const cross = (curr.x - prev.x) * (next.y - prev.y) - (curr.y - prev.y) * (next.x - prev.x);
    if (Math.abs(cross) > 0.1) result.push(curr);
  }
  result.push(pts[pts.length - 1]!);
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RoutedEdge {
  path: string;
  pts: { x: number; y: number }[];
}

export function computeOrthogonalRoutes(
  edges: RouteEdge[],
  elements: RouteElement[],
): Map<string, RoutedEdge> {
  const result = new Map<string, RoutedEdge>();
  if (edges.length === 0) return result;

  // Pre-expand all element rects
  const expandedRects = elements.map(expandRect);

  // Build global sparse grid from node boundaries + all edge endpoints
  const xSet = new Set<number>();
  const ySet = new Set<number>();

  for (const rect of expandedRects) {
    xSet.add(rect.l); xSet.add(rect.r);
    ySet.add(rect.t); ySet.add(rect.b);
  }
  for (const e of edges) {
    xSet.add(e.sx1); xSet.add(e.sx2);
    ySet.add(e.sy1); ySet.add(e.sy2);
  }

  const allXs = [...xSet].sort((a, b) => a - b);
  const allYs = [...ySet].sort((a, b) => a - b);

  // ── Phase 2: Sequential routing — shortest edges first (fewest alternatives) ──
  // Edges with shorter Manhattan distance have fewer routing options; route them
  // first so they claim clean corridors. Longer edges find alternatives around them.
  const sortedEdges = [...edges].sort((a, b) => {
    const dA = Math.abs(a.sx2 - a.sx1) + Math.abs(a.sy2 - a.sy1);
    const dB = Math.abs(b.sx2 - b.sx1) + Math.abs(b.sy2 - b.sy1);
    // Secondary: deterministic tie-break by id so results are stable across renders
    if (Math.abs(dA - dB) < 1) return a.id < b.id ? -1 : 1;
    return dA - dB;
  });

  const tubes: SegmentTube[] = [];

  for (const edge of sortedEdges) {
    const rects = expandedRects.filter(r => r.id !== edge.sourceId && r.id !== edge.targetId);
    const pts = aStarRoute(
      edge.sx1, edge.sy1, edge.sx2, edge.sy2,
      rects, allXs, allYs,
      edge.srcSide, edge.tgtSide,
      tubes,
    );
    result.set(edge.id, { path: buildPath(pts), pts });
    // Record this edge's segments so subsequent edges treat them as soft obstacles
    recordSegments(pts, tubes);
  }

  // ── Phase 3: Nudge post-pass — separate parallel edges in shared corridors ──
  nudgeParallelSegments(result);

  return result;
}

/**
 * After all edges are routed, find segments that share the same corridor
 * (collinear, same fixed coordinate) and nudge them perpendicularly so they
 * are visually separated by NUDGE_SPACING px per edge.
 *
 * Only modifies the computed routes; never touches user-set waypoints (those
 * edges are excluded from computeOrthogonalRoutes altogether).
 */
function nudgeParallelSegments(routedEdges: Map<string, RoutedEdge>): void {
  // Collect all segments: corridor-key → list of {edgeId, segIdx, srcX (for sort)}
  type SegRef = { edgeId: string; segIdx: number; srcX: number };
  const corridors = new Map<string, SegRef[]>();

  for (const [edgeId, routed] of routedEdges) {
    const pts = routed.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const key = corridorKey(pts[i]!, pts[i + 1]!);
      if (!key) continue;
      const refs = corridors.get(key) ?? [];
      refs.push({ edgeId, segIdx: i, srcX: pts[0]!.x });
      corridors.set(key, refs);
    }
  }

  // Collect per-edge per-point nudge adjustments
  // Key: "edgeId:ptIdx" → { dx, dy }
  const nudges = new Map<string, { dx: number; dy: number }>();

  for (const [key, refs] of corridors) {
    if (refs.length <= 1) continue;

    const isH = key.startsWith('h:');
    // Sort by source x position for consistent ordering
    refs.sort((a, b) => a.srcX - b.srcX || (a.edgeId < b.edgeId ? -1 : 1));

    const count = refs.length;
    // Centre the offsets around zero: 0, -5, +5, -10, +10, ...
    for (let i = 0; i < count; i++) {
      const half = Math.floor(count / 2);
      const rank = i - half;
      const offset = rank * NUDGE_SPACING;
      if (Math.abs(offset) < 0.1) continue;

      const { edgeId, segIdx } = refs[i]!;
      for (const ptIdx of [segIdx, segIdx + 1]) {
        const k = `${edgeId}:${ptIdx}`;
        const existing = nudges.get(k) ?? { dx: 0, dy: 0 };
        if (isH) existing.dy += offset;
        else      existing.dx += offset;
        nudges.set(k, existing);
      }
    }
  }

  if (nudges.size === 0) return;

  // Apply nudges and rebuild paths
  const affectedEdges = new Set<string>();
  for (const k of nudges.keys()) {
    affectedEdges.add(k.split(':')[0]!);
  }

  for (const edgeId of affectedEdges) {
    const routed = routedEdges.get(edgeId);
    if (!routed) continue;
    const pts = routed.pts.map(p => ({ ...p }));
    for (let i = 0; i < pts.length; i++) {
      const adj = nudges.get(`${edgeId}:${i}`);
      if (!adj) continue;
      pts[i]!.x += adj.dx;
      pts[i]!.y += adj.dy;
    }
    const simplified = collinearSimplify(pts);
    routedEdges.set(edgeId, { path: buildPath(simplified), pts: simplified });
  }
}

// ─── SVG path builder ─────────────────────────────────────────────────────────

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0]!.x},${points[0]!.y} L${points[1]!.x},${points[1]!.y}`;
  }

  let d = `M${points[0]!.x},${points[0]!.y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;
    if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;
    d += ' ' + roundedCorner(curr.x, curr.y, prev.x, prev.y, next.x, next.y, CORNER_RADIUS);
  }

  const last = points[points.length - 1]!;
  d += ` L${last.x},${last.y}`;
  return d;
}

function roundedCorner(
  cx: number, cy: number,
  fromX: number, fromY: number,
  toX: number, toY: number,
  r: number,
): string {
  const dxIn = cx - fromX;
  const dyIn = cy - fromY;
  const dxOut = toX - cx;
  const dyOut = toY - cy;
  const lenIn = Math.sqrt(dxIn * dxIn + dyIn * dyIn);
  const lenOut = Math.sqrt(dxOut * dxOut + dyOut * dyOut);
  const maxR = Math.min(r, lenIn / 2, lenOut / 2);
  if (maxR < 0.5) return `L${cx},${cy}`;

  const t1x = cx - (dxIn / lenIn) * maxR;
  const t1y = cy - (dyIn / lenIn) * maxR;
  const t2x = cx + (dxOut / lenOut) * maxR;
  const t2y = cy + (dyOut / lenOut) * maxR;

  return `L${t1x},${t1y} Q${cx},${cy} ${t2x},${t2y}`;
}
