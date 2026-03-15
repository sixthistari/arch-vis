/**
 * UML State diagram node.
 *
 * Supports:
 * - Regular state: rounded rectangle with name compartment + optional activities
 * - Initial state: filled black circle
 * - Final state: bullseye (circle with inner filled circle)
 * - Composite state: rounded rectangle containing sub-states (rendered as container)
 * - Choice pseudo-state: diamond
 * - Fork/join: thick horizontal or vertical bar
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { getUmlColours } from '../../../../notation/theme-colours';

export interface StateActivity {
  trigger: 'entry' | 'exit' | 'do';
  action: string;
}

export interface UmlStateNodeData {
  label: string;
  stateType: 'state' | 'initial' | 'final' | 'choice' | 'fork' | 'join' | 'composite';
  activities?: StateActivity[];
  isVertical?: boolean; // for fork/join orientation
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlStateNodeType = Node<UmlStateNodeData, 'uml-state'>;

const STATE_WIDTH = 140;
const STATE_RADIUS = 10;
const ROW_HEIGHT = 14;
const HEADER_HEIGHT = 28;
const PSEUDO_SIZE = 14;

function UmlStateNodeComponent({ data, selected }: NodeProps<UmlStateNodeType>) {
  const { label, stateType, activities = [], theme = 'dark', dimmed, isVertical } = data;
  const { stroke, fill, text: textFill } = getUmlColours(theme, selected);
  const opacity = dimmed ? 0.1 : 1;

  // ── Initial state: filled circle ──
  if (stateType === 'initial') {
    return (
      <div style={{ opacity }}>
        <svg width={PSEUDO_SIZE} height={PSEUDO_SIZE} overflow="visible">
          <circle cx={PSEUDO_SIZE / 2} cy={PSEUDO_SIZE / 2} r={PSEUDO_SIZE / 2 - 1} fill={stroke} stroke={stroke} strokeWidth={1} />
        </svg>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Final state: bullseye ──
  if (stateType === 'final') {
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

  // ── Choice: diamond ──
  if (stateType === 'choice') {
    const s = 24;
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

  // ── Fork/Join: thick bar ──
  if (stateType === 'fork' || stateType === 'join') {
    const barW = isVertical ? 4 : 80;
    const barH = isVertical ? 80 : 4;
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

  // ── Composite state: HTML container for child nesting ──
  if (stateType === 'composite') {
    return (
      <div style={{ width: '100%', height: '100%', opacity, position: 'relative' }}>
        <NodeResizer
          isVisible={selected}
          minWidth={160}
          minHeight={100}
          lineStyle={{ borderColor: stroke, borderWidth: 1 }}
          handleStyle={{ width: 6, height: 6, backgroundColor: stroke, borderRadius: 1 }}
        />
        <div style={{
          width: '100%',
          height: '100%',
          border: `1.5px solid ${stroke}`,
          borderRadius: STATE_RADIUS,
          background: fill,
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: textFill,
            fontFamily: 'Inter, system-ui, sans-serif',
            borderBottom: `1px solid ${stroke}`,
            userSelect: 'none',
          }}>
            {label}
          </div>
          {/* Child area — sub-states nest here via parent_id */}
        </div>
        <RoutingHandles />
      </div>
    );
  }

  // ── Regular state: rounded rectangle ──
  const hasActivities = activities.length > 0;
  const activitiesH = hasActivities ? activities.length * ROW_HEIGHT + 8 : 0;
  const totalHeight = HEADER_HEIGHT + activitiesH + (hasActivities ? 0 : 6);
  const width = STATE_WIDTH;
  const height = totalHeight;

  return (
    <div style={{ opacity }}>
      <svg width={width} height={height} overflow="visible">
        {/* Body */}
        <rect
          x={0} y={0} width={width} height={height}
          rx={STATE_RADIUS} ry={STATE_RADIUS}
          stroke={stroke} fill={fill} strokeWidth={1.5}
        />

        {/* State name */}
        <text
          x={width / 2} y={HEADER_HEIGHT / 2 + 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={600} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>

        {/* Divider line (only if activities present) */}
        {hasActivities && (
          <line x1={0} y1={HEADER_HEIGHT} x2={width} y2={HEADER_HEIGHT} stroke={stroke} strokeWidth={0.8} />
        )}

        {/* Activities */}
        {activities.map((act, i) => (
          <text
            key={i}
            x={8} y={HEADER_HEIGHT + 8 + i * ROW_HEIGHT + ROW_HEIGHT * 0.7}
            fontSize={10} fill={textFill}
            fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: 'none' }}
          >
            {act.trigger}/ {act.action}
          </text>
        ))}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const UmlStateNode = memo(UmlStateNodeComponent);
