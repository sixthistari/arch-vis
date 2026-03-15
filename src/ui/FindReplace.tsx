/**
 * FindReplace — model-wide find and replace for element names.
 *
 * Opens as a floating panel. Searches all elements by name,
 * highlights matches, and allows bulk or individual replacement.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useModelStore } from '../store/model';
import * as api from '../api/client';

interface FindReplaceProps {
  onClose: () => void;
  theme: 'dark' | 'light';
}

export function FindReplace({ onClose, theme: _theme }: FindReplaceProps): React.ReactElement {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const elements = useModelStore(s => s.elements);
  const loadAll = useModelStore(s => s.loadAll);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const matches = useMemo(() => {
    if (!findText.trim()) return [];
    const q = caseSensitive ? findText : findText.toLowerCase();
    return elements.filter(el => {
      const name = caseSensitive ? el.name : el.name.toLowerCase();
      return name.includes(q);
    });
  }, [findText, caseSensitive, elements]);

  const handleReplace = useCallback(async (elementId: string) => {
    if (!findText.trim() || !replaceText) return;
    const el = elements.find(e => e.id === elementId);
    if (!el) return;
    setReplacing(true);
    try {
      const newName = caseSensitive
        ? el.name.replace(findText, replaceText)
        : el.name.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceText);
      await api.updateElement(elementId, { name: newName });
      await loadAll();
    } catch (err) {
      console.error('Replace failed:', err);
    }
    setReplacing(false);
  }, [findText, replaceText, caseSensitive, elements, loadAll]);

  const handleReplaceAll = useCallback(async () => {
    if (!findText.trim() || !replaceText || matches.length === 0) return;
    setReplacing(true);
    try {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
      for (const el of matches) {
        const newName = el.name.replace(regex, replaceText);
        if (newName !== el.name) {
          await api.updateElement(el.id, { name: newName });
        }
      }
      await loadAll();
    } catch (err) {
      console.error('Replace all failed:', err);
    }
    setReplacing(false);
  }, [findText, replaceText, caseSensitive, matches, loadAll]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  const border = 'var(--border-primary)';
  const text = 'var(--text-primary)';
  const muted = 'var(--text-muted)';
  const inputBg = 'var(--bg-tertiary)';

  const inputStyle: React.CSSProperties = {
    background: inputBg,
    border: `1px solid ${border}`,
    borderRadius: 4,
    color: text,
    fontSize: 12,
    padding: '4px 8px',
    outline: 'none',
    width: '100%',
  };

  const btnStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: 'none',
    borderRadius: 4,
    color: text,
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
  };

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: 50,
      right: 20,
      zIndex: 10000,
      background: 'var(--panel-bg)',
      border: `1px solid var(--panel-border)`,
      borderRadius: 8,
      padding: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      width: 320,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    onKeyDown: handleKeyDown,
  },
    // Header
    React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    },
      React.createElement('span', { style: { fontSize: 12, fontWeight: 600, color: text } }, 'Find & Replace'),
      React.createElement('button', {
        onClick: onClose,
        style: { background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 16 },
      }, '\u00D7'),
    ),

    // Find input
    React.createElement('input', {
      ref: inputRef,
      value: findText,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFindText(e.target.value),
      placeholder: 'Find in element names\u2026',
      style: { ...inputStyle, marginBottom: 6 },
    }),

    // Replace input
    React.createElement('input', {
      value: replaceText,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setReplaceText(e.target.value),
      placeholder: 'Replace with\u2026',
      style: { ...inputStyle, marginBottom: 8 },
    }),

    // Options + actions row
    React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
    },
      React.createElement('label', {
        style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: muted, cursor: 'pointer' },
      },
        React.createElement('input', {
          type: 'checkbox',
          checked: caseSensitive,
          onChange: () => setCaseSensitive(c => !c),
        }),
        'Case sensitive',
      ),
      React.createElement('div', { style: { flex: 1 } }),
      React.createElement('button', {
        onClick: handleReplaceAll,
        disabled: replacing || matches.length === 0 || !replaceText,
        style: { ...btnStyle, opacity: matches.length === 0 || !replaceText ? 0.4 : 1 },
      }, `Replace All (${matches.length})`),
    ),

    // Match count
    React.createElement('div', {
      style: { fontSize: 11, color: muted, marginBottom: 6 },
    }, findText.trim() ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : ''),

    // Match list (scrollable, max 5 visible)
    matches.length > 0 && React.createElement('div', {
      style: {
        maxHeight: 150,
        overflowY: 'auto',
        borderTop: `1px solid ${border}`,
        paddingTop: 6,
      },
    },
      ...matches.slice(0, 50).map(el =>
        React.createElement('div', {
          key: el.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 0',
            fontSize: 11,
          },
        },
          React.createElement('span', {
            style: { color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 },
          }, el.name),
          replaceText && React.createElement('button', {
            onClick: () => handleReplace(el.id),
            disabled: replacing,
            style: { ...btnStyle, fontSize: 10, padding: '2px 6px' },
          }, 'Replace'),
        ),
      ),
    ),
  );
}
