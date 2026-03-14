/**
 * Sequence diagram message edge.
 *
 * Custom xyflow edge that renders UML sequence messages with the correct
 * line style, arrowhead, and label for each message type.
 *
 * Message types:
 *   sync    — solid line, filled triangle arrowhead
 *   async   — solid line, open arrowhead
 *   return  — dashed line, open arrowhead
 *   create  — dashed line, open arrowhead, <<create>> annotation
 *   destroy — solid line, filled arrowhead, X at target
 *   self    — loop-back arc from source back to source
 */
import { memo } from 'react';
import { type EdgeProps, type Edge } from '@xyflow/react';

export interface SequenceMessageEdgeData {
  messageType: 'sync' | 'async' | 'return' | 'create' | 'destroy' | 'self';
  label?: string;
  sequenceNumber?: number;
  [key: string]: unknown;
}

type SequenceMessageEdgeType = Edge<SequenceMessageEdgeData, 'sequence-message'>;

const STROKE_COLOUR = '#374151';
const SELECTED_COLOUR = '#F59E0B';
const LABEL_COLOUR = '#374151';
const ARROW_SIZE = 8;
const SELF_LOOP_WIDTH = 40;
const SELF_LOOP_HEIGHT = 30;

interface MessageStyle {
  strokeDash?: string;
  strokeWidth: number;
  filledArrow: boolean;   // true = solid triangle, false = open V
}

const MESSAGE_STYLES: Record<string, MessageStyle> = {
  sync:    { strokeWidth: 1.2, filledArrow: true },
  async:   { strokeWidth: 1, filledArrow: false },
  return:  { strokeDash: '6 3', strokeWidth: 1, filledArrow: false },
  create:  { strokeDash: '6 3', strokeWidth: 1, filledArrow: false },
  destroy: { strokeWidth: 1.2, filledArrow: true },
  self:    { strokeWidth: 1, filledArrow: true },
};

/** Build display label including optional sequence number prefix. */
function buildLabel(data: SequenceMessageEdgeData): string {
  const parts: string[] = [];
  if (data.sequenceNumber != null) {
    parts.push(`${data.sequenceNumber}: `);
  }
  if (data.messageType === 'create') {
    parts.push('\u00ABcreate\u00BB');
    if (data.label) parts.push(` ${data.label}`);
  } else if (data.label) {
    parts.push(data.label);
  }
  return parts.join('');
}

/** Render an arrowhead (filled triangle or open V) at the given tip pointing in the given direction. */
function renderArrowhead(
  tipX: number,
  tipY: number,
  direction: 'right' | 'left',
  filled: boolean,
  colour: string,
): React.ReactElement {
  const dx = direction === 'right' ? -ARROW_SIZE : ARROW_SIZE;
  const dy = ARROW_SIZE / 2;
  const points = `${tipX},${tipY} ${tipX + dx},${tipY - dy} ${tipX + dx},${tipY + dy}`;

  if (filled) {
    return <polygon key="arrow" points={points} fill={colour} stroke="none" />;
  }
  const d = `M${tipX + dx},${tipY - dy} L${tipX},${tipY} L${tipX + dx},${tipY + dy}`;
  return <path key="arrow" d={d} fill="none" stroke={colour} strokeWidth={1.2} />;
}

/** Render a destroy X marker at the given position. */
function renderDestroyMarker(x: number, y: number, colour: string): React.ReactElement {
  const size = 8;
  return (
    <g key="destroy">
      <line x1={x - size} y1={y - size} x2={x + size} y2={y + size} stroke={colour} strokeWidth={2} />
      <line x1={x + size} y1={y - size} x2={x - size} y2={y + size} stroke={colour} strokeWidth={2} />
    </g>
  );
}

function SequenceMessageEdgeComponent(props: EdgeProps<SequenceMessageEdgeType>) {
  const { sourceX, sourceY, targetX, targetY, data, selected } = props;

  const messageType = data?.messageType ?? 'sync';
  const style = MESSAGE_STYLES[messageType] ?? MESSAGE_STYLES['sync']!;
  const colour = selected ? SELECTED_COLOUR : STROKE_COLOUR;
  const displayLabel = data ? buildLabel(data) : '';

  // Self-message: loop-back arc
  if (messageType === 'self') {
    const x0 = sourceX;
    const y0 = sourceY;
    const xRight = x0 + SELF_LOOP_WIDTH;
    const yBottom = y0 + SELF_LOOP_HEIGHT;

    const d = `M${x0},${y0} L${xRight},${y0} L${xRight},${yBottom} L${x0},${yBottom}`;

    return (
      <g>
        <path
          d={d}
          fill="none"
          stroke={colour}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDash}
        />
        {renderArrowhead(x0, yBottom, 'left', style.filledArrow, colour)}
        {displayLabel && (
          <text
            x={xRight + 4}
            y={y0 + SELF_LOOP_HEIGHT / 2}
            fontSize={10}
            fill={LABEL_COLOUR}
            fontFamily="Inter, system-ui, sans-serif"
            dominantBaseline="central"
            style={{ pointerEvents: 'none' }}
          >
            {displayLabel}
          </text>
        )}
      </g>
    );
  }

  // Regular horizontal message
  const direction: 'right' | 'left' = targetX >= sourceX ? 'right' : 'left';

  // Line path (straight horizontal)
  const d = `M${sourceX},${sourceY} L${targetX},${targetY}`;

  // Label position — above the midpoint
  const labelX = (sourceX + targetX) / 2;
  const labelY = Math.min(sourceY, targetY) - 6;

  return (
    <g>
      {/* Message line */}
      <path
        d={d}
        fill="none"
        stroke={colour}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDash}
      />

      {/* Arrowhead at target */}
      {renderArrowhead(targetX, targetY, direction, style.filledArrow, colour)}

      {/* Destroy X at target endpoint */}
      {messageType === 'destroy' && renderDestroyMarker(targetX, targetY, colour)}

      {/* Label above the line */}
      {displayLabel && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={10}
          fill={LABEL_COLOUR}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {displayLabel}
        </text>
      )}
    </g>
  );
}

export const SequenceMessageEdge = memo(SequenceMessageEdgeComponent);
