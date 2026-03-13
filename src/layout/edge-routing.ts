/**
 * Obstacle-avoiding orthogonal edge routing using A* on a sparse grid.
 *
 * Edges route around node bounding boxes rather than through them.
 * The grid is built from node boundary x/y values plus endpoint coordinates.
 * A* with a bend penalty finds short, low-bend paths through clear corridors.
 *
 * Performance design:
 *  - MinHeap open set: O(N log N) per route instead of O(N²) linear scan
 *  - Integer node keys: xi * stride + yi — eliminates string allocation per node
 *  - Index maps built once per computeOrthogonalRoutes call, shared across edges
 *  - TubeIndex: Map<corridorKey, ranges[]> for O(1) corridor lookup vs O(tubes) scan
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
  parent: number;  // integer key of parent node; -1 for start node
  lastDir: 'h' | 'v' | null;
}

/**
 * Indexed tube map for soft-obstacle lookups.
 * Key: 'h:Y' for horizontal corridors, 'v:X' for vertical corridors.
 * Value: array of [min, max] ranges along the corridor axis.
 * Allows O(corridorEdges) lookup instead of O(allTubes) linear scan.
 */
type TubeRange = [number, number];
type TubeIndex = Map<string, TubeRange[]>;

// ─── Min-heap ─────────────────────────────────────────────────────────────────

/**
 * Binary min-heap over [priority, intKey] pairs.
 * Uses lazy deletion: stale entries (superseded by a better path) remain in the
 * heap but are skipped when popped (caller checks against closed set / openG map).
 */
class MinHeap {
  private heap: [number, number][] = [];

  get size(): number { return this.heap.length; }

  push(priority: number, key: number): void {
    this.heap.push([priority, key]);
    this._up(this.heap.length - 1);
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0]![1];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) { this.heap[0] = last; this._down(0); }
    return top;
  }

  private _up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p]![0] <= this.heap[i]![0]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i]!, this.heap[p]!];
      i = p;
    }
  }

  private _down(i: number): void {
    const n = this.heap.length;
    for (;;) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l]![0] < this.heap[s]![0]) s = l;
      if (r < n && this.heap[r]![0] < this.heap[s]![0]) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i]!, this.heap[s]!];
      i = s;
    }
  }
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
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    return y1 > t && y1 < b && xMax > l && xMin < r;
  } else {
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

// ─── Tube-index helpers ────────────────────────────────────────────────────────

/** Add routed path segments to a tube index for subsequent sharing-cost lookups. */
function addToTubeIndex(pts: { x: number; y: number }[], idx: TubeIndex): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]!, p2 = pts[i + 1]!;
    if (Math.abs(p1.y - p2.y) < 0.5) {
      const key = `h:${Math.round(p1.y)}`;
      const arr = idx.get(key) ?? [];
      arr.push([Math.min(p1.x, p2.x), Math.max(p1.x, p2.x)]);
      idx.set(key, arr);
    } else if (Math.abs(p1.x - p2.x) < 0.5) {
      const key = `v:${Math.round(p1.x)}`;
      const arr = idx.get(key) ?? [];
      arr.push([Math.min(p1.y, p2.y), Math.max(p1.y, p2.y)]);
      idx.set(key, arr);
    }
  }
}

/**
 * True if the axis-aligned segment (cx,cy)→(nx,ny) shares a corridor with any
 * recorded tube. Uses the index for O(corridorCount) lookup, not O(totalTubes).
 */
function overlapsIndexedTube(
  cx: number, cy: number, nx: number, ny: number,
  idx: TubeIndex,
): boolean {
  if (Math.abs(ny - cy) < 0.5) {
    const ranges = idx.get(`h:${Math.round(cy)}`);
    if (!ranges) return false;
    const sMin = Math.min(cx, nx), sMax = Math.max(cx, nx);
    for (const [tMin, tMax] of ranges) {
      if (sMax > tMin && sMin < tMax) return true;
    }
  } else {
    const ranges = idx.get(`v:${Math.round(cx)}`);
    if (!ranges) return false;
    const sMin = Math.min(cy, ny), sMax = Math.max(cy, ny);
    for (const [tMin, tMax] of ranges) {
      if (sMax > tMin && sMin < tMax) return true;
    }
  }
  return false;
}

