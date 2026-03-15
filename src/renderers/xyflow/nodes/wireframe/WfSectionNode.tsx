/**
 * Wireframe Section node — generic nestable container.
 *
 * Supports: card, panel, modal, drawer, sidebar, header, footer,
 * accordion, column-layout. All render as lo-fi grey containers
 * with optional title bar.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export type WfSectionType = 'card' | 'panel' | 'modal' | 'drawer' | 'sidebar' |
  'header' | 'footer' | 'accordion' | 'columns' | 'section';

export interface WfSectionNodeData {
  label: string;
  sectionType: WfSectionType;
  title?: string;
  columns?: number;
  sectionWidth?: number;
  sectionHeight?: number;
  collapsed?: boolean; // for accordion
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfSectionNodeType = Node<WfSectionNodeData, 'wf-section'>;

const WF_BORDER = '#9CA3AF';
const WF_BG = '#F9FAFB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';
const TITLE_H = 28;

function WfSectionNodeComponent({ id, data, selected }: NodeProps<WfSectionNodeType>) {
  const {
    label,
    sectionType,
    title,
    columns,
    sectionWidth = 380,
    sectionHeight = 200,
    collapsed,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;
  const displayTitle = title ?? label;

  // Inline label editing — uses displayTitle for initial value but commits against label
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);
  const hasTitle = !!displayTitle;
  const rx = sectionType === 'card' ? 6 : sectionType === 'modal' ? 8 : 2;

  // Modal gets a shadow-like double border
  const isModal = sectionType === 'modal';
  // Drawer is taller, attached to edge
  const isDrawer = sectionType === 'drawer';
  // Sidebar is narrow and tall
  const isSidebar = sectionType === 'sidebar';
  const w = isSidebar ? Math.min(sectionWidth, 200) : sectionWidth;
  const h = isDrawer ? Math.max(sectionHeight, 400) : collapsed ? TITLE_H + 4 : sectionHeight;

  return (
    <div style={{ opacity }}>
      <svg width={w + (isModal ? 4 : 0)} height={h + (isModal ? 4 : 0)} overflow="visible">
        {/* Modal backdrop shadow */}
        {isModal && (
          <rect x={4} y={4} width={w} height={h} rx={rx} fill="#00000015" stroke="none" />
        )}

        {/* Main container */}
        <rect x={0} y={0} width={w} height={h} rx={rx} stroke={stroke} fill={WF_BG} strokeWidth={1.2} />

        {/* Title bar */}
        {hasTitle && (
          <>
            <rect x={0} y={0} width={w} height={TITLE_H} rx={rx} fill="#E5E7EB" stroke="none" />
            {rx > 2 ? null : <rect x={0} y={TITLE_H - 2} width={w} height={2} fill="#E5E7EB" stroke="none" />}
            <line x1={0} y1={TITLE_H} x2={w} y2={TITLE_H} stroke={stroke} strokeWidth={0.8} />

            {!editing && (
              <text
                x={10} y={TITLE_H / 2 + 1}
                dominantBaseline="central"
                fontSize={11} fontWeight={600} fill={WF_TEXT}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ pointerEvents: 'all', cursor: 'default' }}
                onDoubleClick={handleDoubleClick}
              >
                {displayTitle}
              </text>
            )}
            {editing && (
              <foreignObject x={4} y={4} width={w - 40} height={TITLE_H - 8}>
                <EditableInput
                  inputRef={inputRef}
                  value={editValue}
                  onChange={setEditValue}
                  onCommit={commitEdit}
                  onCancel={cancelEdit}
                  fontSize={11}
                />
              </foreignObject>
            )}

            {/* Accordion chevron */}
            {sectionType === 'accordion' && (
              <text
                x={w - 16} y={TITLE_H / 2 + 1}
                dominantBaseline="central" textAnchor="middle"
                fontSize={12} fill={WF_MUTED}
                style={{ pointerEvents: 'none' }}
              >
                {collapsed ? '▸' : '▾'}
              </text>
            )}

            {/* Modal close button */}
            {isModal && (
              <text
                x={w - 14} y={TITLE_H / 2 + 1}
                dominantBaseline="central" textAnchor="middle"
                fontSize={14} fill={WF_MUTED}
                style={{ pointerEvents: 'none' }}
              >
                ✕
              </text>
            )}
          </>
        )}

        {/* Column dividers */}
        {sectionType === 'columns' && columns && columns > 1 && !collapsed && (
          Array.from({ length: columns - 1 }).map((_, i) => {
            const colX = ((i + 1) / columns) * w;
            const topY = hasTitle ? TITLE_H : 0;
            return (
              <line key={i} x1={colX} y1={topY + 4} x2={colX} y2={h - 4} stroke={WF_BORDER} strokeWidth={0.5} strokeDasharray="4 3" />
            );
          })
        )}

        {/* Header/Footer indicators */}
        {sectionType === 'header' && (
          <line x1={0} y1={h} x2={w} y2={h} stroke={stroke} strokeWidth={1.5} />
        )}
        {sectionType === 'footer' && (
          <line x1={0} y1={0} x2={w} y2={0} stroke={stroke} strokeWidth={1.5} />
        )}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const WfSectionNode = memo(WfSectionNodeComponent);
