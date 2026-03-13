import React from 'react';
import type { ShapeProps } from './rect';

interface RoundedRectProps extends ShapeProps {
  rx?: number;
}

export function RoundedRectShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1, rx = 5 }: RoundedRectProps): React.ReactElement {
  return React.createElement('rect', {
    x, y,
    width: width * scale,
    height: height * scale,
    rx: rx * scale,
    ry: rx * scale,
    stroke,
    fill,
    strokeWidth: 1 * scale,
    opacity,
  });
}
