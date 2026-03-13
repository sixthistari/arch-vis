import React from 'react';
import type { ShapeProps } from './rect';

export function DashedRectShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  return React.createElement('rect', {
    x, y,
    width: width * scale,
    height: height * scale,
    stroke,
    fill,
    strokeWidth: 1 * scale,
    strokeDasharray: `${4 * scale} ${3 * scale}`,
    opacity,
  });
}
