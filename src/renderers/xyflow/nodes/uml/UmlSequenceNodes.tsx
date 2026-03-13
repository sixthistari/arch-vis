/**
 * UML Sequence diagram nodes.
 *
 * Sequence diagrams use constrained layout:
 *   X-axis = participant ordering (horizontal)
 *   Y-axis = time (downward)
 *
 * Node types:
 *   - Lifeline: rectangle header + dashed vertical line
 *   - Activation: thin rectangle on a lifeline
 *   - Fragment: combined fragment frame (alt, opt, loop, etc.)
 *   - Destroy: X marker on a lifeline
 *
 * Messages are rendered as custom edges between lifelines.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

// ═══════════════════════════════════════
// Lifeline node — rectangle header + dashed line
// ═══════════════════════════════════════

export interface UmlLifelineNodeData {
  label: string;
  typeName?: string; // e.g., "Order" in "order : Order"
  lifelineHeight?: number; // total height of the dashed line
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  destroyed?: boolean; // show X at bottom
  [key: string]: unknown;
}

type UmlLifelineNodeType = Node<UmlLifelineNodeData, 'uml-lifeline'>;

const HEADER_WIDTH = 120;
const HEADER_HEIGHT = 36;
const DEFAULT_LIFELINE_HEIGHT = 400;

function UmlLifelineNodeComponent({ data, selected }: NodeProps<UmlLifelineNodeType>) {
  const {
    label,
    typeName,
    lifelineHeight = DEFAULT_LIFELINE_HEIGHT,
    theme = 'dark',
    dimmed,
    destroyed,
  } = data;
  const isDark = theme === 'dark';
  const stroke = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  const displayLabel = typeName ? `${label} : ${typeName}` : label;
  const cx = HEADER_WIDTH / 2;
  const totalHeight = HEADER_HEIGHT + lifelineHeight;

  return (
    <div style={{ opacity }}>
      <svg width={HEADER_WIDTH} height={totalHeight} overflow="visible">
        {/* Header rectangle */}
        <rect
          x={0} y={0}
          width={HEADER_WIDTH} height={HEADER_HEIGHT}
          stroke={stroke} fill={fill} strokeWidth={1.5}
        />

        {/* Participant name */}
        <text
          x={cx} y={HEADER_HEIGHT / 2 + 1}
          textAnchor="middle" dominantBaseline="central"
          fontSize={11} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
          textDecoration="underline"
        >
          {displayLabel}
        </text>

        {/* Dashed lifeline */}
        <line
          x1={cx} y1={HEADER_HEIGHT}
          x2={cx} y2={totalHeight}
          stroke={stroke} strokeWidth={1} strokeDasharray="6 4"
        />

        {/* Destroy marker (X) */}
        {destroyed && (
          <g>
            <line x1={cx - 8} y1={totalHeight - 16} x2={cx + 8} y2={totalHeight} stroke={stroke} strokeWidth={2} />
            <line x1={cx + 8} y1={totalHeight - 16} x2={cx - 8} y2={totalHeight} stroke={stroke} strokeWidth={2} />
          </g>
        )}
      </svg>

      {/* Handles along the lifeline for message connections */}
      <Handle type="target" position={Position.Left} id="left" style={{ visibility: 'hidden', top: HEADER_HEIGHT + 20 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ visibility: 'hidden', top: HEADER_HEIGHT + 20 }} />
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const UmlLifelineNode = memo(UmlLifelineNodeComponent);

// ═══════════════════════════════════════
// Activation bar — thin rectangle on a lifeline
// ═══════════════════════════════════════

export interface UmlActivationNodeData {
  activationHeight?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlActivationNodeType = Node<UmlActivationNodeData, 'uml-activation'>;

const ACTIVATION_WIDTH = 12;
const DEFAULT_ACTIVATION_HEIGHT = 60;

function UmlActivationNodeComponent({ data, selected }: NodeProps<UmlActivationNodeType>) {
  const { activationHeight = DEFAULT_ACTIVATION_HEIGHT, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const stroke = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const fill = isDark ? '#334155' : '#E2E8F0';
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ opacity }}>
      <svg width={ACTIVATION_WIDTH} height={activationHeight} overflow="visible">
        <rect
          x={0} y={0}
          width={ACTIVATION_WIDTH} height={activationHeight}
          stroke={stroke} fill={fill} strokeWidth={1}
        />
      </svg>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const UmlActivationNode = memo(UmlActivationNodeComponent);

// ═══════════════════════════════════════
// Combined fragment — frame with operator tab
// ═══════════════════════════════════════

export interface UmlFragmentNodeData {
  operator: 'alt' | 'opt' | 'loop' | 'break' | 'par' | 'critical' | 'ref';
  guard?: string;
  fragmentWidth?: number;
  fragmentHeight?: number;
  operands?: number; // number of dashed divider lines
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlFragmentNodeType = Node<UmlFragmentNodeData, 'uml-fragment'>;

const TAB_WIDTH = 50;
const TAB_HEIGHT = 20;
const PENTAGON_NOTCH = 8;

function UmlFragmentNodeComponent({ data, selected }: NodeProps<UmlFragmentNodeType>) {
  const {
    operator,
    guard,
    fragmentWidth = 300,
    fragmentHeight = 120,
    operands = 0,
    theme = 'dark',
    dimmed,
  } = data;
  const isDark = theme === 'dark';
  const stroke = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const fill = isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.3)';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  // Pentagon tab path
  const tabPath = `M0,0 L${TAB_WIDTH},0 L${TAB_WIDTH},${TAB_HEIGHT - PENTAGON_NOTCH} L${TAB_WIDTH - PENTAGON_NOTCH},${TAB_HEIGHT} L0,${TAB_HEIGHT} Z`;

  return (
    <div style={{ opacity }}>
      <svg width={fragmentWidth} height={fragmentHeight} overflow="visible">
        {/* Frame */}
        <rect
          x={0} y={0}
          width={fragmentWidth} height={fragmentHeight}
          stroke={stroke} fill={fill} strokeWidth={1.2}
        />

        {/* Pentagon tab */}
        <path d={tabPath} stroke={stroke} fill={isDark ? '#334155' : '#E2E8F0'} strokeWidth={1} />

        {/* Operator text */}
        <text
          x={TAB_WIDTH / 2} y={TAB_HEIGHT / 2 + 1}
          textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={700} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {operator}
        </text>

        {/* Guard condition */}
        {guard && (
          <text
            x={TAB_WIDTH + 8} y={TAB_HEIGHT / 2 + 1}
            dominantBaseline="central"
            fontSize={10} fill={textFill}
            fontFamily="'JetBrains Mono', monospace"
            style={{ pointerEvents: 'none' }}
          >
            [{guard}]
          </text>
        )}

        {/* Operand dividers (dashed horizontal lines) */}
        {Array.from({ length: operands }).map((_, i) => {
          const y = ((i + 1) / (operands + 1)) * fragmentHeight;
          return (
            <line
              key={i}
              x1={0} y1={y} x2={fragmentWidth} y2={y}
              stroke={stroke} strokeWidth={1} strokeDasharray="6 4"
            />
          );
        })}
      </svg>
    </div>
  );
}

export const UmlFragmentNode = memo(UmlFragmentNodeComponent);
