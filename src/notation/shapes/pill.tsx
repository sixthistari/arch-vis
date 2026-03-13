import React from 'react';
import type { ShapeProps } from './rect';

export function PillShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  const h = height * scale;
  return React.createElement('rect', {
    x, y,
    width: width * scale,
    height: h,
    rx: h / 2,
    ry: h / 2,
    stroke,
    fill,
    strokeWidth: 1 * scale,
    opacity,
  });
}
