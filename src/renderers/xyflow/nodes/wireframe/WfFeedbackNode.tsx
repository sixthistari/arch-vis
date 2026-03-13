/**
 * Wireframe Feedback node — alerts, empty states, toast, loading skeleton.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type WfFeedbackType = 'alert' | 'empty-state' | 'toast' | 'skeleton';
export type WfAlertVariant = 'info' | 'warning' | 'error' | 'success';

export interface WfFeedbackNodeData {
  label: string;
  feedbackType: WfFeedbackType;
  variant?: WfAlertVariant;
  message?: string;
  action?: string; // CTA button text for empty state
  feedbackWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type WfFeedbackNodeType = Node<WfFeedbackNodeData, 'wf-feedback'>;

const WF_BORDER = '#D1D5DB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';

const ALERT_COLOURS: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: '#93C5FD', bg: '#EFF6FF', icon: 'ℹ' },
  warning: { border: '#FCD34D', bg: '#FFFBEB', icon: '⚠' },
  error: { border: '#FCA5A5', bg: '#FEF2F2', icon: '✕' },
  success: { border: '#86EFAC', bg: '#F0FDF4', icon: '✓' },
};

function WfFeedbackNodeComponent({ data, selected }: NodeProps<WfFeedbackNodeType>) {
  const {
    label,
    feedbackType,
    variant = 'info',
    message,
    action,
    feedbackWidth = 320,
    dimmed,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;
  const w = feedbackWidth;

  // ── Alert banner ──
  if (feedbackType === 'alert') {
    const h = 44;
    const c = (ALERT_COLOURS[variant] ?? ALERT_COLOURS.info)!;
    return (
      <div style={{ opacity }}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={4} fill={c.bg} stroke={c.border} strokeWidth={1.2} />
          <rect x={0} y={0} width={4} height={h} rx={2} fill={c.border} />
          <text x={16} y={h / 2 + 1} dominantBaseline="central" fontSize={14} fill={WF_TEXT}>
            {c.icon}
          </text>
          <text x={34} y={message ? 16 : h / 2 + 1} dominantBaseline={message ? 'auto' : 'central'} fontSize={11} fontWeight={600} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {label}
          </text>
          {message && (
            <text x={34} y={30} fontSize={9} fill={WF_TEXT} fillOpacity={0.7} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {message}
            </text>
          )}
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Empty state ──
  if (feedbackType === 'empty-state') {
    const h = 160;
    return (
      <div style={{ opacity }}>
        <svg width={w} height={h} overflow="visible">
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#F9FAFB" stroke={stroke} strokeWidth={0.8} strokeDasharray="6 3" />

          {/* Placeholder icon — empty box */}
          <rect x={w / 2 - 16} y={24} width={32} height={28} rx={4} fill="none" stroke={WF_MUTED} strokeWidth={1.2} />
          <line x1={w / 2 - 10} y1={38} x2={w / 2 + 10} y2={38} stroke={WF_MUTED} strokeWidth={0.8} />

          {/* Title */}
          <text x={w / 2} y={76} textAnchor="middle" fontSize={13} fontWeight={600} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {label}
          </text>

          {/* Message */}
          {message && (
            <text x={w / 2} y={96} textAnchor="middle" fontSize={10} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
              {message}
            </text>
          )}

          {/* CTA button */}
          {action && (
            <g>
              <rect x={w / 2 - 50} y={112} width={100} height={28} rx={4} fill="#374151" />
              <text x={w / 2} y={126 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500} fill="white" fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                {action}
              </text>
            </g>
          )}
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Toast notification ──
  if (feedbackType === 'toast') {
    const h = 48;
    const toastW = Math.min(w, 300);
    return (
      <div style={{ opacity }}>
        <svg width={toastW} height={h} overflow="visible">
          {/* Shadow */}
          <rect x={2} y={3} width={toastW} height={h} rx={6} fill="#00000010" />
          <rect x={0} y={0} width={toastW} height={h} rx={6} fill="white" stroke={WF_BORDER} strokeWidth={1} />
          <text x={14} y={h / 2 + 1} dominantBaseline="central" fontSize={11} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {label}
          </text>
          <text x={toastW - 14} y={h / 2 + 1} dominantBaseline="central" textAnchor="end" fontSize={12} fill={WF_MUTED} style={{ pointerEvents: 'none' }}>
            ✕
          </text>
        </svg>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // ── Loading skeleton ──
  const skelH = 80;
  const barH = 10;
  const gap = 8;
  return (
    <div style={{ opacity }}>
      <svg width={w} height={skelH} overflow="visible">
        {/* Skeleton bars of varying width */}
        <rect x={0} y={0} width={w * 0.6} height={barH + 4} rx={4} fill="#E5E7EB">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x={0} y={barH + gap + 4} width={w * 0.9} height={barH} rx={4} fill="#E5E7EB">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
        </rect>
        <rect x={0} y={(barH + gap) * 2 + 4} width={w * 0.75} height={barH} rx={4} fill="#E5E7EB">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
        </rect>
        <rect x={0} y={(barH + gap) * 3 + 4} width={w * 0.45} height={barH} rx={4} fill="#E5E7EB">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </rect>
      </svg>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export const WfFeedbackNode = memo(WfFeedbackNodeComponent);
