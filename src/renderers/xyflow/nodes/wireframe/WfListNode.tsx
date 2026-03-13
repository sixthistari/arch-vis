/**
 * Wireframe List node — ordered, unordered, action list, card list.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type WfListType = 'ordered' | 'unordered' | 'action' | 'card';

export interface WfListItem {
  text: string;
  subtext?: string;
  action?: string; // button label for action lists
}

export interface WfListNodeData {
  label: string;
  listType: WfListType;
  items: WfListItem[];
  listWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type WfListNodeType = Node<WfListNodeData, 'wf-list'>;

const WF_BORDER = '#D1D5DB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';
const ITEM_H = 32;
const CARD_ITEM_H = 52;
const PAD = 8;

function WfListNodeComponent({ data, selected }: NodeProps<WfListNodeType>) {
  const {
    listType,
    items = [],
    listWidth = 280,
    dimmed,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;
  const w = listWidth;

  // ── Card list ──
  if (listType === 'card') {
    const h = items.length * (CARD_ITEM_H + PAD) + PAD;
    return (
      <div style={{ opacity }}>
        <svg width={w} height={h} overflow="visible">
          {items.map((item, i) => {
            const y = PAD + i * (CARD_ITEM_H + PAD);
            return (
              <g key={i}>
                <rect x={0} y={y} width={w} height={CARD_ITEM_H} rx={6} fill="white" stroke={WF_BORDER} strokeWidth={0.8} />
                {/* Avatar placeholder */}
                <circle cx={24} cy={y + CARD_ITEM_H / 2} r={14} fill="#E5E7EB" stroke="none" />
                <text x={46} y={y + 18} fontSize={11} fontWeight={500} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                  {item.text}
                </text>
                {item.subtext && (
                  <text x={46} y={y + 34} fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                    {item.subtext}
                  </text>
                )}
                {item.action && (
                  <g>
                    <rect x={w - 64} y={y + CARD_ITEM_H / 2 - 10} width={54} height={20} rx={3} fill="white" stroke={WF_BORDER} strokeWidth={0.6} />
                    <text x={w - 37} y={y + CARD_ITEM_H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                      {item.action}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Standard list (ordered, unordered, action) ──
  const h = items.length * ITEM_H + 4;
  return (
    <div style={{ opacity }}>
      <svg width={w} height={h} overflow="visible">
        <rect x={0} y={0} width={w} height={h} rx={4} fill="white" stroke={stroke} strokeWidth={0.8} />
        {items.map((item, i) => {
          const y = 2 + i * ITEM_H;
          const isLast = i === items.length - 1;
          const bulletX = 12;
          const textX = listType === 'ordered' ? 28 : listType === 'unordered' ? 24 : 12;
          return (
            <g key={i}>
              {/* Bullet / number */}
              {listType === 'ordered' && (
                <text x={bulletX} y={y + ITEM_H / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                  {i + 1}.
                </text>
              )}
              {listType === 'unordered' && (
                <circle cx={bulletX} cy={y + ITEM_H / 2} r={2.5} fill={WF_MUTED} />
              )}

              {/* Item text */}
              <text x={textX} y={y + ITEM_H / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                {item.text}
              </text>

              {/* Action button */}
              {listType === 'action' && item.action && (
                <g>
                  <rect x={w - 58} y={y + ITEM_H / 2 - 9} width={48} height={18} rx={3} fill="white" stroke={WF_BORDER} strokeWidth={0.6} />
                  <text x={w - 34} y={y + ITEM_H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                    {item.action}
                  </text>
                </g>
              )}

              {/* Divider */}
              {!isLast && (
                <line x1={4} y1={y + ITEM_H} x2={w - 4} y2={y + ITEM_H} stroke={WF_BORDER} strokeWidth={0.3} />
              )}
            </g>
          );
        })}
      </svg>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const WfListNode = memo(WfListNodeComponent);
