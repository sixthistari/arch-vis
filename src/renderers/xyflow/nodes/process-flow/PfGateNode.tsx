/**
 * Process flow approval gate — octagon shape with red/amber accent.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface PfGateNodeData {
  label: string;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfGateNodeType = Node<PfGateNodeData, 'pf-gate'>;

const WIDTH = 100;
const HEIGHT = 50;

function octagonPath(w: number, h: number): string {
  // Cut corners at ~30% of each side
  const cutX = w * 0.22;
  const cutY = h * 0.22;
  return [
    `M${cutX},0`,
    `L${w - cutX},0`,
    `L${w},${cutY}`,
    `L${w},${h - cutY}`,
    `L${w - cutX},${h}`,
    `L${cutX},${h}`,
    `L0,${h - cutY}`,
    `L0,${cutY}`,
    'Z',
  ].join(' ');
}

function PfGateNodeComponent({ data, selected }: NodeProps<PfGateNodeType>) {
  const { label, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const gateStroke = selected ? '#F59E0B' : '#EF4444';
  const fill = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ opacity }}>
      <svg width={WIDTH} height={HEIGHT} overflow="visible">
        <path
          d={octagonPath(WIDTH, HEIGHT)}
          stroke={gateStroke} fill={fill} strokeWidth={2}
        />
        <text
          x={WIDTH / 2} y={HEIGHT / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={700} fill={textFill}
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

export const PfGateNode = memo(PfGateNodeComponent);
