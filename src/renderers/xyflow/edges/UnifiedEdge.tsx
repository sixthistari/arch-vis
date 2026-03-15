/**
 * Unified edge component for all notation families.
 *
 * Based on the ArchimateEdge gold standard — supports:
 *  - Waypoint manipulation (drag, Ctrl+click insert, segment slide)
 *  - Rounded orthogonal polyline routing
 *  - Notation-specific styling via getUnifiedEdgeStyle()
 *  - UML label decorations (stereotype, multiplicity, role)
 *  - Sequence messages (straight horizontal, self-message arcs, inline arrowheads)
 *  - Wireframe edge styles
 */
import React, { memo, useRef, useCallback, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  Position,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { getUnifiedEdgeStyle, type MarkerType } from '../../../notation/edge-styles';
import { WaypointUpdateContext, type Waypoint } from '../context';

// ─── Types ─────────────────────────────────────────────────────────────────

export type LineType = 'straight' | 'bezier' | 'step';

export interface UnifiedEdgeData {
  /** ArchiMate/UML/wireframe relationship type (key into the unified style registry). */
  relationshipType: string;
  label?: string;
  specialisation?: string | null;
  lineType?: LineType;
  stepOffset?: number;
  highlighted?: boolean;
  dimmed?: boolean;
  theme?: 'dark' | 'light';
  routedWaypoints?: { x: number; y: number }[];
  /** UML-specific: maps to getUnifiedEdgeStyle for sequence edges. */
  edgeType?: string;
  /** Sequence message type — sync, async, return, create, destroy, self. */
  messageType?: string;
  /** Sequence number for labelling. */
  sequenceNumber?: number;
  /** UML label decorations. */
  stereotype?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  sourceRole?: string;
  targetRole?: string;
  [key: string]: unknown;
}

type UnifiedEdgeType = Edge<UnifiedEdgeData, 'archimate'>;

// ─── Helpers ───────────────────────────────────────────────────────────────

function markerUrl(marker: MarkerType | null): string | undefined {
  if (!marker || marker === 'none') return undefined;
  // UML markers use their ID directly (e.g. 'uml-hollow-triangle' → '#uml-hollow-triangle')
  // DM markers use their ID directly (e.g. 'dm-one' → '#dm-one')
  // ArchiMate markers use 'marker-' prefix
  if (marker.startsWith('uml-') || marker.startsWith('dm-')) return `url(#${marker})`;
  return `url(#marker-${marker})`;
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

/**
 * Orthogonal fallback — guaranteed H/V-only path when no A* routing is available.
 * Extends from source/target perpendicular to their exit side, then connects via midpoint.
 */
function buildOrthogonalFallback(
  sx: number, sy: number, sPos: Position,
  tx: number, ty: number, tPos: Position,
  offset: number,
): string {
  // Extend from source perpendicular to its exit side
  let s1x = sx, s1y = sy;
  if (sPos === Position.Left)   s1x = sx - offset;
  if (sPos === Position.Right)  s1x = sx + offset;
  if (sPos === Position.Top)    s1y = sy - offset;
  if (sPos === Position.Bottom) s1y = sy + offset;

  // Extend from target perpendicular to its exit side
  let t1x = tx, t1y = ty;
  if (tPos === Position.Left)   t1x = tx - offset;
  if (tPos === Position.Right)  t1x = tx + offset;
  if (tPos === Position.Top)    t1y = ty - offset;
  if (tPos === Position.Bottom) t1y = ty + offset;

  // Connect through H/V segments
  const pts: { x: number; y: number }[] = [{ x: sx, y: sy }, { x: s1x, y: s1y }];

  const srcHorizontal = sPos === Position.Left || sPos === Position.Right;
  const tgtHorizontal = tPos === Position.Left || tPos === Position.Right;

  if (srcHorizontal && tgtHorizontal) {
    // Both exit horizontally — connect via vertical midline
    const midX = (s1x + t1x) / 2;
    pts.push({ x: midX, y: s1y }, { x: midX, y: t1y });
  } else if (!srcHorizontal && !tgtHorizontal) {
    // Both exit vertically — connect via horizontal midline
    const midY = (s1y + t1y) / 2;
    pts.push({ x: s1x, y: midY }, { x: t1x, y: midY });
  } else {
    // Mixed — one H, one V: connect with single bend
    if (srcHorizontal) {
      pts.push({ x: t1x, y: s1y });
    } else {
      pts.push({ x: s1x, y: t1y });
    }
  }

  pts.push({ x: t1x, y: t1y }, { x: tx, y: ty });
  return buildRoundedPath(pts);
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

// ─── Sequence message helpers ──────────────────────────────────────────────

const ARROW_SIZE = 8;
const SELF_LOOP_WIDTH = 40;
const SELF_LOOP_HEIGHT = 30;

function buildSequenceLabel(data: UnifiedEdgeData): string {
  const parts: string[] = [];
  if (data.sequenceNumber != null) parts.push(`${data.sequenceNumber}: `);
  if (data.messageType === 'create') {
    parts.push('\u00ABcreate\u00BB');
    if (data.label) parts.push(` ${data.label}`);
  } else if (data.label) {
    parts.push(data.label);
  }
  return parts.join('');
}

function renderArrowhead(
  tipX: number, tipY: number,
  direction: 'right' | 'left',
  filled: boolean, colour: string,
): React.ReactElement {
  const dx = direction === 'right' ? -ARROW_SIZE : ARROW_SIZE;
  const dy = ARROW_SIZE / 2;
  const points = `${tipX},${tipY} ${tipX + dx},${tipY - dy} ${tipX + dx},${tipY + dy}`;
  if (filled) return <polygon key="arrow" points={points} fill={colour} stroke="none" />;
  const d = `M${tipX + dx},${tipY - dy} L${tipX},${tipY} L${tipX + dx},${tipY + dy}`;
  return <path key="arrow" d={d} fill="none" stroke={colour} strokeWidth={1.2} />;
}

function renderDestroyMarker(x: number, y: number, colour: string): React.ReactElement {
  const size = 8;
  return (
    <g key="destroy">
      <line x1={x - size} y1={y - size} x2={x + size} y2={y + size} stroke={colour} strokeWidth={2} />
      <line x1={x + size} y1={y - size} x2={x - size} y2={y + size} stroke={colour} strokeWidth={2} />
    </g>
  );
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

// ─── Tooltip helpers ────────────────────────────────────────────────────────

/** Format a relationship type key for display: "composition" → "Composition", "flow" → "Flow". */
function formatRelType(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const tooltipStyle: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  padding: '6px 10px',
  borderRadius: 4,
  fontSize: 11,
  lineHeight: '1.4',
  fontFamily: 'Inter, system-ui, sans-serif',
  background: 'var(--panel-bg, #1e293b)',
  color: 'var(--text-primary, #e2e8f0)',
  border: '1px solid var(--panel-border, #334155)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  zIndex: 9999,
  whiteSpace: 'nowrap',
  maxWidth: 320,
};

// ─── Component ─────────────────────────────────────────────────────────────

function UnifiedEdgeComponent(props: EdgeProps<UnifiedEdgeType>) {
  const {
    id, sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    data, selected,
  } = props;

  const updateWaypoints = React.useContext(WaypointUpdateContext);
  const { screenToFlowPosition, getNode } = useReactFlow();

  // Resolve the style key — for UML edges the edgeType carries the relationship type,
  // for sequence messages the messageType carries it.
  const relType = data?.relationshipType ?? 'association';
  const styleKey = data?.messageType ?? data?.edgeType ?? relType;
  const edgeStyle = getUnifiedEdgeStyle(styleKey);

  const dimmed = data?.dimmed ?? false;
  const highlighted = data?.highlighted ?? false;
  const lineType = data?.lineType ?? 'step';
  const stepOffset = data?.stepOffset ?? 20;
  const waypoints = (data?.waypoints as Waypoint[] | undefined) ?? [];
  const routedWaypoints = (data?.routedWaypoints as { x: number; y: number }[] | undefined) ?? [];
  const isDark = (data?.theme ?? 'dark') === 'dark';
  const strokeColour = selected || highlighted ? '#F59E0B' : (edgeStyle.color ?? (isDark ? '#94A3B8' : '#475569'));
  const opacity = dimmed ? 0.04 : 1;
  const strokeWidth = highlighted && !selected ? edgeStyle.width * 2.0 : edgeStyle.width;

  // ── Relationship tooltip on hover ───────────────────────────────────
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEdgeMouseEnter = useCallback((e: React.MouseEvent) => {
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ x: e.clientX + 12, y: e.clientY + 12 });
    }, 300);
  }, []);

  const handleEdgeMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) setTooltip({ x: e.clientX + 12, y: e.clientY + 12 });
  }, [tooltip]);

  const handleEdgeMouseLeave = useCallback(() => {
    if (tooltipTimer.current) { clearTimeout(tooltipTimer.current); tooltipTimer.current = null; }
    setTooltip(null);
  }, []);

  // Build tooltip content lazily
  const tooltipContent = React.useMemo(() => {
    if (!tooltip) return null;
    const srcNode = getNode(props.source);
    const tgtNode = getNode(props.target);
    const srcName = (srcNode?.data as Record<string, unknown> | undefined)?.label as string | undefined;
    const tgtName = (tgtNode?.data as Record<string, unknown> | undefined)?.label as string | undefined;
    return { relType: formatRelType(relType), srcName, tgtName, label: data?.label };
  }, [tooltip, relType, data?.label, props.source, props.target, getNode]);

  // ── Sequence message — self-message arc ──────────────────────────────
  if (edgeStyle.isSelfMessage) {
    const colour = selected ? '#F59E0B' : '#374151';
    const displayLabel = data ? buildSequenceLabel(data) : '';
    const x0 = sourceX;
    const y0 = sourceY;
    const xRight = x0 + SELF_LOOP_WIDTH;
    const yBottom = y0 + SELF_LOOP_HEIGHT;
    const d = `M${x0},${y0} L${xRight},${y0} L${xRight},${yBottom} L${x0},${yBottom}`;

    return (
      <g>
        <path d={d} fill="none" stroke={colour} strokeWidth={edgeStyle.width} strokeDasharray={edgeStyle.dashArray || undefined} />
        {renderArrowhead(x0, yBottom, 'left', edgeStyle.filledArrow ?? true, colour)}
        {displayLabel && (
          <text x={xRight + 4} y={y0 + SELF_LOOP_HEIGHT / 2} fontSize={10} fill="#374151"
            fontFamily="Inter, system-ui, sans-serif" dominantBaseline="central" style={{ pointerEvents: 'none' }}>
            {displayLabel}
          </text>
        )}
      </g>
    );
  }

  // ── Sequence message — straight horizontal line with inline arrowhead ──
  if (edgeStyle.isMessage) {
    const colour = selected ? '#F59E0B' : '#374151';
    const displayLabel = data ? buildSequenceLabel(data) : '';
    const direction: 'right' | 'left' = targetX >= sourceX ? 'right' : 'left';
    const d = `M${sourceX},${sourceY} L${targetX},${targetY}`;
    const labelX = (sourceX + targetX) / 2;
    const labelY = Math.min(sourceY, targetY) - 6;

    return (
      <g>
        <path d={d} fill="none" stroke={colour} strokeWidth={edgeStyle.width} strokeDasharray={edgeStyle.dashArray || undefined} />
        {renderArrowhead(targetX, targetY, direction, edgeStyle.filledArrow ?? false, colour)}
        {data?.messageType === 'destroy' && renderDestroyMarker(targetX, targetY, colour)}
        {displayLabel && (
          <text x={labelX} y={labelY} textAnchor="middle" fontSize={10} fill="#374151"
            fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {displayLabel}
          </text>
        )}
      </g>
    );
  }

  // ── Standard edge (ArchiMate / UML class / wireframe) ────────────────

  // xyflow fallback path
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
  const hasUserWps = waypoints.length > 0;
  const hasRoutedPath = !hasUserWps && routedWaypoints.length >= 2;

  // When A* routing provides a full path (including endpoints), use it directly
  // instead of mixing A* interior points with xyflow handle coordinates.
  const fullPath = hasRoutedPath
    ? routedWaypoints                    // A* endpoints are authoritative
    : [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];

  // Display path
  let displayPath = edgePath;
  if (hasRoutedPath || hasUserWps) {
    displayPath = buildRoundedPath(fullPath);
  } else if (data?.customPath && typeof data.customPath === 'string') {
    displayPath = data.customPath;
  } else if (lineType === 'step') {
    // Orthogonal fallback — guaranteed H/V segments when no routing available
    displayPath = buildOrthogonalFallback(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, stepOffset);
  }

  // Label midpoint
  const midPt = customPathMidpoint(displayPath);
  if (midPt) { labelX = midPt.x; labelY = midPt.y; }

  // ── Segment slide drag ────────────────────────────────────────────────
  const segDragRef = useRef<{
    segIdx: number; dir: 'h' | 'v';
    startFlow: { x: number; y: number };
    initFull: { x: number; y: number }[];
  } | null>(null);

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, segIdx: number) => {
    e.stopPropagation();
    // Use fullPath directly — it already includes correct endpoints
    const initFull = fullPath.map(p => ({ ...p }));
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
  }, [id, fullPath, screenToFlowPosition, updateWaypoints]);

  // ── Waypoint (bend) drag ──────────────────────────────────────────────
  const wpDragRef = useRef<{ idx: number; pts: { x: number; y: number }[] } | null>(null);

  const startWaypointDrag = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    // Interior waypoints = fullPath without endpoints
    const base = fullPath.slice(1, -1);
    wpDragRef.current = { idx, pts: [...base] };
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
  }, [id, fullPath, screenToFlowPosition, updateWaypoints]);

  // ── Ctrl+click → insert bend at cursor ────────────────────────────────
  const handlePathMouseDown = useCallback((e: React.MouseEvent) => {
    if (!e.ctrlKey) return;
    e.stopPropagation();
    e.preventDefault();
    const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const si = nearestSegIdx(fullPath, fp.x, fp.y);
    const insertPt = closestOnSeg(fullPath, si, fp.x, fp.y);
    // When using A* full path, strip endpoints to get interior waypoints
    const base = hasUserWps
      ? [...waypoints]
      : hasRoutedPath
        ? routedWaypoints.slice(1, -1)
        : [];
    // si is in fullPath coords; for user waypoints it's offset by 1 (endpoint)
    const insertIdx = hasRoutedPath ? Math.max(0, si - 1) : si;
    updateWaypoints?.(id, [...base.slice(0, insertIdx), insertPt, ...base.slice(insertIdx)]);
  }, [fullPath, waypoints, routedWaypoints, hasUserWps, hasRoutedPath, id, screenToFlowPosition, updateWaypoints]);

  // Interior segment indices
  const n = fullPath.length;
  const interiorSegs: number[] = [];
  for (let i = 1; i <= n - 3; i++) {
    const d = segDir(fullPath[i]!, fullPath[i + 1]!);
    if (d !== 'd') interiorSegs.push(i);
  }

  // ── UML label rendering ────────────────────────────────────────────────
  const hasUmlLabels = !!(data?.stereotype || data?.sourceMultiplicity || data?.targetMultiplicity || data?.sourceRole || data?.targetRole);

  return (
    <>
      {/* Wide transparent stroke — hit-area for Ctrl+click + hover tooltip */}
      <path
        d={displayPath}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: selected ? 'crosshair' : 'pointer', pointerEvents: 'stroke' }}
        onMouseDown={handlePathMouseDown}
        onMouseEnter={handleEdgeMouseEnter}
        onMouseMove={handleEdgeMouseMove}
        onMouseLeave={handleEdgeMouseLeave}
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

      {/* Main label + stereotype */}
      {!edgeStyle.isMessage && (data?.label || data?.stereotype || relType === 'uml-include' || relType === 'uml-extend') && (
        <text x={labelX} y={labelY - 4} textAnchor="middle" fontSize={7} fill="#9CA3AF"
          fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none', opacity: opacity * 1.2 }}>
          {(data?.stereotype || relType === 'uml-include' || relType === 'uml-extend')
            ? `\u00AB${data?.stereotype ?? (relType === 'uml-include' ? 'include' : 'extend')}\u00BB `
            : ''}
          {data?.label ? (data.label as string) : ''}
        </text>
      )}

      {/* UML multiplicity/role labels */}
      {hasUmlLabels && (
        <>
          {data?.sourceMultiplicity && (
            <text x={sourceX + 12} y={sourceY - 8} fontSize={9} fill={strokeColour}
              fontFamily="'JetBrains Mono', monospace" style={{ pointerEvents: 'none', opacity }}>
              {data.sourceMultiplicity}
            </text>
          )}
          {data?.targetMultiplicity && (
            <text x={targetX - 12} y={targetY - 8} textAnchor="end" fontSize={9} fill={strokeColour}
              fontFamily="'JetBrains Mono', monospace" style={{ pointerEvents: 'none', opacity }}>
              {data.targetMultiplicity}
            </text>
          )}
          {data?.sourceRole && (
            <text x={sourceX + 12} y={sourceY + 12} fontSize={9} fill={strokeColour} fillOpacity={0.7}
              fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none', opacity }}>
              {data.sourceRole}
            </text>
          )}
          {data?.targetRole && (
            <text x={targetX - 12} y={targetY + 12} textAnchor="end" fontSize={9} fill={strokeColour} fillOpacity={0.7}
              fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none', opacity }}>
              {data.targetRole}
            </text>
          )}
        </>
      )}

      {/* Relationship tooltip */}
      {tooltip && tooltipContent && (
        <EdgeLabelRenderer>
          <div style={{ ...tooltipStyle, left: tooltip.x, top: tooltip.y }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltipContent.relType}</div>
            {(tooltipContent.srcName || tooltipContent.tgtName) && (
              <div style={{ opacity: 0.85 }}>
                {tooltipContent.srcName ?? '?'} → {tooltipContent.tgtName ?? '?'}
              </div>
            )}
            {tooltipContent.label && (
              <div style={{ opacity: 0.7, fontStyle: 'italic', marginTop: 1 }}>{tooltipContent.label}</div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      <EdgeLabelRenderer>
        {selected && (
          <>
            {/* Source + target endpoint markers */}
            <div className="nodrag nopan" style={{ ...endpointHandleStyle, left: sourceX, top: sourceY }} />
            <div className="nodrag nopan" style={{ ...endpointHandleStyle, left: targetX, top: targetY }} />

            {/* Waypoint (bend) drag handles — show interior points (skip endpoints) */}
            {fullPath.slice(1, -1).map((wp, i) => (
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
                  {d === 'h' ? '\u2195' : '\u2194'}
                </div>
              );
            })}
          </>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const UnifiedEdge = memo(UnifiedEdgeComponent);
