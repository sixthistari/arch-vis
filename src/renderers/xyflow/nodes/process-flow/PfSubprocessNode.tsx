/**
 * Process flow subprocess — dashed rounded rect container with [+] marker.
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface PfSubprocessNodeData {
  label: string;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfSubprocessNodeType = Node<PfSubprocessNodeData, 'pf-subprocess'>;

function PfSubprocessNodeComponent({ data, selected }: NodeProps<PfSubprocessNodeType>) {
  const { label, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const accent = '#6366F1';
  const stroke = selected ? '#F59E0B' : accent;
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ width: '100%', height: '100%', opacity, position: 'relative' }}>
      <NodeResizer
        color={accent}
        isVisible={selected ?? false}
        minWidth={120}
        minHeight={50}
      />
      <div style={{
        width: '100%',
        height: '100%',
        border: `1.5px dashed ${stroke}`,
        borderRadius: 10,
        background: fill,
        position: 'relative',
      }}>
        {/* Label at top */}
        <div style={{
          position: 'absolute',
          top: 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: textFill,
          fontFamily: 'Inter, system-ui, sans-serif',
          userSelect: 'none',
        }}>
          {label}
        </div>
        {/* [+] marker at bottom centre */}
        <div style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 14,
          height: 14,
          border: `1.2px solid ${stroke}`,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: stroke,
          lineHeight: 1,
          userSelect: 'none',
        }}>
          +
        </div>
      </div>
      <RoutingHandles />
    </div>
  );
}

export const PfSubprocessNode = memo(PfSubprocessNodeComponent);
