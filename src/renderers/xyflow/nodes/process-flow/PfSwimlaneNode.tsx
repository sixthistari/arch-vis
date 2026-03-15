/**
 * Process flow swimlane — horizontal band container with header label.
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';

export interface PfSwimlaneNodeData {
  label: string;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type PfSwimlaneNodeType = Node<PfSwimlaneNodeData, 'pf-swimlane'>;

const HEADER_W = 30;

function PfSwimlaneNodeComponent({ data, selected }: NodeProps<PfSwimlaneNodeType>) {
  const { label, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const accent = '#6366F1';
  const stroke = selected ? '#F59E0B' : accent;
  const bgFill = isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)';
  const headerFill = isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.10)';
  const textFill = isDark ? '#C7D2FE' : '#4338CA';
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ width: '100%', height: '100%', opacity }}>
      <NodeResizer
        color={accent}
        isVisible={selected ?? false}
        minWidth={200}
        minHeight={80}
      />
      <div style={{
        width: '100%',
        height: '100%',
        border: `1.5px dashed ${stroke}`,
        borderRadius: 4,
        background: bgFill,
        display: 'flex',
        flexDirection: 'row',
      }}>
        {/* Vertical header band */}
        <div style={{
          width: HEADER_W,
          minWidth: HEADER_W,
          background: headerFill,
          borderRight: `1px solid ${stroke}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '3px 0 0 3px',
        }}>
          <span style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 11,
            fontWeight: 700,
            color: textFill,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '0.5px',
            userSelect: 'none',
          }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export const PfSwimlaneNode = memo(PfSwimlaneNodeComponent);