/** Corridor key for nudge grouping — null for diagonal/zero-length segments. */
function corridorKey(pt1: { x: number; y: number }, pt2: { x: number; y: number }): string | null {
  if (Math.abs(pt1.y - pt2.y) < 0.5) {
    if (Math.abs(pt2.x - pt1.x) < 1) return null;
    return `h:${Math.round(pt1.y)}`;
  }
  if (Math.abs(pt1.x - pt2.x) < 0.5) {
    if (Math.abs(pt2.y - pt1.y) < 1) return null;
    return `v:${Math.round(pt1.x)}`;
  }
  return null; // diagonal
}

// ─── A* routing ───────────────────────────────────────────────────────────────

/** Map a port face to the required first-step direction (away from the node). */
function sideToDir(side: PortSide): 'h' | 'v' {
  return side === 'left' || side === 'right' ? 'h' : 'v';
}

/**
 * A* search on a sparse orthogonal grid.
 *
 * Performance characteristics:
 *  - Integer node keys: nxi * stride + nyi (no string allocation per node)
 *  - MinHeap open set: O(log N) push/pop instead of O(N) linear scan
 *  - Lazy deletion: stale heap entries skipped via closed-set check
 *  - xiMap/yiMap passed in — built once per computeOrthogonalRoutes, not per edge
 *  - TubeIndex: O(1) corridor lookup for sharing cost
 */
function aStarRoute(
  sx: number, sy: number,
  tx: number, ty: number,
  rects: Rect[],
  allXs: number[],
  allYs: number[],
  xiMap: Map<number, number>,
  yiMap: Map<number, number>,
  srcSide?: PortSide,
  tgtSide?: PortSide,
  tubeIdx: TubeIndex = new Map(),
): { x: number; y: number }[] {
  const sxi = xiMap.get(sx);
  const syi = yiMap.get(sy);
  const txi = xiMap.get(tx);
  const tyi = yiMap.get(ty);

  if (sxi === undefined || syi === undefined || txi === undefined || tyi === undefined) {
    return [{ x: sx, y: sy }, { x: tx, y: ty }];
  }

  const stride = allYs.length;
  const startKey = sxi * stride + syi;
  const endKey = txi * stride + tyi;
  if (startKey === endKey) return [{ x: sx, y: sy }];

  const heuristic = (xi: number, yi: number) =>
    Math.abs(allXs[xi]! - tx) + Math.abs(allYs[yi]! - ty);

  // info: integer key → node data (g cost, parent key, direction)
  const info = new Map<number, ANode>();
  // openG: key → best g cost currently in the open set (for lazy-deletion pruning)
  const openG = new Map<number, number>();
  const closed = new Set<number>();
  const heap = new MinHeap();

  info.set(startKey, { xi: sxi, yi: syi, g: 0, parent: -1, lastDir: null });
  openG.set(startKey, 0);
  heap.push(heuristic(sxi, syi), startKey);

  while (heap.size > 0) {
    const bestKey = heap.pop()!;
    // Lazy deletion: skip if already closed (a better path was found later)
    if (closed.has(bestKey)) continue;
    closed.add(bestKey);
    openG.delete(bestKey);

    if (bestKey === endKey) {
      return reconstructPath(info, endKey, allXs, allYs);
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
      const nKey = nxi * stride + nyi;
      if (closed.has(nKey)) continue;

      if (isStart && srcSide && dir !== sideToDir(srcSide)) continue;
      if (isPreEnd && tgtSide && nxi === txi && nyi === tyi && dir !== sideToDir(tgtSide)) continue;

      const nx = allXs[nxi]!;
      const ny = allYs[nyi]!;

      if (!isSegmentClear(cx, cy, nx, ny, rects)) continue;

      const segLen = Math.abs(nx - cx) + Math.abs(ny - cy);
      const bendCost = (curr.lastDir !== null && curr.lastDir !== dir) ? BEND_PENALTY : 0;
      const sharingCost = overlapsIndexedTube(cx, cy, nx, ny, tubeIdx) ? SHARING_PENALTY : 0;
      const g = curr.g + segLen + bendCost + sharingCost;

      // Prune: only update if this path is strictly better than what's in open set
      if (g >= (openG.get(nKey) ?? Infinity)) continue;

      info.set(nKey, { xi: nxi, yi: nyi, g, parent: bestKey, lastDir: dir });
      openG.set(nKey, g);
      // Push to heap (lazy deletion handles any stale entry for nKey already in heap)
      heap.push(g + heuristic(nxi, nyi), nKey);
    }
  }

  // No path found — straight line fallback
  return [{ x: sx, y: sy }, { x: tx, y: ty }];
}

