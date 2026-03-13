import React from 'react';
import type { ShapeProps } from './rect';

export type IconType = 'person' | 'component' | 'lollipop' | 'artifact' | 'stepped' | 'header-bar';

interface RectWithIconProps extends ShapeProps {
  iconType: IconType;
}

function renderIcon(iconType: IconType, x: number, y: number, w: number, _h: number, scale: number, stroke: string): React.ReactElement | null {
  const iconSize = 6 * scale;
  const ix = x + w - iconSize - 2 * scale;
  const iy = y + 2 * scale;

  switch (iconType) {
    case 'person': {
      const cx = ix + iconSize / 2;
      const headR = 2 * scale;
      return React.createElement('g', null,
        React.createElement('circle', { cx, cy: iy + headR, r: headR, stroke, fill: 'none', strokeWidth: 0.8 * scale }),
        React.createElement('line', { x1: cx, y1: iy + headR * 2, x2: cx, y2: iy + iconSize, stroke, strokeWidth: 0.8 * scale }),
        React.createElement('line', { x1: cx - 2 * scale, y1: iy + headR * 2.5, x2: cx + 2 * scale, y2: iy + headR * 2.5, stroke, strokeWidth: 0.8 * scale }),
      );
    }
    case 'component': {
      const bw = 4 * scale;
      const bh = 3 * scale;
      const sx = 1.5 * scale;
      return React.createElement('g', null,
        React.createElement('rect', { x: ix + sx, y: iy, width: bw, height: iconSize, stroke, fill: 'none', strokeWidth: 0.6 * scale }),
        React.createElement('rect', { x: ix, y: iy + 1 * scale, width: sx + 1 * scale, height: bh * 0.6, stroke, fill: 'none', strokeWidth: 0.5 * scale }),
        React.createElement('rect', { x: ix, y: iy + iconSize - bh * 0.6 - 1 * scale, width: sx + 1 * scale, height: bh * 0.6, stroke, fill: 'none', strokeWidth: 0.5 * scale }),
      );
    }
    case 'lollipop': {
      const cx = ix + iconSize / 2;
      return React.createElement('g', null,
        React.createElement('circle', { cx, cy: iy + 2 * scale, r: 2 * scale, stroke, fill: 'none', strokeWidth: 0.8 * scale }),
        React.createElement('line', { x1: cx, y1: iy + 4 * scale, x2: cx, y2: iy + iconSize, stroke, strokeWidth: 0.8 * scale }),
      );
    }
    case 'artifact': {
      const aw = 5 * scale;
      const ah = iconSize;
      const fold = 1.5 * scale;
      return React.createElement('path', {
        d: `M${ix},${iy} L${ix + aw - fold},${iy} L${ix + aw},${iy + fold} L${ix + aw},${iy + ah} L${ix},${iy + ah} Z`,
        stroke,
        fill: 'none',
        strokeWidth: 0.6 * scale,
      });
    }
    case 'stepped': {
      const sw = iconSize;
      const sh = iconSize;
      return React.createElement('g', null,
        React.createElement('rect', { x: ix, y: iy + sh * 0.4, width: sw * 0.6, height: sh * 0.6, stroke, fill: 'none', strokeWidth: 0.5 * scale }),
        React.createElement('rect', { x: ix + sw * 0.2, y: iy + sh * 0.2, width: sw * 0.6, height: sh * 0.6, stroke, fill: 'none', strokeWidth: 0.5 * scale }),
        React.createElement('rect', { x: ix + sw * 0.4, y: iy, width: sw * 0.6, height: sh * 0.6, stroke, fill: 'none', strokeWidth: 0.5 * scale }),
      );
    }
    case 'header-bar': {
      return React.createElement('rect', {
        x, y,
        width: w,
        height: 4 * scale,
        fill: stroke,
        opacity: 0.3,
      });
    }
    default:
      return null;
  }
}

export function RectWithIconShape({ x, y, width, height, stroke, fill, scale = 1, opacity = 1, iconType }: RectWithIconProps): React.ReactElement {
  const w = width * scale;
  const h = height * scale;
  return React.createElement('g', { opacity },
    React.createElement('rect', { x, y, width: w, height: h, stroke, fill, strokeWidth: 1 * scale }),
    renderIcon(iconType, x, y, w, h, scale, stroke),
  );
}
