/**
 * Sequence diagram activation bar node.
 *
 * A narrow rectangle drawn on top of a lifeline to indicate that the
 * participant is actively processing a message.  Typically positioned
 * as a child of a lifeline node (via parentId).
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export interface SequenceActivationNodeData {
  activationHeight?: number; // default 60
  dimmed?: boolean;
  [key: string]: unknown;
}

type SequenceActivationNodeType = Node<SequenceActivationNodeData, 'sequence-activation'>;

const ACTIVATION_WIDTH = 12;
const DEFAULT_ACTIVATION_HEIGHT = 60;
const BORDER_COLOUR = '#6B7280';

function SequenceActivationNodeComponent({ data, selected }: NodeProps<SequenceActivationNodeType>) {
  const { activationHeight = DEFAULT_ACTIVATION_HEIGHT, dimmed } = data;
  const stroke = selected ? '#F59E0B' : BORDER_COLOUR;
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ opacity }}>
      <svg width={ACTIVATION_WIDTH} height={activationHeight} overflow="visible">
        <rect
          x={0} y={0}
          width={ACTIVATION_WIDTH} height={activationHeight}
          stroke={stroke} fill="#FFFFFF" strokeWidth={1}
        />
      </svg>
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const SequenceActivationNode = memo(SequenceActivationNodeComponent);
