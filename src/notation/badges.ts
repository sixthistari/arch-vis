import React from 'react';

interface BadgeProps {
  code: string;
  x: number;
  y: number;
  scale?: number;
  theme: 'dark' | 'light';
}

export function renderBadge({ code, x, y, scale = 1, theme }: BadgeProps): React.ReactElement {
  const badgeWidth = 12 * scale;
  const badgeHeight = 8 * scale;
  const fontSize = 5 * scale;
  const rx = 2 * scale;
  const bx = x - badgeWidth;
  const by = y;

  return React.createElement('g', { className: 'specialisation-badge' },
    React.createElement('rect', {
      x: bx,
      y: by,
      width: badgeWidth,
      height: badgeHeight,
      rx,
      ry: rx,
      fill: theme === 'dark' ? '#333' : '#e0e0e0',
      stroke: theme === 'dark' ? '#888' : '#666',
      strokeWidth: 0.5 * scale,
    }),
    React.createElement('text', {
      x: bx + badgeWidth / 2,
      y: by + badgeHeight / 2 + fontSize * 0.35,
      textAnchor: 'middle',
      fontSize,
      fontFamily: 'monospace',
      fill: theme === 'dark' ? '#ccc' : '#333',
    }, code),
  );
}
