/**
 * Process flow decision/gateway node — diamond shape.
 *
 * - decision: plain diamond
 * - gateway: diamond with + symbol (parallel gateway)
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export interface PfDecisionNodeData {
  label: string;
  decisionType: 'decision' | 'gateway';
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfDecisionNodeType = Node<PfDecisionNodeData, 'pf-decision'>;

const SIZE = 40;

function PfDecisionNodeComponent({ data, selected }: NodeProps<PfDecisionNodeType>) {
  const { decisionType, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const accent = '#6366F1';
  const stroke = selected ? '#F59E0B' : accent;
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const opacity = dimmed ? 0.1 : 1;
  const half = SIZE / 2;

  return (
    <div style={{ opacity }}>
      <svg width={SIZE} height={SIZE} overflow="visible">
        <polygon
          points={`${half},0 ${SIZE},${half} ${half},${SIZE} 0,${half}`}
          stroke={stroke} fill={fill} strokeWidth={1.5}
        />
        {decisionType === 'gateway' && (
          <g>
            <line x1={half} y1={half - 6} x2={half} y2={half + 6} stroke={stroke} strokeWidth={2} />
            <line x1={half - 6} y1={half} x2={half + 6} y2={half} stroke={stroke} strokeWidth={2} />
          </g>
        )}
      </svg>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const PfDecisionNode = memo(PfDecisionNodeComponent);
