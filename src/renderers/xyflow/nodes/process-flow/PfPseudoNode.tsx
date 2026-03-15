/**
 * Process flow pseudo-state nodes — start (filled circle), end (double circle), timer (circle + clock).
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface PfPseudoNodeData {
  label: string;
  pseudoType: 'start' | 'end' | 'timer';
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfPseudoNodeType = Node<PfPseudoNodeData, 'pf-pseudo'>;

const SIZE = 24;

function PfPseudoNodeComponent({ data, selected }: NodeProps<PfPseudoNodeType>) {
  const { pseudoType, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const accent = '#6366F1';
  const stroke = selected ? '#F59E0B' : accent;
  const opacity = dimmed ? 0.1 : 1;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  if (pseudoType === 'start') {
    return (
      <div style={{ opacity }}>
        <svg width={SIZE} height={SIZE} overflow="visible">
          <circle cx={cx} cy={cy} r={cx - 1} fill={accent} stroke={stroke} strokeWidth={1.5} />
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  if (pseudoType === 'end') {
    const r = cx - 1;
    return (
      <div style={{ opacity }}>
        <svg width={SIZE} height={SIZE} overflow="visible">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r * 0.55} fill={accent} />
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // Timer: circle with clock hands
  const r = cx - 1;
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  return (
    <div style={{ opacity }}>
      <svg width={SIZE} height={SIZE} overflow="visible">
        <circle cx={cx} cy={cy} r={r} fill={isDark ? '#1E293B' : '#FFFFFF'} stroke={stroke} strokeWidth={1.5} />
        {/* Clock hands */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.55} stroke={stroke} strokeWidth={1.5} />
        <line x1={cx} y1={cy} x2={cx + r * 0.4} y2={cy + r * 0.15} stroke={stroke} strokeWidth={1.2} />
        {/* Small dots at 12, 3, 6, 9 */}
        <circle cx={cx} cy={cy - r + 2} r={0.8} fill={textFill} />
        <circle cx={cx + r - 2} cy={cy} r={0.8} fill={textFill} />
        <circle cx={cx} cy={cy + r - 2} r={0.8} fill={textFill} />
        <circle cx={cx - r + 2} cy={cy} r={0.8} fill={textFill} />
      </svg>
      <RoutingHandles />
    </div>
  );
}

export const PfPseudoNode = memo(PfPseudoNodeComponent);
