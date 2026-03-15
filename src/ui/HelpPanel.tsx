/**
 * HelpPanel — searchable modal overlay showing all user-facing features.
 *
 * Opened via the "?" toolbar button or the F1 keyboard shortcut.
 * Features are grouped by category with collapsible sections.
 * Clicking an entry expands it to show helpText and codeRef.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  featureRegistry,
  FEATURE_CATEGORIES,
  searchFeatures,
  type FeatureEntry,
} from '../help/function-registry';

interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => searchFeatures(query), [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureEntry[]>();
    for (const cat of FEATURE_CATEGORIES) {
      const items = filtered.filter(e => e.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [filtered]);

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  // ── Styles ──
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 20000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.45)',
  };

  const panelStyle: React.CSSProperties = {
    background: 'var(--panel-bg, #1E293B)',
    border: '1px solid var(--panel-border, #334155)',
    borderRadius: 10,
    width: 640,
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px 10px',
    borderBottom: '1px solid var(--border-primary, #334155)',
    flexShrink: 0,
  };

  const searchStyle: React.CSSProperties = {
    padding: '8px 18px',
    borderBottom: '1px solid var(--border-primary, #334155)',
    flexShrink: 0,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary, #0F172A)',
    border: '1px solid var(--border-primary, #334155)',
    borderRadius: 5,
    color: 'var(--text-primary, #E2E8F0)',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 0',
  };

  const catHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px 4px',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary, #94A3B8)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  };

  const entryStyle: React.CSSProperties = {
    padding: '5px 18px 5px 28px',
    cursor: 'pointer',
    fontSize: 11,
    lineHeight: 1.5,
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  };

  const shortcutBadge: React.CSSProperties = {
    background: 'var(--bg-tertiary, #1E293B)',
    border: '1px solid var(--border-primary, #334155)',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'var(--text-secondary, #94A3B8)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const expandedStyle: React.CSSProperties = {
    padding: '4px 18px 8px 28px',
    fontSize: 10,
    color: 'var(--text-muted, #64748B)',
    lineHeight: 1.6,
  };

  return React.createElement('div', {
    style: overlayStyle,
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    onKeyDown: handleKeyDown,
  },
    React.createElement('div', { style: panelStyle },

      // Header
      React.createElement('div', { style: headerStyle },
        React.createElement('span', {
          style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E2E8F0)' },
        }, 'Feature Reference'),
        React.createElement('span', {
          style: { fontSize: 10, color: 'var(--text-muted, #64748B)', marginLeft: 10 },
        }, `${featureRegistry.length} features`),
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #64748B)',
            cursor: 'pointer',
            fontSize: 18,
            marginLeft: 'auto',
            padding: '0 4px',
          },
          title: 'Close (Escape)',
        }, '\u00D7'),
      ),

      // Search bar
      React.createElement('div', { style: searchStyle },
        React.createElement('input', {
          ref: inputRef,
          value: query,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
          placeholder: 'Search features by name, shortcut, category\u2026',
          style: inputStyle,
        }),
        query.trim() ? React.createElement('div', {
          style: { fontSize: 10, color: 'var(--text-muted, #64748B)', marginTop: 4 },
        }, `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`) : null,
      ),

      // Body — grouped features
      React.createElement('div', { style: bodyStyle },
        ...Array.from(grouped.entries()).map(([cat, items]) => {
          const collapsed = collapsedCats.has(cat);
          return React.createElement('div', { key: cat },
            // Category header
            React.createElement('div', {
              style: catHeaderStyle,
              onClick: () => toggleCategory(cat),
            },
              React.createElement('span', {
                style: { fontSize: 9, width: 10, textAlign: 'center' },
              }, collapsed ? '\u25B6' : '\u25BC'),
              cat,
              React.createElement('span', {
                style: {
                  fontSize: 9,
                  fontWeight: 400,
                  color: 'var(--text-muted, #64748B)',
                  textTransform: 'none',
                },
              }, `(${items.length})`),
            ),

            // Entries
            !collapsed && items.map(entry => {
              const isExpanded = expandedId === entry.id;
              return React.createElement('div', { key: entry.id },
                React.createElement('div', {
                  style: {
                    ...entryStyle,
                    background: isExpanded ? 'var(--bg-tertiary, #0F172A)' : 'transparent',
                  },
                  onClick: () => setExpandedId(isExpanded ? null : entry.id),
                },
                  // Audit ID
                  React.createElement('span', {
                    style: {
                      color: 'var(--text-muted, #64748B)',
                      fontSize: 9,
                      width: 28,
                      flexShrink: 0,
                      fontFamily: 'monospace',
                    },
                  }, entry.id),
                  // Name
                  React.createElement('span', {
                    style: {
                      color: 'var(--text-primary, #E2E8F0)',
                      fontWeight: 500,
                      flex: 1,
                    },
                  }, entry.name),
                  // Shortcut badge
                  entry.shortcut ? React.createElement('span', {
                    style: shortcutBadge,
                  }, entry.shortcut) : null,
                ),

                // Description (always visible below name)
                React.createElement('div', {
                  style: {
                    padding: '0 18px 3px 66px',
                    fontSize: 10,
                    color: 'var(--text-secondary, #94A3B8)',
                    lineHeight: 1.4,
                  },
                }, entry.description),

                // Expanded detail
                isExpanded && React.createElement('div', { style: expandedStyle },
                  entry.helpText
                    ? React.createElement('div', {
                        style: { marginBottom: 4 },
                      }, entry.helpText)
                    : React.createElement('div', {
                        style: { fontStyle: 'italic', marginBottom: 4 },
                      }, 'Detailed help text will be added after testing.'),
                  React.createElement('div', {
                    style: { fontFamily: 'monospace', fontSize: 9 },
                  }, `Code: ${entry.codeRef}`),
                ),
              );
            }),
          );
        }),

        // Empty state
        grouped.size === 0 && React.createElement('div', {
          style: {
            padding: 30,
            textAlign: 'center',
            color: 'var(--text-muted, #64748B)',
            fontSize: 12,
            fontStyle: 'italic',
          },
        }, 'No features match your search.'),
      ),

      // Footer
      React.createElement('div', {
        style: {
          padding: '8px 18px',
          borderTop: '1px solid var(--border-primary, #334155)',
          fontSize: 9,
          color: 'var(--text-muted, #64748B)',
          display: 'flex',
          justifyContent: 'space-between',
          flexShrink: 0,
        },
      },
        React.createElement('span', null, 'Press F1 to toggle  |  Escape to close'),
        React.createElement('span', null, 'arch-vis Feature Reference'),
      ),
    ),
  );
}
