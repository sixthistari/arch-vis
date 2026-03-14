/**
 * Sequence diagram lifeline node.
 *
 * Renders a header rectangle with the participant name and a dashed vertical
 * line extending downward to represent the passage of time.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export interface SequenceLifelineNodeData {
  label: string;
  stereotype?: string;       // e.g. "<<actor>>", "<<boundary>>"
  lifelineHeight?: number;   // length of the dashed line (default 400)
  destroyed?: boolean;       // show X terminator at bottom
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type SequenceLifelineNodeType = Node<SequenceLifelineNodeData, 'sequence-lifeline'>;

const HEADER_WIDTH = 120;
const HEADER_HEIGHT = 40;
const DEFAULT_LIFELINE_HEIGHT = 400;

const BORDER_COLOUR = '#6B7280';
const HEADER_FILL = '#F9FAFB';
const DASHED_COLOUR = '#9CA3AF';
const TEXT_COLOUR = '#374151';

function SequenceLifelineNodeComponent({ id, data, selected }: NodeProps<SequenceLifelineNodeType>) {
  const {
    label,
    stereotype,
    lifelineHeight = DEFAULT_LIFELINE_HEIGHT,
    destroyed,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : BORDER_COLOUR;
  const opacity = dimmed ? 0.1 : 1;
  const cx = HEADER_WIDTH / 2;
  const totalHeight = HEADER_HEIGHT + lifelineHeight;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  // Compute label Y position (shifted down if stereotype is present)
  const labelY = stereotype
    ? HEADER_HEIGHT / 2 + 5
    : HEADER_HEIGHT / 2;

  return (
    <div style={{ opacity }}>
      <svg width={HEADER_WIDTH} height={totalHeight} overflow="visible">
        {/* Header rectangle */}
        <rect
          x={0} y={0}
          width={HEADER_WIDTH} height={HEADER_HEIGHT}
          stroke={stroke} fill={HEADER_FILL} strokeWidth={1.5}
        />

        {/* Stereotype text */}
        {stereotype && (
          <text
            x={cx} y={12}
            textAnchor="middle" dominantBaseline="central"
            fontSize={9} fill={TEXT_COLOUR}
            fontFamily="Inter, system-ui, sans-serif"
            fontStyle="italic"
            style={{ pointerEvents: 'none' }}
          >
            {stereotype.startsWith('\u00AB') ? stereotype : `\u00AB${stereotype}\u00BB`}
          </text>
        )}

        {/* Participant label */}
        {!editing && (
          <text
            x={cx} y={labelY}
            textAnchor="middle" dominantBaseline="central"
            fontSize={11} fill={TEXT_COLOUR}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'all', cursor: 'default' }}
            onDoubleClick={handleDoubleClick}
          >
            {label}
          </text>
        )}
        {editing && (
          <foreignObject x={4} y={labelY - 9} width={HEADER_WIDTH - 8} height={20}>
            <EditableInput
              inputRef={inputRef}
              value={editValue}
              onChange={setEditValue}
              onCommit={commitEdit}
              onCancel={cancelEdit}
              fontSize={11}
              textAlign="center"
            />
          </foreignObject>
        )}

        {/* Dashed lifeline */}
        <line
          x1={cx} y1={HEADER_HEIGHT}
          x2={cx} y2={totalHeight}
          stroke={DASHED_COLOUR} strokeWidth={1} strokeDasharray="6 4"
        />

        {/* Destroy marker (X) */}
        {destroyed && (
          <g>
            <line x1={cx - 8} y1={totalHeight - 16} x2={cx + 8} y2={totalHeight} stroke={stroke} strokeWidth={2} />
            <line x1={cx + 8} y1={totalHeight - 16} x2={cx - 8} y2={totalHeight} stroke={stroke} strokeWidth={2} />
          </g>
        )}
      </svg>

      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ visibility: 'hidden', top: HEADER_HEIGHT + 20 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ visibility: 'hidden', top: HEADER_HEIGHT + 20 }} />
    </div>
  );
}

export const SequenceLifelineNode = memo(SequenceLifelineNodeComponent);
