import React from 'react';

interface RotationPanelProps {
  rotY: number;
  rotX: number;
  layerSpacing: number;
  onReset: () => void;
  onLayerSpacingChange: (spacing: number) => void;
}

export function RotationPanel({ rotY, rotX, layerSpacing, onReset, onLayerSpacingChange }: RotationPanelProps): React.ReactElement {
  const degY = Math.round((rotY * 180) / Math.PI);
  const degX = Math.round((rotX * 180) / Math.PI);

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      background: 'var(--panel-bg)',
      borderRadius: 4,
      border: '1px solid var(--panel-border)',
      fontSize: 10,
      color: 'var(--text-secondary)',
    },
  },
    React.createElement('span', null, `Y: ${degY}\u00B0`),
    React.createElement('span', null, `X: ${degX}\u00B0`),
    React.createElement('span', {
      style: { borderLeft: '1px solid var(--border-primary)', paddingLeft: 8, marginLeft: 2 },
    }, 'Spread'),
    React.createElement('input', {
      type: 'range',
      min: 40,
      max: 400,
      step: 10,
      value: layerSpacing,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onLayerSpacingChange(Number(e.target.value)),
      style: { width: 60, height: 12, cursor: 'pointer' },
      title: `Layer spacing: ${layerSpacing}`,
    }),
    React.createElement('button', {
      onClick: onReset,
      style: {
        background: 'var(--button-bg)',
        color: 'var(--button-text)',
        border: '1px solid var(--border-primary)',
        borderRadius: 3,
        padding: '2px 6px',
        cursor: 'pointer',
        fontSize: 9,
      },
      title: 'Reset camera and spacing',
    }, 'Reset'),
  );
}
