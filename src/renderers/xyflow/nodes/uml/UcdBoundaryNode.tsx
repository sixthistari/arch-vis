/**
 * UCD System Boundary node — a large dashed rectangle that visually contains
 * all use cases. Rendered behind use case nodes at zIndex -1.
 * Selectable, draggable, and resizable via xyflow NodeResizer.
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';

export interface UcdBoundaryNodeData {
  label: string;
  boundaryWidth: number;
  boundaryHeight: number;
  theme: 'dark' | 'light';
  [key: string]: unknown;
}

type UcdBoundaryNodeType = Node<UcdBoundaryNodeData, 'ucd-boundary'>;

/** Simple monitor/system icon — 16×12px SVG. */
function SystemIcon({ colour }: { colour: string }) {
  return (
    <svg width={16} height={14} viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Monitor body */}
      <rect x="1" y="0.5" width="14" height="9" rx="1" stroke={colour} strokeWidth="1.2" fill="none" />
      {/* Stand */}
      <line x1="8" y1="9.5" x2="8" y2="12" stroke={colour} strokeWidth="1.2" />
      {/* Base */}
      <line x1="5" y1="12" x2="11" y2="12" stroke={colour} strokeWidth="1.2" />
    </svg>
  );
}

function UcdBoundaryNodeComponent({ data, selected }: NodeProps<UcdBoundaryNodeType>) {
  const { label, boundaryWidth, boundaryHeight, theme } = data;
  const isDark = theme === 'dark';

  const borderColour = isDark ? '#64748B' : '#94A3B8';
  const bgColour = isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.5)';
  const textColour = isDark ? '#CBD5E1' : '#334155';
  const resizerLineColour = isDark ? '#60A5FA' : '#3B82F6';

  return (
    <div
      style={{
        width: boundaryWidth,
        height: boundaryHeight,
        borderRadius: 12,
        border: `2px dashed ${borderColour}`,
        background: bgColour,
        position: 'relative',
      }}
    >
      <NodeResizer
        isVisible={!!selected}
        lineStyle={{ borderColor: resizerLineColour }}
        handleStyle={{ backgroundColor: resizerLineColour, width: 8, height: 8 }}
        minWidth={120}
        minHeight={80}
      />
      {/* System icon — top-right */}
      <div style={{ position: 'absolute', top: 6, right: 8 }}>
        <SystemIcon colour={textColour} />
      </div>
      {/* Title tab at the top */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 24,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: textColour,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const UcdBoundaryNode = memo(UcdBoundaryNodeComponent);
