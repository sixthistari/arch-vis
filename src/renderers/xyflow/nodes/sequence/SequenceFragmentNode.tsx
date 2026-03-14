/**
 * Sequence diagram combined fragment node.
 *
 * Renders the UML combined fragment overlay (alt, opt, loop, break, par,
 * critical) with a pentagon operator tab in the top-left corner and
 * optional compartment dividers.
 *
 * The fill uses pointer-events: none so that lifelines and messages
 * underneath remain interactive, while the border itself is selectable.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';

export interface SequenceFragmentNodeData {
  label: string;
  fragmentType: 'alt' | 'opt' | 'loop' | 'break' | 'par' | 'critical';
  guardCondition?: string;    // e.g. "[x > 0]"
  compartments?: string[];    // for alt: guard conditions for each compartment
  fragmentWidth?: number;     // default 300
  fragmentHeight?: number;    // default 150
  dimmed?: boolean;
  [key: string]: unknown;
}

type SequenceFragmentNodeType = Node<SequenceFragmentNodeData, 'sequence-fragment'>;

const TAB_WIDTH = 54;
const TAB_HEIGHT = 20;
const PENTAGON_NOTCH = 8;
const BORDER_COLOUR = '#6B7280';
const TAB_BG = '#E5E7EB';
const TAB_TEXT = '#374151';
const TEXT_COLOUR = '#374151';

function SequenceFragmentNodeComponent({ data, selected }: NodeProps<SequenceFragmentNodeType>) {
  const {
    fragmentType,
    guardCondition,
    compartments,
    fragmentWidth = 300,
    fragmentHeight = 150,
    dimmed,
  } = data;

  const stroke = selected ? '#F59E0B' : BORDER_COLOUR;
  const opacity = dimmed ? 0.1 : 1;

  // Pentagon tab path — rectangle with bottom-right corner clipped
  const tabPath = `M0,0 L${TAB_WIDTH},0 L${TAB_WIDTH},${TAB_HEIGHT - PENTAGON_NOTCH} L${TAB_WIDTH - PENTAGON_NOTCH},${TAB_HEIGHT} L0,${TAB_HEIGHT} Z`;

  // Compute compartment divider positions (evenly spaced below the tab)
  const dividerCount = compartments ? compartments.length - 1 : 0;
  const contentTop = TAB_HEIGHT + 4;
  const contentHeight = fragmentHeight - contentTop;

  return (
    <div style={{ opacity, pointerEvents: 'none' as const }}>
      <svg
        width={fragmentWidth}
        height={fragmentHeight}
        overflow="visible"
        style={{ pointerEvents: 'none' }}
      >
        {/* Frame — border is interactive, fill is not */}
        <rect
          x={0} y={0}
          width={fragmentWidth} height={fragmentHeight}
          stroke={stroke}
          fill="rgba(249,250,251,0.3)"
          strokeWidth={1.2}
          style={{ pointerEvents: 'none' }}
        />
        {/* Invisible wider border for easier selection */}
        <rect
          x={0} y={0}
          width={fragmentWidth} height={fragmentHeight}
          stroke="transparent"
          fill="none"
          strokeWidth={8}
          style={{ pointerEvents: 'stroke' as unknown as undefined }}
        />

        {/* Pentagon operator tab */}
        <path
          d={tabPath}
          stroke={stroke}
          fill={TAB_BG}
          strokeWidth={1}
          style={{ pointerEvents: 'all' }}
        />

        {/* Operator text */}
        <text
          x={TAB_WIDTH / 2} y={TAB_HEIGHT / 2 + 1}
          textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={600} fill={TAB_TEXT}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {fragmentType}
        </text>

        {/* Guard condition */}
        {guardCondition && (
          <text
            x={TAB_WIDTH + 8}
            y={TAB_HEIGHT + 14}
            dominantBaseline="central"
            fontSize={9} fill={TEXT_COLOUR}
            fontFamily="Inter, system-ui, sans-serif"
            fontStyle="italic"
            style={{ pointerEvents: 'none' }}
          >
            [{guardCondition}]
          </text>
        )}

        {/* Compartment dividers for alt fragments */}
        {dividerCount > 0 && Array.from({ length: dividerCount }).map((_, i) => {
          const y = contentTop + ((i + 1) / (dividerCount + 1)) * contentHeight;
          return (
            <g key={i}>
              <line
                x1={0} y1={y} x2={fragmentWidth} y2={y}
                stroke={stroke} strokeWidth={1} strokeDasharray="6 4"
              />
              {/* Compartment guard label */}
              {compartments && compartments[i + 1] && (
                <text
                  x={8} y={y + 14}
                  fontSize={9} fill={TEXT_COLOUR}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontStyle="italic"
                  style={{ pointerEvents: 'none' }}
                >
                  [{compartments[i + 1]}]
                </text>
              )}
            </g>
          );
        })}

        {/* First compartment guard label (if compartments provided) */}
        {compartments && compartments[0] && !guardCondition && (
          <text
            x={TAB_WIDTH + 8}
            y={TAB_HEIGHT + 14}
            dominantBaseline="central"
            fontSize={9} fill={TEXT_COLOUR}
            fontFamily="Inter, system-ui, sans-serif"
            fontStyle="italic"
            style={{ pointerEvents: 'none' }}
          >
            [{compartments[0]}]
          </text>
        )}
      </svg>
    </div>
  );
}

export const SequenceFragmentNode = memo(SequenceFragmentNodeComponent);
