/**
 * Connection port system for clean edge routing.
 * Each element exposes discrete anchor points around its perimeter (~10px spacing).
 * Edges are assigned to distinct ports so no two edges share the same attachment point.
 *
 * Port selection is direction-aware: an edge going right prefers right-face ports,
 * an edge going down prefers bottom-face ports, etc. This prevents the common failure
 * mode where a long horizontal edge gets assigned a bottom port because shorter vertical
 * edges claimed all the right-side ports first.
 */

// Bonus applied to ports on the directionally-correct face (reduces effective distance).
// 40px is large enough to override typical geometric accidents but not so large that
// it forces obviously wrong ports in ambiguous diagonal cases.
const SIDE_BONUS = 40;

// Edges whose dominant-axis displacement is > this multiple of minor-axis displacement
// are treated as "axis-aligned dominant" and sorted earlier so they get preferred-side
// ports before shorter off-axis edges claim them.
const AXIS_DOMINANCE_THRESHOLD = 1.5;
const DOMINANT_AXIS_DISCOUNT = 0.3;

export interface ConnectionPort {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  index: number;
}

export interface ElementBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Generate evenly-spaced ports around an element's bounding box.
 */
export function generatePorts(
  x: number, y: number, w: number, h: number, spacing = 10,
): ConnectionPort[] {
  const ports: ConnectionPort[] = [];

  // Top side: left to right
  const topCount = Math.max(1, Math.floor(w / spacing));
  const topStep = w / (topCount + 1);
  for (let i = 0; i < topCount; i++) {
    ports.push({ x: x + topStep * (i + 1), y, side: 'top', index: i });
  }

  // Right side: top to bottom
  const rightCount = Math.max(1, Math.floor(h / spacing));
  const rightStep = h / (rightCount + 1);
  for (let i = 0; i < rightCount; i++) {
    ports.push({ x: x + w, y: y + rightStep * (i + 1), side: 'right', index: i });
  }

  // Bottom side: left to right
  const bottomCount = Math.max(1, Math.floor(w / spacing));
  const bottomStep = w / (bottomCount + 1);
  for (let i = 0; i < bottomCount; i++) {
    ports.push({ x: x + bottomStep * (i + 1), y: y + h, side: 'bottom', index: i });
  }

  // Left side: top to bottom
  const leftCount = Math.max(1, Math.floor(h / spacing));
  const leftStep = h / (leftCount + 1);
  for (let i = 0; i < leftCount; i++) {
    ports.push({ x, y: y + leftStep * (i + 1), side: 'left', index: i });
  }

  return ports;
}

/**
 * Assign each edge endpoint to the best available port on its source/target elements.
 * Direction-dominant edges (primarily horizontal or vertical) get earlier sort priority
 * so they claim preferred-side ports before shorter off-axis edges take them.
 * No two edges share the same port on an element.
 */
export function assignPorts(
  edges: ReadonlyArray<{ id: string; sourceId: string; targetId: string }>,
  elements: Map<string, ElementBox>,
): Map<string, { sx1: number; sy1: number; sx2: number; sy2: number }> {
  const result = new Map<string, { sx1: number; sy1: number; sx2: number; sy2: number }>();

  // Pre-generate ports for every element
  const portCache = new Map<string, ConnectionPort[]>();
  for (const [id, box] of elements) {
    portCache.set(id, generatePorts(box.x, box.y, box.w, box.h));
  }

  // Track claimed ports per element: Set of "side:index"
  const claimed = new Map<string, Set<string>>();
  for (const id of elements.keys()) {
    claimed.set(id, new Set());
  }

  // Sort edges: axis-dominant edges get priority so their preferred-face ports stay free.
  // Within each group, shorter edges still get priority (they are more constrained).
  const sorted = [...edges].sort((a, b) => {
    const sa = elements.get(a.sourceId);
    const ta = elements.get(a.targetId);
    const sb = elements.get(b.sourceId);
    const tb = elements.get(b.targetId);
    if (!sa || !ta || !sb || !tb) return 0;

    const effectiveDist = (s: ElementBox, t: ElementBox): number => {
      const cx1 = s.x + s.w / 2; const cy1 = s.y + s.h / 2;
      const cx2 = t.x + t.w / 2; const cy2 = t.y + t.h / 2;
      const adx = Math.abs(cx2 - cx1); const ady = Math.abs(cy2 - cy1);
      const raw = Math.sqrt(adx * adx + ady * ady);
      const dominance = Math.max(adx, ady) / (Math.min(adx, ady) + 1);
      return dominance > AXIS_DOMINANCE_THRESHOLD
        ? raw - Math.max(adx, ady) * DOMINANT_AXIS_DISCOUNT
        : raw;
    };

    return effectiveDist(sa, ta) - effectiveDist(sb, tb);
  });

  for (const edge of sorted) {
    const srcBox = elements.get(edge.sourceId);
    const tgtBox = elements.get(edge.targetId);
    if (!srcBox || !tgtBox) continue;

    const srcPorts = portCache.get(edge.sourceId);
    const tgtPorts = portCache.get(edge.targetId);
    if (!srcPorts || !tgtPorts) continue;

    const srcClaimed = claimed.get(edge.sourceId)!;
    const tgtClaimed = claimed.get(edge.targetId)!;

    // Target centre
    const tcx = tgtBox.x + tgtBox.w / 2;
    const tcy = tgtBox.y + tgtBox.h / 2;
    // Source centre
    const scx = srcBox.x + srcBox.w / 2;
    const scy = srcBox.y + srcBox.h / 2;

    // Derive preferred face for each endpoint based on relative direction
    const dx = tcx - scx; const dy = tcy - scy;
    const srcPreferred: ConnectionPort['side'] =
      Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top');
    const tgtPreferred: ConnectionPort['side'] =
      Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'left' : 'right') : (dy >= 0 ? 'top' : 'bottom');

    const srcPort = pickBestPort(srcPorts, srcClaimed, tcx, tcy, srcPreferred);
    const tgtPort = pickBestPort(tgtPorts, tgtClaimed, scx, scy, tgtPreferred);

    if (srcPort && tgtPort) {
      srcClaimed.add(portKey(srcPort));
      tgtClaimed.add(portKey(tgtPort));
      result.set(edge.id, {
        sx1: srcPort.x, sy1: srcPort.y,
        sx2: tgtPort.x, sy2: tgtPort.y,
      });
    } else {
      // Fallback: centre-to-centre
      result.set(edge.id, { sx1: scx, sy1: scy, sx2: tcx, sy2: tcy });
    }
  }

  return result;
}

function portKey(port: ConnectionPort): string {
  return `${port.side}:${port.index}`;
}

function pickBestPort(
  ports: ConnectionPort[],
  claimed: Set<string>,
  targetX: number,
  targetY: number,
  preferredSide: ConnectionPort['side'] | null = null,
): ConnectionPort | null {
  let best: ConnectionPort | null = null;
  let bestScore = Infinity;

  for (const port of ports) {
    if (claimed.has(portKey(port))) continue;
    const raw = dist(port.x, port.y, targetX, targetY);
    // Apply bonus for the directionally correct face
    const score = preferredSide !== null && port.side === preferredSide ? raw - SIDE_BONUS : raw;
    if (score < bestScore) {
      bestScore = score;
      best = port;
    }
  }

  return best;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