function reconstructPath(
  info: Map<number, ANode>,
  endKey: number,
  allXs: number[],
  allYs: number[],
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let key = endKey;
  while (key !== -1) {
    const node = info.get(key)!;
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

  // Build index maps once — shared across all aStarRoute calls (not per-edge)
  const xiMap = new Map<number, number>(allXs.map((x, i) => [x, i]));
  const yiMap = new Map<number, number>(allYs.map((y, i) => [y, i]));

  // Sequential routing: shortest edges first (fewest alternatives → route first so
  // they claim clean corridors; longer edges find paths around them).
  // Deterministic tie-break by id prevents non-deterministic re-routing on re-render.
  const sortedEdges = [...edges].sort((a, b) => {
    const dA = Math.abs(a.sx2 - a.sx1) + Math.abs(a.sy2 - a.sy1);
    const dB = Math.abs(b.sx2 - b.sx1) + Math.abs(b.sy2 - b.sy1);
    if (Math.abs(dA - dB) < 1) return a.id < b.id ? -1 : 1;
    return dA - dB;
  });

  const tubeIdx: TubeIndex = new Map();

  for (const edge of sortedEdges) {
    const rects = expandedRects.filter(r => r.id !== edge.sourceId && r.id !== edge.targetId);
    const pts = aStarRoute(
      edge.sx1, edge.sy1, edge.sx2, edge.sy2,
      rects, allXs, allYs,
      xiMap, yiMap,
      edge.srcSide, edge.tgtSide,
      tubeIdx,
    );
    result.set(edge.id, { path: buildPath(pts), pts });
    // Record segments so subsequent edges treat them as soft obstacles
    addToTubeIndex(pts, tubeIdx);
  }

  // Nudge post-pass: separate parallel edges in the same corridor
  nudgeParallelSegments(result);

  return result;
}

/**
 * After all edges are routed, find segments that share the same corridor
 * (collinear, same fixed coordinate) and nudge them perpendicularly so they
 * are visually separated by NUDGE_SPACING px per edge.
 */
function nudgeParallelSegments(routedEdges: Map<string, RoutedEdge>): void {
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

  // Per-edge per-point nudge adjustments: "edgeId:ptIdx" → {dx, dy}
  const nudges = new Map<string, { dx: number; dy: number }>();

  for (const [key, refs] of corridors) {
    if (refs.length <= 1) continue;

    const isH = key.startsWith('h:');
    refs.sort((a, b) => a.srcX - b.srcX || (a.edgeId < b.edgeId ? -1 : 1));

    const count = refs.length;
    for (let i = 0; i < count; i++) {
      const rank = i - Math.floor(count / 2);
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

  // Collect affected edge IDs and apply nudges
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
