import React, { useState } from 'react';
import { useLayerVisibilityStore } from '../store/layer-visibility';

const LAYERS = [
  { key: 'motivation', label: 'Motivation' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'business', label: 'Business' },
  { key: 'application', label: 'Application' },
  { key: 'technology', label: 'Technology' },
  { key: 'data', label: 'Data' },
  { key: 'implementation', label: 'Implementation' },
] as const;

export function LayerControls(): React.ReactElement | null {
  const [collapsed, setCollapsed] = useState(false);

  const hiddenLayers = useLayerVisibilityStore(s => s.hiddenLayers);
  const lockedLayers = useLayerVisibilityStore(s => s.lockedLayers);
  const layerOpacity = useLayerVisibilityStore(s => s.layerOpacity);
  const showRelationships = useLayerVisibilityStore(s => s.showRelationships);
  const toggleHidden = useLayerVisibilityStore(s => s.toggleHidden);
  const toggleLocked = useLayerVisibilityStore(s => s.toggleLocked);
  const setOpacity = useLayerVisibilityStore(s => s.setOpacity);
  const toggleRelationships = useLayerVisibilityStore(s => s.toggleRelationships);

  const iconBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '1px 3px',
    fontSize: 11,
    lineHeight: 1,
    color: 'var(--text-primary)',
    borderRadius: 2,
  };

  return React.createElement('div', {
    style: {
      borderTop: '1px solid var(--border-primary)',
      padding: '6px 8px',
      fontSize: 11,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
    // Header
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: collapsed ? 0 : 6,
        cursor: 'pointer',
        userSelect: 'none' as const,
      },
      onClick: () => setCollapsed(c => !c),
    },
      React.createElement('span', {
        style: { fontWeight: 600, fontSize: 11, letterSpacing: 0.3 },
      }, 'Layers'),
      React.createElement('span', {
        style: { fontSize: 9, color: 'var(--text-muted)' },
      }, collapsed ? '\u25B6' : '\u25BC'),
    ),

    // Layer rows
    !collapsed && React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 3 },
    },
      ...LAYERS.map(({ key, label }) => {
        const hidden = hiddenLayers.has(key);
        const locked = lockedLayers.has(key);
        const opacity = layerOpacity[key] ?? 1;

        return React.createElement('div', {
          key,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: hidden ? 0.45 : 1,
          },
        },
          // Visibility toggle
          React.createElement('button', {
            onClick: () => toggleHidden(key),
            title: hidden ? `Show ${label} layer` : `Hide ${label} layer`,
            style: iconBtn,
          }, hidden ? '\u25CB' : '\u25CF'),

          // Lock toggle
          React.createElement('button', {
            onClick: () => toggleLocked(key),
            title: locked ? `Unlock ${label} layer` : `Lock ${label} layer`,
            style: iconBtn,
          }, locked ? '\u25A0' : '\u25A1'),

          // Label
          React.createElement('span', {
            style: {
              flex: 1,
              fontSize: 10,
              color: hidden ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: hidden ? 'line-through' : 'none',
            },
          }, label),

          // Opacity slider
          React.createElement('input', {
            type: 'range',
            min: 0,
            max: 100,
            value: Math.round(opacity * 100),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              setOpacity(key, Number(e.target.value) / 100),
            title: `Opacity: ${Math.round(opacity * 100)}%`,
            style: { width: 40, height: 10, cursor: 'pointer', accentColor: 'var(--text-muted)' },
          }),
        );
      }),

      // Relationships toggle
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
          paddingTop: 4,
          borderTop: '1px solid var(--border-primary)',
        },
      },
        React.createElement('button', {
          onClick: toggleRelationships,
          title: showRelationships ? 'Hide relationships' : 'Show relationships',
          style: iconBtn,
        }, showRelationships ? '\u25CF' : '\u25CB'),
        React.createElement('span', {
          style: { fontSize: 10, color: 'var(--text-primary)' },
        }, 'Relationships'),
      ),
    ),
  );
}
