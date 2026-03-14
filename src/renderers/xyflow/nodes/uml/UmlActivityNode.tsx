/**
 * UML Activity diagram node.
 *
 * Supports:
 * - action: rounded rectangle with centred label
 * - decision / merge: diamond shape
 * - fork / join: thick horizontal or vertical bar
 * - initial: filled black circle
 * - final: bullseye (outer circle + inner filled circle)
 * - flow-final: circle with X inside
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface UmlActivityNodeData {
  label: string;
  activityType: 'action' | 'decision' | 'merge' | 'fork' | 'join' | 'initial' | 'final' | 'flow-final';
  isVertical?: boolean; // for fork/join orientation
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlActivityNodeType = Node<UmlActivityNodeData, 'uml-activity'>;

const ACTION_WIDTH = 140;
const ACTION_HEIGHT = 40;
const ACTION_RADIUS = 12;
const DIAMOND_SIZE = 30;
const BAR_LENGTH = 80;
const BAR_THICKNESS = 4;
const PSEUDO_SIZE = 14;

function UmlActivityNodeComponent({ data, selected }: NodeProps<UmlActivityNodeType>) {
  const { label, activityType, theme = 'dark', dimmed, isVertical } = data;
  const isDark = theme === 'dark';
  const stroke = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  // ── Initial: filled circle ──
  if (activityType === 'initial') {
    return (
      <div style={{ opacity }}>
        <svg width={PSEUDO_SIZE} height={PSEUDO_SIZE} overflow="visible">
          <circle
            cx={PSEUDO_SIZE / 2} cy={PSEUDO_SIZE / 2} r={PSEUDO_SIZE / 2 - 1}
            fill={stroke} stroke={stroke} strokeWidth={1}
          />
        </svg>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Final: bullseye ──
  if (activityType === 'final') {
    const r = PSEUDO_SIZE / 2;
    return (
      <div style={{ opacity }}>
        <svg width={PSEUDO_SIZE + 4} height={PSEUDO_SIZE + 4} overflow="visible">
          <circle cx={r + 2} cy={r + 2} r={r} fill="none" stroke={stroke} strokeWidth={1.5} />
          <circle cx={r + 2} cy={r + 2} r={r * 0.55} fill={stroke} />
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Flow-final: circle with X ──
  if (activityType === 'flow-final') {
    const r = PSEUDO_SIZE / 2;
    const cx = r + 2;
    const cy = r + 2;
    const offset = r * 0.6;
    return (
      <div style={{ opacity }}>
        <svg width={PSEUDO_SIZE + 4} height={PSEUDO_SIZE + 4} overflow="visible">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={1.5} />
          <line x1={cx - offset} y1={cy - offset} x2={cx + offset} y2={cy + offset} stroke={stroke} strokeWidth={1.5} />
          <line x1={cx - offset} y1={cy + offset} x2={cx + offset} y2={cy - offset} stroke={stroke} strokeWidth={1.5} />
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Decision / Merge: diamond ──
  if (activityType === 'decision' || activityType === 'merge') {
    const s = DIAMOND_SIZE;
    const half = s / 2;
    return (
      <div style={{ opacity }}>
        <svg width={s} height={s} overflow="visible">
          <polygon
            points={`${half},0 ${s},${half} ${half},${s} 0,${half}`}
            stroke={stroke} fill={fill} strokeWidth={1.5}
          />
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Fork / Join: thick bar ──
  if (activityType === 'fork' || activityType === 'join') {
    const barW = isVertical ? BAR_THICKNESS : BAR_LENGTH;
    const barH = isVertical ? BAR_LENGTH : BAR_THICKNESS;
    return (
      <div style={{ opacity }}>
        <svg width={barW} height={barH} overflow="visible">
          <rect x={0} y={0} width={barW} height={barH} fill={stroke} rx={2} />
        </svg>
        <Handle type="target" position={isVertical ? Position.Left : Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={isVertical ? Position.Right : Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Action: rounded rectangle with centred label ──
  return (
    <div style={{ opacity }}>
      <svg width={ACTION_WIDTH} height={ACTION_HEIGHT} overflow="visible">
        <rect
          x={0} y={0} width={ACTION_WIDTH} height={ACTION_HEIGHT}
          rx={ACTION_RADIUS} ry={ACTION_RADIUS}
          stroke={stroke} fill={fill} strokeWidth={1.5}
        />
        <text
          x={ACTION_WIDTH / 2} y={ACTION_HEIGHT / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={600} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const UmlActivityNode = memo(UmlActivityNodeComponent);
