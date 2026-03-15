/**
 * Wireframe Control node — individual UI controls.
 *
 * button, input, search, text, link, image placeholder,
 * avatar, badge/tag, stat-card, progress bar, icon button.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export type WfControlType = 'button' | 'input' | 'search' | 'text' | 'heading' |
  'link' | 'image' | 'avatar' | 'badge' | 'stat-card' | 'progress' | 'icon-button' | 'divider';

export type WfButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface WfControlNodeData {
  label: string;
  controlType: WfControlType;
  variant?: WfButtonVariant;
  placeholder?: string;
  value?: string;
  progress?: number; // 0-100 for progress bar
  controlWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfControlNodeType = Node<WfControlNodeData, 'wf-control'>;

const WF_BORDER = '#D1D5DB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';

function WfControlNodeComponent({ id, data, selected }: NodeProps<WfControlNodeType>) {
  const {
    label,
    controlType,
    variant = 'secondary',
    placeholder,
    value,
    progress = 0,
    controlWidth = 160,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  // Shared inline edit input rendered as an overlay
  const renderEditInput = (w: number, h: number, fontSize = 11) => (
    <foreignObject x={2} y={h / 2 - 10} width={w - 4} height={20}>
      <EditableInput
        inputRef={inputRef}
        value={editValue}
        onChange={setEditValue}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        fontSize={fontSize}
        textAlign="center"
      />
    </foreignObject>
  );

  // ── Button ──
  if (controlType === 'button' || controlType === 'icon-button') {
    const h = 32;
    const w = controlType === 'icon-button' ? 32 : controlWidth;
    const fills: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: '#374151', text: 'white', border: '#374151' },
      secondary: { bg: 'white', text: WF_TEXT, border: WF_BORDER },
      danger: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
      ghost: { bg: 'transparent', text: WF_MUTED, border: 'transparent' },
    };
    const f = fills[variant] ?? fills.secondary!;
    const fb = f!;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={4} fill={fb.bg} stroke={fb.border} strokeWidth={1} />
          {!editing && (
            <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={500} fill={fb.text} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          )}
          {editing && renderEditInput(w, h)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Text input ──
  if (controlType === 'input') {
    const h = 28;
    return (
      <div style={{ opacity }}>
        <svg width={controlWidth} height={h} overflow="visible">
          <rect x={0} y={0} width={controlWidth} height={h} rx={3} fill="white" stroke={stroke} strokeWidth={0.8} />
          <text x={8} y={h / 2 + 1} dominantBaseline="central" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {placeholder ?? label}
          </text>
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Search bar ──
  if (controlType === 'search') {
    const h = 32;
    return (
      <div style={{ opacity }}>
        <svg width={controlWidth} height={h} overflow="visible">
          <rect x={0} y={0} width={controlWidth} height={h} rx={16} fill="white" stroke={stroke} strokeWidth={0.8} />
          <text x={14} y={h / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            🔍 {placeholder ?? 'Search...'}
          </text>
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Heading ──
  if (controlType === 'heading') {
    const h = 28;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={controlWidth} height={h} overflow="visible">
          {!editing && (
            <text x={0} y={h * 0.7} fontSize={16} fontWeight={700} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          )}
          {editing && renderEditInput(controlWidth, h, 16)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Text block ──
  if (controlType === 'text') {
    const h = 20;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={controlWidth} height={h} overflow="visible">
          {!editing && (
            <text x={0} y={h * 0.7} fontSize={10} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          )}
          {editing && renderEditInput(controlWidth, h, 10)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Link ──
  if (controlType === 'link') {
    const h = 20;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={controlWidth} height={h} overflow="visible">
          {!editing && (
            <text x={0} y={h * 0.7} fontSize={10} fill="#2563EB" textDecoration="underline" fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none', cursor: 'pointer' }}>
              {label}
            </text>
          )}
          {editing && renderEditInput(controlWidth, h, 10)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Image placeholder ──
  if (controlType === 'image') {
    const h = 100;
    const w = controlWidth;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={4} fill="#F3F4F6" stroke={WF_BORDER} strokeWidth={0.8} />
          {/* Crossed lines */}
          <line x1={0} y1={0} x2={w} y2={h} stroke={WF_BORDER} strokeWidth={0.5} />
          <line x1={w} y1={0} x2={0} y2={h} stroke={WF_BORDER} strokeWidth={0.5} />
          {!editing && (
            <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label || 'Image'}
            </text>
          )}
          {editing && renderEditInput(w, h)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Avatar ──
  if (controlType === 'avatar') {
    const r = 18;
    const d = r * 2;
    return (
      <div style={{ opacity }}>
        <svg width={d} height={d} overflow="visible">
          <circle cx={r} cy={r} r={r - 1} fill="#E5E7EB" stroke={stroke} strokeWidth={0.8} />
          {/* Person silhouette */}
          <circle cx={r} cy={r - 4} r={5} fill={WF_MUTED} />
          <ellipse cx={r} cy={r + 10} rx={9} ry={6} fill={WF_MUTED} />
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Badge / Tag ──
  if (controlType === 'badge') {
    const h = 20;
    const w = Math.max(label.length * 7 + 16, 40);
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={10} fill="#E5E7EB" stroke="none" />
          {!editing && (
            <text x={w / 2} y={h / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={500} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          )}
          {editing && renderEditInput(w, h, 9)}
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Stat card ──
  if (controlType === 'stat-card') {
    const w = 120;
    const h = 70;
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={6} fill="white" stroke={stroke} strokeWidth={1} />
          {!editing && (
            <text x={w / 2} y={22} textAnchor="middle" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label}
            </text>
          )}
          {editing && (
            <foreignObject x={2} y={10} width={w - 4} height={20}>
              <EditableInput
                inputRef={inputRef}
                value={editValue}
                onChange={setEditValue}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                fontSize={9}
                textAlign="center"
              />
            </foreignObject>
          )}
          <text x={w / 2} y={48} textAnchor="middle" fontSize={22} fontWeight={700} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {value ?? '—'}
          </text>
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Progress bar ──
  if (controlType === 'progress') {
    const w = controlWidth;
    const h = 24;
    const barH = 8;
    const barY = h - barH - 2;
    const fillW = (progress / 100) * (w - 4);
    return (
      <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
        <svg width={w} height={h} overflow="visible">
          {!editing && (
            <text x={0} y={10} fontSize={9} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {label} — {progress}%
            </text>
          )}
          {editing && (
            <foreignObject x={0} y={0} width={w} height={14}>
              <EditableInput
                inputRef={inputRef}
                value={editValue}
                onChange={setEditValue}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                fontSize={9}
              />
            </foreignObject>
          )}
          <rect x={0} y={barY} width={w} height={barH} rx={barH / 2} fill="#E5E7EB" stroke="none" />
          <rect x={2} y={barY} width={fillW} height={barH} rx={barH / 2} fill="#6B7280" stroke="none" />
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // ── Divider ──
  if (controlType === 'divider') {
    const w = controlWidth;
    return (
      <div style={{ opacity }}>
        <svg width={w} height={4} overflow="visible">
          <line x1={0} y1={2} x2={w} y2={2} stroke={WF_BORDER} strokeWidth={0.8} />
        </svg>
        <RoutingHandles />
      </div>
    );
  }

  // Fallback — label
  return (
    <div style={{ opacity }} onDoubleClick={handleDoubleClick}>
      <svg width={controlWidth} height={20} overflow="visible">
        {!editing && <text x={0} y={14} fontSize={10} fill={WF_TEXT}>{label}</text>}
        {editing && renderEditInput(controlWidth, 20, 10)}
      </svg>
      <RoutingHandles />
    </div>
  );
}

export const WfControlNode = memo(WfControlNodeComponent);
