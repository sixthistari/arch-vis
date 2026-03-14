/**
 * xyflow custom edge for ArchiMate relationships.
 *
 * Selected mode:
 *  - Large endpoint circles at source/target
 *  - Amber waypoint handles (10 px) at each bend — drag to move
 *  - Segment slide handles (↕ / ↔) on non-terminal segments — drag perpendicular
 *  - Ctrl+click anywhere on the path to insert a bend at that position
 */
import React, { memo, useRef, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { getEdgeStyle, type MarkerType } from '../../../notation/edges';
import { WaypointUpdateContext, type Waypoint } from '../context';

// ─── Types ─────────────────────────────────────────────────────────────────

export type LineType = 'straight' | 'bezier' | 'step';

export interface ArchimateEdgeData {
  relationshipType: string;
  label?: string;
  specialisation?: string | null;
  lineType?: LineType;
  stepOffset?: number;
  highlighted?: boolean;
  dimmed?: boolean;
  theme?: 'dark' | 'light';
  routedWaypoints?: { x: number; y: number }[];
  [key: string]: unknown;
}

type ArchimateEdgeType = Edge<ArchimateEdgeData, 'archimate'>;

// ─── Helpers ───────────────────────────────────────────────────────────────

function markerUrl(marker: MarkerType | null): string | undefined {
  return marker ? `url(#marker-${marker})` : undefined;
}

/** Rounded-corner orthogonal polyline (mirrors edge-routing.ts buildPath). */
function buildRoundedPath(pts: { x: number; y: number }[], r = 4): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0]!.x},${pts[0]!.y} L${pts[1]!.x},${pts[1]!.y}`;
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]!; const curr = pts[i]!; const next = pts[i + 1]!;
    if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;
    const dxIn = curr.x - prev.x; const dyIn = curr.y - prev.y;
    const dxOut = next.x - curr.x; const dyOut = next.y - curr.y;
    const lenIn = Math.sqrt(dxIn * dxIn + dyIn * dyIn);
    const lenOut = Math.sqrt(dxOut * dxOut + dyOut * dyOut);
    const maxR = Math.min(r, lenIn / 2, lenOut / 2);
    if (maxR < 0.5) { d += ` L${curr.x},${curr.y}`; continue; }
    const t1x = curr.x - (dxIn / lenIn) * maxR; const t1y = curr.y - (dyIn / lenIn) * maxR;
    const t2x = curr.x + (dxOut / lenOut) * maxR; const t2y = curr.y + (dyOut / lenOut) * maxR;
    d += ` L${t1x},${t1y} Q${curr.x},${curr.y} ${t2x},${t2y}`;
  }
  d += ` L${pts[pts.length - 1]!.x},${pts[pts.length - 1]!.y}`;
  return d;
}

function customPathMidpoint(pathStr: string): { x: number; y: number } | null {
  const re = /[ML]\s*([\d.+-]+)[, ]([\d.+-]+)/g;
  const pts: { x: number; y: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathStr)) !== null) pts.push({ x: parseFloat(m[1]!), y: parseFloat(m[2]!) });
  if (pts.length < 2) return null;
  const mid = Math.floor(pts.length / 2);
  return { x: (pts[mid - 1]!.x + pts[mid]!.x) / 2, y: (pts[mid - 1]!.y + pts[mid]!.y) / 2 };
}

type SegDir = 'h' | 'v' | 'd';
function segDir(p1: { x: number; y: number }, p2: { x: number; y: number }): SegDir {
  if (Math.abs(p2.y - p1.y) < 2) return 'h';
  if (Math.abs(p2.x - p1.x) < 2) return 'v';
  return 'd';
}

/** Index of the segment in pts[] nearest to (px, py). */
function nearestSegIdx(pts: { x: number; y: number }[], px: number, py: number): number {
  let best = 0; let bestD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const { x: x1, y: y1 } = pts[i]!; const { x: x2, y: y2 } = pts[i + 1]!;
    const dx = x2 - x1; const dy = y2 - y1; const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
    const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Closest point on segment pts[i]→pts[i+1] to (px,py). */
function closestOnSeg(pts: { x: number; y: number }[], i: number, px: number, py: number): { x: number; y: number } {
  const { x: x1, y: y1 } = pts[i]!; const { x: x2, y: y2 } = pts[i + 1]!;
  const dx = x2 - x1; const dy = y2 - y1; const len2 = dx * dx + dy * dy;
  if (len2 < 0.001) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

// ─── Styles ────────────────────────────────────────────────────────────────

const endpointHandleStyle: React.CSSProperties = {
  position: 'absolute', width: 12, height: 12, borderRadius: '50%',
  background: '#F59E0B', border: '2px solid #fff',
  transform: 'translate(-50%, -50%)', pointerEvents: 'none',
};

const wpHandleStyle: React.CSSProperties = {
  position: 'absolute', width: 10, height: 10, borderRadius: '50%',
  background: '#F59E0B', border: '2px solid #fff',
  cursor: 'move', pointerEvents: 'all', transform: 'translate(-50%, -50%)',
};

function segHandleStyle(dir: 'h' | 'v'): React.CSSProperties {
  return {
    position: 'absolute',
    width: dir === 'h' ? 18 : 10, height: dir === 'h' ? 10 : 18,
    borderRadius: 4, background: '#1E3A5F', border: '1px solid #60A5FA',
    cursor: dir === 'h' ? 'ns-resize' : 'ew-resize',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, color: '#93C5FD', pointerEvents: 'all', userSelect: 'none',
    transform: 'translate(-50%, -50%)',
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

function ArchimateEdgeComponent(props: EdgeProps<ArchimateEdgeType>) {
  const {
    id, sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    data, selected,
  } = props;

  const updateWaypoints = React.useContext(WaypointUpdateContext);
  const { screenToFlowPosition } = useReactFlow();

  const relType = data?.relationshipType ?? 'association';
  const edgeStyle = getEdgeStyle(relType);
  const dimmed = data?.dimmed ?? false;
  const highlighted = data?.highlighted ?? false;
  const lineType = data?.lineType ?? 'step';
  const stepOffset = data?.stepOffset ?? 20;
  const waypoints = (data?.waypoints as Waypoint[] | undefined) ?? [];
  const routedWaypoints = (data?.routedWaypoints as { x: number; y: number }[] | undefined) ?? [];

  // ── xyflow fallback path ──────────────────────────────────────────────
  let edgePath: string; let labelX: number; let labelY: number;
  switch (lineType) {
    case 'bezier':
      [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
      break;
    case 'step':
      [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 5, offset: stepOffset });
      break;
    default:
      [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  }

  // Active waypoints: user-set takes priority over A*-routed
  const activeWps: { x: number; y: number }[] = waypoints.length > 0 ? waypoints : routedWaypoints;
  const fullPath = [{ x: sourceX, y: sourceY }, ...activeWps, { x: targetX, y: targetY }];

  // Display path
  let displayPath = edgePath;
  if (activeWps.length > 0) {
    displayPath = buildRoundedPath(fullPath);
  } else if (data?.customPath) {
    displayPath = data.customPath as string;
  }

  // Label midpoint
  const midPt = customPathMidpoint(displayPath);
  if (midPt) { labelX = midPt.x; labelY = midPt.y; }

  // ── Visual style ──────────────────────────────────────────────────────
  const isDark = (data?.theme ?? 'dark') === 'dark';
  const strokeColour = selected || highlighted ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const strokeWidth = highlighted && !selected ? edgeStyle.width * 2.0 : edgeStyle.width;
  const opacity = dimmed ? 0.04 : 1;

  // ── Segment slide drag ────────────────────────────────────────────────
  const segDragRef = useRef<{
    segIdx: number; dir: 'h' | 'v';
    startFlow: { x: number; y: number };
    initFull: { x: number; y: number }[];
  } | null>(null);

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segIdx: number) => {
    e.stopPropagation();
    const base = waypoints.length > 0 ? [...waypoints] : [...routedWaypoints];
    const initFull = [{ x: sourceX, y: sourceY }, ...base, { x: targetX, y: targetY }];
    const d = segDir(initFull[segIdx]!, initFull[segIdx + 1]!);
    if (d === 'd') return;
    const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    segDragRef.current = { segIdx, dir: d, startFlow, initFull };

    const onMove = (ev: MouseEvent) => {
      if (!segDragRef.current) return;
      const { segIdx: si, dir: sd, startFlow: sf, initFull: iF } = segDragRef.current;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const next = iF.map(p => ({ ...p }));
      if (sd === 'h') { next[si]!.y += cur.y - sf.y; next[si + 1]!.y += cur.y - sf.y; }
      else             { next[si]!.x += cur.x - sf.x; next[si + 1]!.x += cur.x - sf.x; }
      updateWaypoints?.(id, next.slice(1, -1));
    };
    const onUp = () => { segDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [id, waypoints, routedWaypoints, sourceX, sourceY, targetX, targetY, screenToFlowPosition, updateWaypoints]);

  // ── Waypoint (bend) drag ──────────────────────────────────────────────
  const wpDragRef = useRef<{ idx: number; pts: { x: number; y: number }[] } | null>(null);

  const startWaypointDrag = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const base = waypoints.length > 0 ? [...waypoints] : [...routedWaypoints];
    wpDragRef.current = { idx, pts: base };
    const onMove = (ev: MouseEvent) => {
      if (!wpDragRef.current) return;
      const fp = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const next = [...wpDragRef.current.pts];
      next[wpDragRef.current.idx] = fp;
      wpDragRef.current.pts = next;
      updateWaypoints?.(id, next);
    };
    const onUp = () => { wpDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [id, waypoints, routedWaypoints, screenToFlowPosition, updateWaypoints]);

  // ── Ctrl+click → insert bend at cursor ────────────────────────────────
  const handlePathClick = useCallback((e: React.MouseEvent) => {
    if (!e.ctrlKey) return;
    e.stopPropagation();
    const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const si = nearestSegIdx(fullPath, fp.x, fp.y);
    const insertPt = closestOnSeg(fullPath, si, fp.x, fp.y);
    const base = waypoints.length > 0 ? [...waypoints] : [...routedWaypoints];
    updateWaypoints?.(id, [...base.slice(0, si), insertPt, ...base.slice(si)]);
  }, [fullPath, waypoints, routedWaypoints, id, screenToFlowPosition, updateWaypoints]);

  // Interior segment indices: not the first or last segment
  const n = fullPath.length;
  const interiorSegs: number[] = [];
  for (let i = 1; i <= n - 3; i++) {
    const d = segDir(fullPath[i]!, fullPath[i + 1]!);
    if (d !== 'd') interiorSegs.push(i);
  }

  return (
    <>
      {/* Wide transparent stroke — hit-area for Ctrl+click */}
      <path
        d={displayPath}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: selected ? 'crosshair' : 'default', pointerEvents: 'stroke' }}
        onClick={handlePathClick}
      />

      <BaseEdge
        path={displayPath}
        style={{
          stroke: strokeColour,
          strokeWidth,
          strokeDasharray: edgeStyle.dashArray || undefined,
          opacity,
        }}
        markerStart={markerUrl(edgeStyle.sourceMarker)}
        markerEnd={markerUrl(edgeStyle.targetMarker)}
      />

      {data?.label && (
        <text x={labelX} y={labelY - 4} textAnchor="middle" fontSize={7} fill="#9CA3AF"
          fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none', opacity: opacity * 1.2 }}>
          {data.label as string}
        </text>
      )}

      <EdgeLabelRenderer>
        {selected && (
          <>
            {/* Source + target endpoint markers */}
            <div className="nodrag nopan" style={{ ...endpointHandleStyle, left: sourceX, top: sourceY }} />
            <div className="nodrag nopan" style={{ ...endpointHandleStyle, left: targetX, top: targetY }} />

            {/* Waypoint (bend) drag handles */}
            {activeWps.map((wp, i) => (
              <div key={`wp-${i}`} className="nodrag nopan"
                style={{ ...wpHandleStyle, left: wp.x, top: wp.y }}
                onMouseDown={(e) => startWaypointDrag(e, i)}
                title="Drag to move bend"
              />
            ))}

            {/* Segment slide handles — interior segments only */}
            {interiorSegs.map(si => {
              const p1 = fullPath[si]!; const p2 = fullPath[si + 1]!;
              const d = segDir(p1, p2) as 'h' | 'v';
              const cx = (p1.x + p2.x) / 2; const cy = (p1.y + p2.y) / 2;
              return (
                <div key={`seg-${si}`} className="nodrag nopan"
                  style={{ ...segHandleStyle(d), left: cx, top: cy }}
                  onMouseDown={(e) => handleSegmentMouseDown(e, si)}
                  title={d === 'h' ? 'Drag to slide segment up/down' : 'Drag to slide segment left/right'}
                >
                  {d === 'h' ? '↕' : '↔'}
                </div>
              );
            })}
          </>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const ArchimateEdge = memo(ArchimateEdgeComponent);
