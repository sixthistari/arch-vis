import React from 'react';
import type { ShapeProps } from './rect';

export function Box3DShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  const w = width * scale;
  const h = height * scale;
  const d = 5 * scale; // depth offset

  const frontPath = `M${x},${y + d} L${x + w - d},${y + d} L${x + w - d},${y + h} L${x},${y + h} Z`;
  const topPath = `M${x},${y + d} L${x + d},${y} L${x + w},${y} L${x + w - d},${y + d} Z`;
  const rightPath = `M${x + w - d},${y + d} L${x + w},${y} L${x + w},${y + h - d} L${x + w - d},${y + h} Z`;

  return React.createElement('g', { opacity },
    React.createElement('path', { d: frontPath, stroke, fill, strokeWidth: 1 * scale }),
    React.createElement('path', { d: topPath, stroke, fill, strokeWidth: 0.8 * scale, fillOpacity: 0.7 }),
    React.createElement('path', { d: rightPath, stroke, fill, strokeWidth: 0.8 * scale, fillOpacity: 0.5 }),
  );
}
