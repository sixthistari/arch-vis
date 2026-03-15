/**
 * CanvasSearch — floating Ctrl+F search overlay for the canvas.
 *
 * Filters nodes by name, highlights matches, and cycles through
 * them with Enter/Shift+Enter. Escape closes the search bar.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface CanvasSearchProps {
  /** All searchable node entries: id + label. */
  nodes: { id: string; label: string }[];
  /** Called when the user cycles to a match — the canvas should fitView to it. */
  onFocusNode: (nodeId: string) => void;
  /** Called when search is dismissed. */
  onClose: () => void;
  theme: 'dark' | 'light';
}

export function CanvasSearch({ nodes, onFocusNode, onClose, theme }: CanvasSearchProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(q));
  }, [query, nodes]);

  // Reset match index when query changes
  useEffect(() => {
    setMatchIndex(0);
    if (matches.length > 0) {
      onFocusNode(matches[0]!.id);
    }
  }, [matches.length > 0 ? matches[0]?.id : '']); // eslint-disable-line react-hooks/exhaustive-deps

  const cycleMatch = useCallback((direction: 1 | -1) => {
    if (matches.length === 0) return;
    const next = (matchIndex + direction + matches.length) % matches.length;
    setMatchIndex(next);
    onFocusNode(matches[next]!.id);
  }, [matchIndex, matches, onFocusNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      cycleMatch(e.shiftKey ? -1 : 1);
    }
  }, [onClose, cycleMatch]);

  const isDark = theme === 'dark';

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: isDark ? '#1E293B' : '#FFFFFF',
      border: `1px solid ${isDark ? '#334155' : '#D1D5DB'}`,
      borderRadius: 6,
      padding: '4px 8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      fontSize: 12,
    }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search nodes…"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: isDark ? '#E2E8F0' : '#1E293B',
          fontSize: 12,
          width: 160,
        }}
      />
      <span style={{
        color: isDark ? '#94A3B8' : '#6B7280',
        fontSize: 10,
        whiteSpace: 'nowrap',
        minWidth: 40,
        textAlign: 'right',
      }}>
        {query.trim() ? `${matches.length > 0 ? matchIndex + 1 : 0}/${matches.length}` : ''}
      </span>
      <button
        onClick={() => cycleMatch(-1)}
        disabled={matches.length === 0}
        style={navBtnStyle(isDark)}
        title="Previous match (Shift+Enter)"
      >&#x25B2;</button>
      <button
        onClick={() => cycleMatch(1)}
        disabled={matches.length === 0}
        style={navBtnStyle(isDark)}
        title="Next match (Enter)"
      >&#x25BC;</button>
      <button
        onClick={onClose}
        style={{
          ...navBtnStyle(isDark),
          fontSize: 14,
          padding: '0 4px',
        }}
        title="Close (Escape)"
      >&times;</button>
    </div>
  );
}

function navBtnStyle(isDark: boolean): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: isDark ? '#94A3B8' : '#6B7280',
    cursor: 'pointer',
    fontSize: 8,
    padding: '2px 4px',
    lineHeight: 1,
  };
}
