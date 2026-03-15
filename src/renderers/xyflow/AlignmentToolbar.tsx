/**
 * AlignmentToolbar — appears when 2+ nodes are selected, offering
 * alignment and distribution actions.
 */
import React from 'react';

export type AlignAction = 'left' | 'centre-h' | 'right' | 'top' | 'centre-v' | 'bottom' | 'dist-h' | 'dist-v';

const ALIGN_BTNS: { label: string; title: string; action: AlignAction; sep?: true }[] = [
  { label: '⊢',  title: 'Align left edges',       action: 'left'     },
  { label: '↔',  title: 'Centre horizontally',     action: 'centre-h' },
  { label: '⊣',  title: 'Align right edges',       action: 'right',   sep: true },
  { label: '⊤',  title: 'Align top edges',         action: 'top'      },
  { label: '↕',  title: 'Centre vertically',       action: 'centre-v' },
  { label: '⊥',  title: 'Align bottom edges',      action: 'bottom',  sep: true },
  { label: '⇔',  title: 'Distribute horizontally', action: 'dist-h'   },
  { label: '⇕',  title: 'Distribute vertically',   action: 'dist-v'   },
];

export function AlignmentToolbar({
  count, onAlign, theme,
}: {
  count: number;
  onAlign: (action: AlignAction) => void;
  theme: 'dark' | 'light';
}) {
  if (count < 2) return null;
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#E5E7EB' : '#1F2937';
  const hover = isDark ? '#334155' : '#E2E8F0';

  return (
    <div
      style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, background: bg, border: `1px solid ${border}`, borderRadius: 6,
        padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', userSelect: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {ALIGN_BTNS.map(btn => (
        <React.Fragment key={btn.action}>
          <button
            title={btn.title}
            onClick={() => onAlign(btn.action)}
            style={{
              background: 'transparent', border: 'none', color: text,
              cursor: 'pointer', padding: '3px 7px', fontSize: 14,
              borderRadius: 3, lineHeight: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {btn.label}
          </button>
          {btn.sep && (
            <div style={{ width: 1, height: 16, background: border, margin: '0 3px', flexShrink: 0 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
