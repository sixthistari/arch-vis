import React from 'react';
import type { ShapeProps } from './rect';

export function FoldedCornerShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1 }: ShapeProps): React.ReactElement {
  const w = width * scale;
  const h = height * scale;
  const fold = 6 * scale;

  const bodyPath = `M${x},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h} L${x},${y + h} Z`;
  const foldPath = `M${x + w - fold},${y} L${x + w - fold},${y + fold} L${x + w},${y + fold}`;

  return React.createElement('g', { opacity },
    React.createElement('path', { d: bodyPath, stroke, fill, strokeWidth: 1 * scale }),
    React.createElement('path', { d: foldPath, stroke, fill: 'none', strokeWidth: 0.8 * scale }),
  );
}
