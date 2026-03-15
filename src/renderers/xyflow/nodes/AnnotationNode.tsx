/**
 * xyflow custom node for annotation / sticky-note elements.
 *
 * A notation-agnostic note box available in all palettes.
 * Renders as a yellow/amber sticky note with a folded corner effect.
 * Text content uses the element's name (editable via double-click).
 */
import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useNodeBehaviour } from '../hooks/useNodeBehaviour';
import { RoutingHandles } from './shared/RoutingHandles';

// ═══════════════════════════════════════
// Node data interface
// ═══════════════════════════════════════

export interface AnnotationNodeData {
  label: string;
  description?: string | null;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type AnnotationNodeType = Node<AnnotationNodeData, 'annotation'>;

// ═══════════════════════════════════════
// Colours
// ═══════════════════════════════════════

const COLOURS = {
  light: {
    bg: '#FEF3C7',
    stroke: '#D97706',
    text: '#78350F',
    fold: '#F59E0B',
  },
  dark: {
    bg: 'rgba(120, 53, 15, 0.15)',
    stroke: '#D97706',
    text: '#FDE68A',
    fold: '#92400E',
  },
} as const;

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

function AnnotationNodeComponent({ id, data, selected, width: nodeWidth, height: nodeHeight }: NodeProps<AnnotationNodeType>) {
  const { label, description, theme = 'dark', dimmed, onLabelChange } = data;
  const width = nodeWidth ?? 120;
  const height = nodeHeight ?? 80;
  const fold = 12;
  const colours = COLOURS[theme];

  const {
    editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit,
    isHovered, setIsHovered, isConnecting, opacity,
    connectorHandleStyle, targetHandleStyle,
  } = useNodeBehaviour({ id, label, dimmed, selected, theme, onLabelChange });

  const displayText = description || label;
  const selectedStroke = selected ? '#F59E0B' : colours.stroke;

  // SVG paths for the folded-corner shape
  const bodyPath = `M0,0 L${width - fold},0 L${width},${fold} L${width},${height} L0,${height} Z`;
  const foldPath = `M${width - fold},0 L${width - fold},${fold} L${width},${fold}`;

  return (
    <div
      style={{ opacity }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={width} height={height} overflow="visible">
        {/* Background shape */}
        <path d={bodyPath} fill={colours.bg} stroke={selectedStroke} strokeWidth={1.2} />
        {/* Fold triangle fill */}
        <path
          d={`M${width - fold},0 L${width},${fold} L${width - fold},${fold} Z`}
          fill={colours.fold}
          fillOpacity={0.3}
        />
        {/* Fold lines */}
        <path d={foldPath} fill="none" stroke={selectedStroke} strokeWidth={0.8} />

        {/* Text content — word-wrapped via foreignObject */}
        {!editing && (
          <foreignObject x={6} y={4} width={width - fold - 8} height={height - 8}>
            <div
              style={{
                fontSize: 9,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: colours.text,
                lineHeight: '12px',
                overflow: 'hidden',
                wordBreak: 'break-word',
                pointerEvents: 'none',
              }}
            >
              {displayText}
            </div>
          </foreignObject>
        )}

        {/* Inline edit */}
        {editing && (
          <foreignObject x={4} y={4} width={width - fold - 6} height={height - 8}>
            <textarea
              ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                if (e.key === 'Escape') cancelEdit();
                e.stopPropagation();
              }}
              style={{
                width: '100%',
                height: '100%',
                fontSize: 9,
                fontFamily: 'Inter, system-ui, sans-serif',
                background: theme === 'dark' ? '#1E293B' : '#FFFBEB',
                color: colours.text,
                border: '1px solid #F59E0B',
                borderRadius: 2,
                padding: '2px 3px',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'none',
                lineHeight: '12px',
              }}
            />
          </foreignObject>
        )}
      </svg>

      {/* Routing handles for auto-routing system */}
      <RoutingHandles />

      {/* Cardinal connector handles — visible on hover */}
      <Handle type="source" position={Position.Top}    id="conn-n" style={{ ...connectorHandleStyle(isHovered && !isConnecting), left: '50%', top: -6 }} />
      <Handle type="source" position={Position.Bottom} id="conn-s" style={{ ...connectorHandleStyle(isHovered && !isConnecting), left: '50%', bottom: -6 }} />
      <Handle type="source" position={Position.Left}   id="conn-w" style={{ ...connectorHandleStyle(isHovered && !isConnecting), top: '50%', left: -6 }} />
      <Handle type="source" position={Position.Right}  id="conn-e" style={{ ...connectorHandleStyle(isHovered && !isConnecting), top: '50%', right: -6 }} />

      {/* Cardinal target handles — shown during connection drag */}
      <Handle type="target" position={Position.Top}    id="conn-n-t" style={{ ...targetHandleStyle(isConnecting), left: '50%', top: -8 }} />
      <Handle type="target" position={Position.Bottom} id="conn-s-t" style={{ ...targetHandleStyle(isConnecting), left: '50%', bottom: -8 }} />
      <Handle type="target" position={Position.Left}   id="conn-w-t" style={{ ...targetHandleStyle(isConnecting), top: '50%', left: -8 }} />
      <Handle type="target" position={Position.Right}  id="conn-e-t" style={{ ...targetHandleStyle(isConnecting), top: '50%', right: -8 }} />
    </div>
  );
}

export const AnnotationNode = memo(AnnotationNodeComponent);
