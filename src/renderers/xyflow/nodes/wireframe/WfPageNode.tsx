/**
 * Wireframe Page node — browser chrome container.
 *
 * Renders a browser window frame with:
 * - Title bar with traffic light dots (close/min/max)
 * - URL bar with placeholder
 * - Content area (children rendered by xyflow parent-child)
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export interface WfPageNodeData {
  label: string;
  url?: string;
  pageWidth?: number;
  pageHeight?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfPageNodeType = Node<WfPageNodeData, 'wf-page'>;

const TITLE_BAR_H = 24;
const URL_BAR_H = 22;
const CHROME_H = TITLE_BAR_H + URL_BAR_H;
const DOT_R = 4;
const DOT_GAP = 14;

const WF_BORDER = '#9CA3AF';
const WF_BG = '#FAFAFA';
const WF_CHROME = '#E5E7EB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';

function WfPageNodeComponent({ id, data, selected }: NodeProps<WfPageNodeType>) {
  const {
    label,
    url = '/page',
    pageWidth = 420,
    pageHeight = 520,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  return (
    <div style={{ opacity }}>
      <svg width={pageWidth} height={pageHeight} overflow="visible">
        {/* Outer frame */}
        <rect x={0} y={0} width={pageWidth} height={pageHeight} rx={6} ry={6} stroke={stroke} fill={WF_BG} strokeWidth={1.5} />

        {/* Title bar */}
        <rect x={0} y={0} width={pageWidth} height={TITLE_BAR_H} rx={6} ry={6} fill={WF_CHROME} stroke="none" />
        <rect x={0} y={TITLE_BAR_H - 4} width={pageWidth} height={4} fill={WF_CHROME} stroke="none" />

        {/* Traffic light dots */}
        <circle cx={14} cy={TITLE_BAR_H / 2} r={DOT_R} fill="#EF4444" />
        <circle cx={14 + DOT_GAP} cy={TITLE_BAR_H / 2} r={DOT_R} fill="#F59E0B" />
        <circle cx={14 + DOT_GAP * 2} cy={TITLE_BAR_H / 2} r={DOT_R} fill="#22C55E" />

        {/* Page title */}
        {!editing && (
          <text
            x={pageWidth / 2} y={TITLE_BAR_H / 2 + 1}
            textAnchor="middle" dominantBaseline="central"
            fontSize={10} fill={WF_TEXT}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'all', cursor: 'default' }}
            onDoubleClick={handleDoubleClick}
          >
            {label}
          </text>
        )}
        {editing && (
          <foreignObject x={60} y={2} width={pageWidth - 120} height={TITLE_BAR_H - 4}>
            <EditableInput
              inputRef={inputRef}
              value={editValue}
              onChange={setEditValue}
              onCommit={commitEdit}
              onCancel={cancelEdit}
              fontSize={10}
              textAlign="center"
            />
          </foreignObject>
        )}

        {/* URL bar */}
        <rect x={8} y={TITLE_BAR_H + 3} width={pageWidth - 16} height={URL_BAR_H - 6} rx={3} fill="white" stroke={WF_BORDER} strokeWidth={0.8} />
        <text
          x={18} y={TITLE_BAR_H + URL_BAR_H / 2 + 1}
          dominantBaseline="central"
          fontSize={9} fill={WF_MUTED}
          fontFamily="'JetBrains Mono', monospace"
          style={{ pointerEvents: 'none' }}
        >
          {url}
        </text>

        {/* Content area outline */}
        <rect x={1} y={CHROME_H} width={pageWidth - 2} height={pageHeight - CHROME_H - 1} fill="none" stroke="none" />
      </svg>

      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const WfPageNode = memo(WfPageNodeComponent);
