/**
 * Wireframe Navigation node.
 *
 * Supports: horizontal navbar, vertical sidebar menu, tabs,
 * breadcrumbs, pagination, stepper/wizard.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export type WfNavType = 'horizontal' | 'vertical' | 'tabs' | 'breadcrumbs' | 'pagination' | 'stepper';

export interface WfNavNodeData {
  label: string;
  navType: WfNavType;
  items: string[];
  activeIndex?: number;
  navWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfNavNodeType = Node<WfNavNodeData, 'wf-nav'>;

const WF_BORDER = '#9CA3AF';
const WF_BG = '#F3F4F6';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';
const WF_ACTIVE = '#1F2937';
const WF_ACTIVE_BG = '#E5E7EB';
const ITEM_H = 28;
const ITEM_PAD = 12;

function WfNavNodeComponent({ id, data, selected }: NodeProps<WfNavNodeType>) {
  const {
    label,
    navType,
    items = [],
    activeIndex = 0,
    navWidth = 360,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  // Shared edit overlay rendered above the SVG content
  const renderEditOverlay = (w: number) => editing ? (
    <div
      style={{
        position: 'absolute',
        top: -24,
        left: 0,
        width: w,
        zIndex: 10,
      }}
    >
      <EditableInput
        inputRef={inputRef}
        value={editValue}
        onChange={setEditValue}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        fontSize={10}
      />
    </div>
  ) : null;

  // ── Horizontal navbar ──
  if (navType === 'horizontal') {
    const h = 36;
    const itemW = navWidth / Math.max(items.length, 1);
    return (
      <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
        {renderEditOverlay(navWidth)}
        <svg width={navWidth} height={h} overflow="visible">
          <rect x={0} y={0} width={navWidth} height={h} fill={WF_BG} stroke={stroke} strokeWidth={1} />
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const x = i * itemW;
            return (
              <g key={i}>
                {isActive && <rect x={x} y={0} width={itemW} height={h} fill={WF_ACTIVE_BG} />}
                <text
                  x={x + itemW / 2} y={h / 2 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={10} fontWeight={isActive ? 600 : 400}
                  fill={isActive ? WF_ACTIVE : WF_MUTED}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item}
                </text>
                {isActive && <rect x={x} y={h - 2} width={itemW} height={2} fill={WF_ACTIVE} />}
              </g>
            );
          })}
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Vertical sidebar menu ──
  if (navType === 'vertical') {
    const w = Math.min(navWidth, 200);
    const h = items.length * ITEM_H + 8;
    return (
      <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
        {renderEditOverlay(w)}
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} fill={WF_BG} stroke={stroke} strokeWidth={1} rx={2} />
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const y = 4 + i * ITEM_H;
            return (
              <g key={i}>
                {isActive && <rect x={2} y={y} width={w - 4} height={ITEM_H} rx={3} fill={WF_ACTIVE_BG} />}
                <text
                  x={ITEM_PAD} y={y + ITEM_H / 2 + 1}
                  dominantBaseline="central"
                  fontSize={11} fontWeight={isActive ? 600 : 400}
                  fill={isActive ? WF_ACTIVE : WF_TEXT}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item}
                </text>
              </g>
            );
          })}
        </svg>
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Tabs ──
  if (navType === 'tabs') {
    const h = 34;
    const tabW = Math.max(80, navWidth / items.length);
    const totalW = tabW * items.length;
    return (
      <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
        {renderEditOverlay(totalW)}
        <svg width={totalW} height={h} overflow="visible">
          <line x1={0} y1={h - 1} x2={totalW} y2={h - 1} stroke={WF_BORDER} strokeWidth={1} />
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const x = i * tabW;
            return (
              <g key={i}>
                {isActive && (
                  <rect x={x + 1} y={0} width={tabW - 2} height={h - 1} fill={WF_BG} stroke={WF_BORDER} strokeWidth={1} rx={3} />
                )}
                <text
                  x={x + tabW / 2} y={h / 2}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={10} fontWeight={isActive ? 600 : 400}
                  fill={isActive ? WF_ACTIVE : WF_MUTED}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {item}
                </text>
                {isActive && <rect x={x + 1} y={h - 2} width={tabW - 2} height={2} fill={WF_ACTIVE} />}
              </g>
            );
          })}
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Breadcrumbs ──
  if (navType === 'breadcrumbs') {
    const h = 24;
    return (
      <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
        {renderEditOverlay(navWidth)}
        <svg width={navWidth} height={h} overflow="visible">
          <text
            x={4} y={h / 2 + 1}
            dominantBaseline="central"
            fontSize={10} fill={WF_TEXT}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {items.map((item, i) => (
              <tspan key={i} fill={i === items.length - 1 ? WF_ACTIVE : WF_MUTED} fontWeight={i === items.length - 1 ? 600 : 400}>
                {i > 0 ? ' / ' : ''}{item}
              </tspan>
            ))}
          </text>
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Pagination ──
  if (navType === 'pagination') {
    const btnW = 28;
    const h = 30;
    const totalW = items.length * btnW + 2 * btnW; // prev + pages + next
    return (
      <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
        {renderEditOverlay(totalW)}
        <svg width={totalW} height={h} overflow="visible">
          {/* Prev */}
          <rect x={0} y={2} width={btnW} height={h - 4} rx={3} stroke={WF_BORDER} fill="white" strokeWidth={0.8} />
          <text x={btnW / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={WF_MUTED}>‹</text>

          {/* Page numbers */}
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            const x = btnW + i * btnW;
            return (
              <g key={i}>
                <rect x={x} y={2} width={btnW} height={h - 4} rx={3} stroke={WF_BORDER} fill={isActive ? WF_ACTIVE : 'white'} strokeWidth={0.8} />
                <text x={x + btnW / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={isActive ? 'white' : WF_TEXT}>{item}</text>
              </g>
            );
          })}

          {/* Next */}
          <rect x={btnW + items.length * btnW} y={2} width={btnW} height={h - 4} rx={3} stroke={WF_BORDER} fill="white" strokeWidth={0.8} />
          <text x={btnW + items.length * btnW + btnW / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={WF_MUTED}>›</text>
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Stepper / Wizard ──
  const stepH = 40;
  const stepW = navWidth;
  const circleR = 10;
  const stepGap = stepW / Math.max(items.length, 1);
  return (
    <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
      {renderEditOverlay(stepW)}
      <svg width={stepW} height={stepH} overflow="visible">
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          const cx = stepGap * i + stepGap / 2;
          const cy = 14;
          return (
            <g key={i}>
              {/* Connector line */}
              {i > 0 && (
                <line
                  x1={stepGap * (i - 1) + stepGap / 2 + circleR}
                  y1={cy}
                  x2={cx - circleR}
                  y2={cy}
                  stroke={isDone ? WF_ACTIVE : WF_BORDER}
                  strokeWidth={1.5}
                />
              )}
              <circle cx={cx} cy={cy} r={circleR} fill={isDone || isActive ? WF_ACTIVE : 'white'} stroke={WF_BORDER} strokeWidth={1.2} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={isDone || isActive ? 'white' : WF_TEXT}>
                {isDone ? '✓' : i + 1}
              </text>
              <text x={cx} y={cy + circleR + 10} textAnchor="middle" fontSize={8} fill={isActive ? WF_ACTIVE : WF_MUTED}>
                {item}
              </text>
            </g>
          );
        })}
      </svg>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const WfNavNode = memo(WfNavNodeComponent);
