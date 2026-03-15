/**
 * Process flow task node — rounded rectangle with left-side icon.
 *
 * Variants: human-task (person), agent-task (bot), system-call (gear).
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface PfTaskNodeData {
  label: string;
  taskType: 'human-task' | 'agent-task' | 'system-call';
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfTaskNodeType = Node<PfTaskNodeData, 'pf-task'>;

const WIDTH = 140;
const HEIGHT = 40;
const RADIUS = 10;
const ICON_AREA = 28;

/** Person icon for human tasks. */
function PersonIcon({ x, cy, stroke }: { x: number; cy: number; stroke: string }) {
  return (
    <g>
      <circle cx={x + 8} cy={cy - 5} r={3.5} fill="none" stroke={stroke} strokeWidth={1.2} />
      <line x1={x + 8} y1={cy - 1} x2={x + 8} y2={cy + 5} stroke={stroke} strokeWidth={1.2} />
      <line x1={x + 3} y1={cy + 1} x2={x + 13} y2={cy + 1} stroke={stroke} strokeWidth={1.2} />
      <line x1={x + 8} y1={cy + 5} x2={x + 4} y2={cy + 9} stroke={stroke} strokeWidth={1.2} />
      <line x1={x + 8} y1={cy + 5} x2={x + 12} y2={cy + 9} stroke={stroke} strokeWidth={1.2} />
    </g>
  );
}

/** Bot icon for agent tasks. */
function BotIcon({ x, cy, stroke }: { x: number; cy: number; stroke: string }) {
  return (
    <g>
      <rect x={x + 2} y={cy - 5} width={12} height={10} rx={2} fill="none" stroke={stroke} strokeWidth={1.2} />
      <circle cx={x + 6} cy={cy - 1} r={1.2} fill={stroke} />
      <circle cx={x + 10} cy={cy - 1} r={1.2} fill={stroke} />
      <line x1={x + 5} y1={cy + 2} x2={x + 11} y2={cy + 2} stroke={stroke} strokeWidth={1} />
      <line x1={x + 8} y1={cy - 5} x2={x + 8} y2={cy - 7} stroke={stroke} strokeWidth={1.2} />
      <circle cx={x + 8} cy={cy - 8} r={1} fill={stroke} />
    </g>
  );
}

/** Gear icon for system calls. */
function GearIcon({ x, cy, stroke }: { x: number; cy: number; stroke: string }) {
  const cx = x + 8;
  const r = 5;
  const teeth = 6;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i * Math.PI) / teeth - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.65;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return (
    <g>
      <polygon points={points.join(' ')} fill="none" stroke={stroke} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={2} fill="none" stroke={stroke} strokeWidth={1} />
    </g>
  );
}

function PfTaskNodeComponent({ data, selected }: NodeProps<PfTaskNodeType>) {
  const { label, taskType, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const accentStroke = '#6366F1';
  const stroke = selected ? '#F59E0B' : accentStroke;
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  const cy = HEIGHT / 2;

  return (
    <div style={{ opacity }}>
      <svg width={WIDTH} height={HEIGHT} overflow="visible">
        <rect
          x={0} y={0} width={WIDTH} height={HEIGHT}
          rx={RADIUS} ry={RADIUS}
          stroke={stroke} fill={fill} strokeWidth={1.5}
        />
        {/* Divider between icon area and label */}
        <line x1={ICON_AREA} y1={4} x2={ICON_AREA} y2={HEIGHT - 4} stroke={stroke} strokeWidth={0.5} opacity={0.4} />

        {/* Icon */}
        {taskType === 'human-task' && <PersonIcon x={4} cy={cy} stroke={stroke} />}
        {taskType === 'agent-task' && <BotIcon x={4} cy={cy} stroke={stroke} />}
        {taskType === 'system-call' && <GearIcon x={4} cy={cy} stroke={stroke} />}

        {/* Label */}
        <text
          x={ICON_AREA + (WIDTH - ICON_AREA) / 2} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight={600} fill={textFill}
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

export const PfTaskNode = memo(PfTaskNodeComponent);
