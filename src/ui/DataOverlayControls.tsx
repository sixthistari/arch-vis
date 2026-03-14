import React, { useState } from 'react';
import { useDataOverlayStore } from '../store/data-overlay';

const COLOUR_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'maturity', label: 'Maturity' },
  { value: 'domain', label: 'Domain' },
];

const HEATMAP_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'priority', label: 'Priority' },
  { value: 'maturity_score', label: 'Maturity Score' },
  { value: 'risk', label: 'Risk' },
];

const DISPLAY_FIELD_OPTIONS = [
  { key: 'status', label: 'Status' },
  { key: 'layer', label: 'Layer' },
  { key: 'domain_id', label: 'Domain' },
  { key: 'sublayer', label: 'Sublayer' },
];

export function DataOverlayControls(): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const colourByProperty = useDataOverlayStore(s => s.colourByProperty);
  const heatmapProperty = useDataOverlayStore(s => s.heatmapProperty);
  const showStatusBadge = useDataOverlayStore(s => s.showStatusBadge);
  const displayFields = useDataOverlayStore(s => s.displayFields);
  const setColourByProperty = useDataOverlayStore(s => s.setColourByProperty);
  const setHeatmapProperty = useDataOverlayStore(s => s.setHeatmapProperty);
  const toggleStatusBadge = useDataOverlayStore(s => s.toggleStatusBadge);
  const setDisplayFields = useDataOverlayStore(s => s.setDisplayFields);

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--text-secondary)',
    marginBottom: 2,
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 10,
    padding: '2px 4px',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 3,
  };

  const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--text-primary)',
    cursor: 'pointer',
  };

  function handleDisplayFieldToggle(key: string) {
    const next = displayFields.includes(key)
      ? displayFields.filter(f => f !== key)
      : [...displayFields, key];
    setDisplayFields(next);
  }

  return React.createElement('div', {
    style: {
      padding: '6px 10px',
      borderTop: '1px solid var(--border-primary)',
    },
  },
    // Header with collapse toggle
    React.createElement('div', {
      onClick: () => setCollapsed(c => !c),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: collapsed ? 0 : 6,
        userSelect: 'none',
      },
    },
      React.createElement('span', null, 'Data Overlays'),
      React.createElement('span', {
        style: { fontSize: 9, color: 'var(--text-secondary)' },
      }, collapsed ? '▸' : '▾'),
    ),

    // Collapsible body
    !collapsed && React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 6 },
    },
      // Colour by property
      React.createElement('div', null,
        React.createElement('div', { style: labelStyle }, 'Colour by'),
        React.createElement('select', {
          value: colourByProperty ?? '',
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            setColourByProperty(e.target.value || null),
          style: selectStyle,
        },
          ...COLOUR_BY_OPTIONS.map(opt =>
            React.createElement('option', { key: opt.value, value: opt.value }, opt.label),
          ),
        ),
      ),

      // Heatmap property
      React.createElement('div', null,
        React.createElement('div', { style: labelStyle }, 'Heatmap (numeric 0\u2013100)'),
        React.createElement('select', {
          value: heatmapProperty ?? '',
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            setHeatmapProperty(e.target.value || null),
          style: selectStyle,
        },
          ...HEATMAP_OPTIONS.map(opt =>
            React.createElement('option', { key: opt.value, value: opt.value }, opt.label),
          ),
        ),
      ),

      // Status badge checkbox
      React.createElement('label', {
        style: checkboxRowStyle,
      },
        React.createElement('input', {
          type: 'checkbox',
          checked: showStatusBadge,
          onChange: () => toggleStatusBadge(),
          style: { margin: 0 },
        }),
        'Show status badge',
      ),

      // Display fields checkboxes
      React.createElement('div', null,
        React.createElement('div', { style: labelStyle }, 'Display fields (max 2)'),
        ...DISPLAY_FIELD_OPTIONS.map(opt =>
          React.createElement('label', {
            key: opt.key,
            style: {
              ...checkboxRowStyle,
              opacity: displayFields.length >= 2 && !displayFields.includes(opt.key) ? 0.4 : 1,
            },
          },
            React.createElement('input', {
              type: 'checkbox',
              checked: displayFields.includes(opt.key),
              disabled: displayFields.length >= 2 && !displayFields.includes(opt.key),
              onChange: () => handleDisplayFieldToggle(opt.key),
              style: { margin: 0 },
            }),
            opt.label,
          ),
        ),
      ),
    ),
  );
}
