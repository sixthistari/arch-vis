import React from 'react';
import type { ShapeProps } from './rect';

export function EventShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  const w = width * scale;
  const h = height * scale;
  const notch = 6 * scale;
  const rr = 4 * scale;

  // Rounded rect with left notch (V-shaped cutout on left edge)
  const path = `M${x + notch},${y}
    L${x + w - rr},${y}
    Q${x + w},${y} ${x + w},${y + rr}
    L${x + w},${y + h - rr}
    Q${x + w},${y + h} ${x + w - rr},${y + h}
    L${x + notch},${y + h}
    L${x},${y + h / 2}
    Z`;

  return React.createElement('path', {
    d: path,
    stroke,
    fill,
    strokeWidth: 1 * scale,
    opacity,
  });
}
