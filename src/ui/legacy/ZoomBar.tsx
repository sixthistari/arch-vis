import React from 'react';
import { getZoomTierLabel, getZoomTier } from '../../renderers/spatial/zoom-tiers';

interface ZoomBarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomBar({ zoom, onZoomIn, onZoomOut }: ZoomBarProps): React.ReactElement {
  const tier = getZoomTier(zoom);
  const pct = Math.round(zoom * 100);

  const btnStyle: React.CSSProperties = {
    background: 'var(--button-bg)',
    color: 'var(--button-text)',
    border: '1px solid var(--border-primary)',
    borderRadius: 3,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      background: 'var(--panel-bg)',
      borderRadius: 4,
      border: '1px solid var(--panel-border)',
      fontSize: 11,
    },
  },
    React.createElement('button', { onClick: onZoomOut, style: btnStyle, title: 'Zoom out' }, '\u2212'),
    React.createElement('span', {
      style: { color: 'var(--text-secondary)', minWidth: 36, textAlign: 'center' },
    }, `${pct}%`),
    React.createElement('button', { onClick: onZoomIn, style: btnStyle, title: 'Zoom in' }, '+'),
    React.createElement('span', {
      style: { color: 'var(--text-muted)', fontSize: 9, marginLeft: 4 },
    }, getZoomTierLabel(tier)),
  );
}
