import React from 'react';

export interface ShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  fill: string;
  scale?: number;
  opacity?: number;
}

export function RectShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  return React.createElement('rect', {
    x, y,
    width: width * scale,
    height: height * scale,
    stroke,
    fill,
    strokeWidth: 1 * scale,
    opacity,
  });
}
