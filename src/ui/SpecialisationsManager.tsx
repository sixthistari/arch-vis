import React, { useState, useEffect, useCallback } from 'react';
import { fetchDistinctSpecialisations, bulkRenameSpecialisation } from '../api/client';
import { SPECIALISATION_CATEGORIES, specialisationLabel } from '../model/types';
import { useModelStore } from '../store/model';

interface SpecialisationsManagerProps {
  onClose: () => void;
}

interface SpecRow {
  specialisation: string;
  count: number;
}

export function SpecialisationsManager({ onClose }: SpecialisationsManagerProps): React.ReactElement {
  const [rows, setRows] = useState<SpecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [saving, setSaving] = useState(false);
  const loadAll = useModelStore(s => s.loadAll);

  const predefinedSet = new Set(
    Object.values(SPECIALISATION_CATEGORIES).flat(),
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDistinctSpecialisations();
      setRows(data);
    } catch (err) {
      console.error('Failed to load specialisations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleRename = useCallback(async (oldValue: string, newValue: string) => {
    if (!newValue.trim() || newValue.trim() === oldValue) {
      setEditingSlug(null);
      return;
    }
    setSaving(true);
    try {
      const slug = newValue.trim().toLowerCase().replace(/\s+/g, '-');
      await bulkRenameSpecialisation(oldValue, slug);
      await loadAll();
      await reload();
      setEditingSlug(null);
    } catch (err) {
      console.error('Rename failed:', err);
      window.alert(`Rename failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [loadAll, reload]);

  const handleDelete = useCallback(async (slug: string, count: number) => {
    if (!window.confirm(
      `Remove specialisation "${specialisationLabel(slug)}" from ${count} element${count !== 1 ? 's' : ''}?`,
    )) return;
    setSaving(true);
    try {
      await bulkRenameSpecialisation(slug, null);
      await loadAll();
      await reload();
    } catch (err) {
      console.error('Delete failed:', err);
      window.alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [loadAll, reload]);

  const handleCreate = useCallback(async () => {
    const name = newSpecName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    if (rows.some(r => r.specialisation === slug)) {
      window.alert(`Specialisation "${name}" already exists.`);
      return;
    }
    // Custom specialisations only exist when assigned to elements.
    // Adding to the list is just showing it in the manager; the user will assign it from the detail panel.
    // We'll add a placeholder row so it appears in the list immediately.
    setRows(prev => [...prev, { specialisation: slug, count: 0 }]);
    setNewSpecName('');
  }, [newSpecName, rows]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogStyle: React.CSSProperties = {
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 8,
    width: 520,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 10,
    borderRadius: 3,
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    background: 'var(--button-bg, #333)',
    color: 'var(--button-fg, #ccc)',
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 6px',
    fontSize: 11,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 3,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 18px',
    borderBottom: '1px solid var(--border-secondary)',
    fontSize: 11,
  };

  return React.createElement('div', {
    style: overlayStyle,
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
  },
    React.createElement('div', { style: dialogStyle },
      // Header
      React.createElement('div', { style: headerStyle },
        React.createElement('span', {
          style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
        }, 'Manage Specialisations'),
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 18,
            padding: '0 4px',
          },
        }, '\u00D7'),
      ),

      // Create new
      React.createElement('div', {
        style: { padding: '10px 18px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
      },
        React.createElement('input', {
          value: newSpecName,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewSpecName(e.target.value),
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleCreate(); },
          placeholder: 'New specialisation name\u2026',
          style: { ...inputStyle, flex: 1 },
        }),
        React.createElement('button', {
          onClick: handleCreate,
          disabled: !newSpecName.trim(),
          style: { ...btnStyle, background: 'var(--highlight, #4a9eff)', color: '#fff', opacity: newSpecName.trim() ? 1 : 0.5 },
        }, 'Create'),
      ),

      // Column headers
      React.createElement('div', {
        style: { ...rowStyle, fontWeight: 600, color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' as const, borderBottom: '1px solid var(--border-primary)' },
      },
        React.createElement('span', { style: { flex: 1 } }, 'Specialisation'),
        React.createElement('span', { style: { width: 50, textAlign: 'right' as const } }, 'Count'),
        React.createElement('span', { style: { width: 40, textAlign: 'center' as const } }, 'Type'),
        React.createElement('span', { style: { width: 100, textAlign: 'right' as const } }, 'Actions'),
      ),

      // List
      React.createElement('div', { style: { flex: 1, overflow: 'auto' } },
        loading
          ? React.createElement('div', {
              style: { padding: 18, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11, textAlign: 'center' as const },
            }, 'Loading\u2026')
          : rows.length === 0
            ? React.createElement('div', {
                style: { padding: 18, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11, textAlign: 'center' as const },
              }, 'No specialisations in use')
            : rows.map(row =>
                React.createElement('div', { key: row.specialisation, style: rowStyle },
                  // Name (editable)
                  editingSlug === row.specialisation
                    ? React.createElement('input', {
                        value: editValue,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value),
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') handleRename(row.specialisation, editValue);
                          if (e.key === 'Escape') setEditingSlug(null);
                        },
                        onBlur: () => handleRename(row.specialisation, editValue),
                        autoFocus: true,
                        style: { ...inputStyle, flex: 1 },
                      })
                    : React.createElement('span', {
                        style: { flex: 1, color: 'var(--text-primary)' },
                      }, specialisationLabel(row.specialisation)),

                  // Count
                  React.createElement('span', {
                    style: { width: 50, textAlign: 'right' as const, color: 'var(--text-secondary)', fontSize: 10 },
                  }, String(row.count)),

                  // Type badge
                  React.createElement('span', {
                    style: {
                      width: 40,
                      textAlign: 'center' as const,
                      fontSize: 8,
                      padding: '1px 4px',
                      borderRadius: 3,
                      background: predefinedSet.has(row.specialisation) ? 'var(--bg-tertiary)' : '#d97706',
                      color: predefinedSet.has(row.specialisation) ? 'var(--text-muted)' : '#fff',
                    },
                  }, predefinedSet.has(row.specialisation) ? 'built-in' : 'custom'),

                  // Actions
                  React.createElement('span', {
                    style: { width: 100, display: 'flex', gap: 4, justifyContent: 'flex-end' },
                  },
                    React.createElement('button', {
                      onClick: () => {
                        setEditingSlug(row.specialisation);
                        setEditValue(specialisationLabel(row.specialisation));
                      },
                      disabled: saving,
                      style: { ...btnStyle, fontSize: 9 },
                    }, 'Rename'),
                    React.createElement('button', {
                      onClick: () => handleDelete(row.specialisation, row.count),
                      disabled: saving,
                      style: { ...btnStyle, fontSize: 9, color: '#e05252', borderColor: '#e0525244' },
                    }, 'Remove'),
                  ),
                ),
              ),
      ),

      // Footer
      React.createElement('div', {
        style: { padding: '10px 18px', borderTop: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 },
      },
        React.createElement('button', {
          onClick: onClose,
          style: btnStyle,
        }, 'Close'),
      ),
    ),
  );
}
