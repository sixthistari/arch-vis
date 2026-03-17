import React from 'react';
import type { ShapeProps } from './rect';
import { RectShape } from './rect';
import { RoundedRectShape } from './rounded-rect';
import { PillShape } from './pill';
import { FoldedCornerShape } from './folded-corner';
import { Box3DShape } from './box-3d';
import { EventShape } from './event';
import { DashedRectShape } from './dashed-rect';
import { RectWithIconShape } from './rect-with-icon';
import type { IconType } from './rect-with-icon';
import type { ShapeType } from '../../shared/registry';

export interface ShapeRenderOptions extends ShapeProps {
  shapeType: ShapeType;
  iconType?: IconType;
}

export function renderShape(opts: ShapeRenderOptions): React.ReactElement {
  switch (opts.shapeType) {
    case 'rect':
      return React.createElement(RectShape, opts);
    case 'rounded-rect':
      return React.createElement(RoundedRectShape, opts);
    case 'pill':
      return React.createElement(PillShape, opts);
    case 'folded-corner':
      return React.createElement(FoldedCornerShape, opts);
    case 'box-3d':
      return React.createElement(Box3DShape, opts);
    case 'event':
      return React.createElement(EventShape, opts);
    case 'dashed-rect':
      return React.createElement(DashedRectShape, opts);
    case 'rect-with-icon':
      return React.createElement(RectWithIconShape, { ...opts, iconType: opts.iconType ?? 'person' });
    default:
      return React.createElement(RectShape, opts);
  }
}

export type { ShapeType } from '../../shared/registry';
export type { ShapeProps } from './rect';
export type { IconType } from './rect-with-icon';
