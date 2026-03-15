import React, { useState, useCallback, useMemo } from 'react';
import { getLayerColours } from '../notation/colors';
import { getShapeDefinition } from '../notation/registry';
import { useThemeStore } from '../store/theme';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import type { ArchimateType } from '../model/types';
import { archimateTypeValues } from '../model/types';

interface LayerGroup {
  key: string;
  label: string;
  colorKey: string;
  types: ArchimateType[];
}

/**
 * Build layer groups from the sublayer config, falling back to
 * prefix-based grouping for any types not explicitly listed.
 */
function buildLayerGroups(sublayerConfig: unknown): LayerGroup[] {
  const groups: LayerGroup[] = [];
  const seen = new Set<string>();

  const cfg = sublayerConfig as { layers?: Record<string, { label: string; color_key: string; sublayers: Array<{ element_types: string[] }> }> } | null;
  if (cfg?.layers) {
    // Merge layers that share the same color_key into one palette group
    const merged = new Map<string, { label: string; colorKey: string; types: string[] }>();
    for (const [, def] of Object.entries(cfg.layers)) {
      const existing = merged.get(def.color_key);
      const layerTypes = def.sublayers.flatMap(sl => sl.element_types);
      if (existing) {
        for (const t of layerTypes) {
          if (!existing.types.includes(t)) existing.types.push(t);
        }
      } else {
        const cleanLabel = def.label.replace(/ — .*/, '');
        merged.set(def.color_key, { label: cleanLabel, colorKey: def.color_key, types: [...layerTypes] });
      }
    }

    for (const [key, val] of merged) {
      const validTypes = val.types.filter(t =>
        (archimateTypeValues as readonly string[]).includes(t),
      ) as ArchimateType[];
      for (const t of validTypes) seen.add(t);
      if (validTypes.length > 0) {
        groups.push({ key, label: val.label, colorKey: val.colorKey, types: validTypes });
      }
    }
  }

  const remaining = archimateTypeValues.filter(t => !seen.has(t) && t !== 'grouping' && t !== 'junction' && t !== 'location');
  if (remaining.length > 0) {
    groups.push({ key: 'other', label: 'Other', colorKey: 'implementation', types: remaining as unknown as ArchimateType[] });
  }

  return groups;
}

function formatTypeName(type: string): string {
  return type
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// SVG icon dimensions for palette chips
const ICON_W = 32;
const ICON_H = 22;
const ICON_VB = `0 0 ${ICON_W + 2} ${ICON_H + 2}`;

/**
 * Render a shape icon for a given ArchiMate type.
 * Returns an SVG element showing the notation silhouette.
 */
function renderMiniShape(type: string, stroke: string): React.ReactElement {
  const shapeDef = getShapeDefinition(type);
  const w = ICON_W;
  const h = ICON_H;
  const x = 1;
  const y = 1;
  const sw = 1.2; // strokeWidth

  const children: React.ReactElement[] = [];

  switch (shapeDef.shapeType) {
    case 'rect-with-icon': {
      // Rectangle + icon indicator
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 1,
      }));
      // Render mini icon in top-right
      if (shapeDef.iconType) {
        const ic = renderMiniIcon(shapeDef.iconType, x + w - 6, y + 1, stroke);
        if (ic) children.push(ic);
      }
      break;
    }
    case 'pill': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw,
        rx: h / 2, ry: h / 2,
      }));
      break;
    }
    case 'rounded-rect': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 3, ry: 3,
      }));
      break;
    }
    case 'folded-corner': {
      const fold = 3;
      children.push(React.createElement('path', {
        key: 'r',
        d: `M${x},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h} L${x},${y + h} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Fold line
      children.push(React.createElement('path', {
        key: 'f',
        d: `M${x + w - fold},${y} L${x + w - fold},${y + fold} L${x + w},${y + fold}`,
        stroke, fill: 'none', strokeWidth: sw * 0.7, opacity: 0.5,
      }));
      break;
    }
    case 'box-3d': {
      const d = 3; // depth
      // Front face
      children.push(React.createElement('rect', {
        key: 'front', x, y: y + d, width: w - d, height: h - d,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Top face
      children.push(React.createElement('path', {
        key: 'top',
        d: `M${x},${y + d} L${x + d},${y} L${x + w},${y} L${x + w - d},${y + d} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Right face
      children.push(React.createElement('path', {
        key: 'right',
        d: `M${x + w - d},${y + d} L${x + w},${y} L${x + w},${y + h - d} L${x + w - d},${y + h} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      break;
    }
    case 'event': {
      const notch = 3;
      children.push(React.createElement('path', {
        key: 'r',
        d: `M${x + notch},${y} L${x + w},${y} L${x + w},${y + h} L${x + notch},${y + h} L${x},${y + h / 2} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      break;
    }
    case 'dashed-rect': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw,
        strokeDasharray: '2 1.5',
      }));
      break;
    }
    case 'rect':
    default: {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 1,
      }));
      break;
    }
  }

  return React.createElement('svg', {
    width: ICON_W + 2,
    height: ICON_H + 2,
    viewBox: ICON_VB,
    style: { flexShrink: 0 },
  }, ...children);
}

/**
 * Render a tiny icon for rect-with-icon types.
 */
function renderMiniIcon(iconType: string, ix: number, iy: number, stroke: string): React.ReactElement | null {
  switch (iconType) {
    case 'person': {
      const cx = ix + 4;
      return React.createElement('g', { key: 'icon' },
        React.createElement('circle', { cx, cy: iy + 2.5, r: 2, stroke, fill: 'none', strokeWidth: 0.8 }),
        React.createElement('line', { x1: cx, y1: iy + 5, x2: cx, y2: iy + 10, stroke, strokeWidth: 0.8 }),
        React.createElement('line', { x1: cx - 2.5, y1: iy + 6.5, x2: cx + 2.5, y2: iy + 6.5, stroke, strokeWidth: 0.8 }),
      );
    }
    case 'component': {
      return React.createElement('g', { key: 'icon' },
        React.createElement('rect', { x: ix + 2, y: iy, width: 7, height: 10, stroke, fill: 'none', strokeWidth: 0.7 }),
        React.createElement('rect', { x: ix, y: iy + 1.5, width: 3, height: 2, stroke, fill: 'none', strokeWidth: 0.6 }),
        React.createElement('rect', { x: ix, y: iy + 6, width: 3, height: 2, stroke, fill: 'none', strokeWidth: 0.6 }),
      );
    }
    case 'lollipop': {
      const cx = ix + 4;
      return React.createElement('g', { key: 'icon' },
        React.createElement('circle', { cx, cy: iy + 3, r: 2.5, stroke, fill: 'none', strokeWidth: 0.8 }),
        React.createElement('line', { x1: cx, y1: iy + 5.5, x2: cx, y2: iy + 10, stroke, strokeWidth: 0.8 }),
      );
    }
    case 'artifact': {
      const fold = 2;
      return React.createElement('path', {
        key: 'icon',
        d: `M${ix},${iy} L${ix + 7 - fold},${iy} L${ix + 7},${iy + fold} L${ix + 7},${iy + 10} L${ix},${iy + 10} Z`,
        stroke, fill: 'none', strokeWidth: 0.7,
      });
    }
    case 'stepped': {
      return React.createElement('g', { key: 'icon' },
        React.createElement('rect', { x: ix, y: iy + 4, width: 5.5, height: 5.5, stroke, fill: 'none', strokeWidth: 0.6 }),
        React.createElement('rect', { x: ix + 1.5, y: iy + 2, width: 5.5, height: 5.5, stroke, fill: 'none', strokeWidth: 0.6 }),
        React.createElement('rect', { x: ix + 3, y: iy, width: 5.5, height: 5.5, stroke, fill: 'none', strokeWidth: 0.6 }),
      );
    }
    case 'header-bar': {
      return React.createElement('rect', {
        key: 'icon',
        x: ix - 5, y: iy,
        width: 14, height: 4,
        fill: stroke, opacity: 0.3,
      });
    }
    default:
      return null;
  }
}

/**
 * Render a mini shape icon for UML element types (20×14 SVG).
 */
function renderUmlMiniShape(type: string, stroke: string): React.ReactElement {
  const w = ICON_W, h = ICON_H, x = 1, y = 1, sw = 1.2;
  const children: React.ReactElement[] = [];

  switch (type) {
    case 'uml-class':
    case 'uml-abstract-class': {
      // 3-compartment box
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('line', { key: 'l1', x1: x, y1: y + 4, x2: x + w, y2: y + 4, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'l2', x1: x, y1: y + 8, x2: x + w, y2: y + 8, stroke, strokeWidth: sw * 0.7 }),
      );
      if (type === 'uml-abstract-class') {
        children.push(React.createElement('text', { key: 'i', x: x + w / 2, y: y + 3.2, textAnchor: 'middle', fontSize: 3, fill: stroke, fontStyle: 'italic' }, 'A'));
      }
      break;
    }
    case 'uml-interface': {
      // Lollipop: circle + stem
      const cx = x + w / 2;
      children.push(
        React.createElement('circle', { key: 'c', cx, cy: y + 3, r: 2.5, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('line', { key: 'l', x1: cx, y1: y + 5.5, x2: cx, y2: y + h, stroke, strokeWidth: sw }),
      );
      break;
    }
    case 'uml-enum': {
      // Box with «E» label
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('line', { key: 'l1', x1: x, y1: y + 4, x2: x + w, y2: y + 4, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('text', { key: 't', x: x + w / 2, y: y + 3.2, textAnchor: 'middle', fontSize: 3, fill: stroke }, '\u00ABE\u00BB'),
      );
      break;
    }
    case 'uml-package': {
      // Package tab + body
      const tabW = 7, tabH = 3;
      children.push(
        React.createElement('rect', { key: 'tab', x, y, width: tabW, height: tabH, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 'body', x, y: y + tabH, width: w, height: h - tabH, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
      );
      break;
    }
    case 'uml-component': {
      // Box with two small nubs on left
      children.push(
        React.createElement('rect', { key: 'r', x: x + 2, y, width: w - 2, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 'n1', x, y: y + 2, width: 3, height: 2, stroke, fill: 'none', strokeWidth: sw * 0.7 }),
        React.createElement('rect', { key: 'n2', x, y: y + 7, width: 3, height: 2, stroke, fill: 'none', strokeWidth: sw * 0.7 }),
      );
      break;
    }
    case 'uml-actor': {
      // Stick figure
      const cx = x + w / 2;
      children.push(
        React.createElement('circle', { key: 'head', cx, cy: y + 2, r: 1.8, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('line', { key: 'body', x1: cx, y1: y + 3.8, x2: cx, y2: y + 8, stroke, strokeWidth: sw }),
        React.createElement('line', { key: 'arms', x1: cx - 3, y1: y + 5.5, x2: cx + 3, y2: y + 5.5, stroke, strokeWidth: sw }),
        React.createElement('line', { key: 'll', x1: cx, y1: y + 8, x2: cx - 2.5, y2: y + h, stroke, strokeWidth: sw }),
        React.createElement('line', { key: 'rl', x1: cx, y1: y + 8, x2: cx + 2.5, y2: y + h, stroke, strokeWidth: sw }),
      );
      break;
    }
    case 'uml-use-case': {
      // Oval
      children.push(
        React.createElement('ellipse', { key: 'e', cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2, stroke, fill: 'none', strokeWidth: sw }),
      );
      break;
    }
    case 'uml-note': {
      // Folded corner
      const fold = 3;
      children.push(
        React.createElement('path', { key: 'r', d: `M${x},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h} L${x},${y + h} Z`, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('path', { key: 'f', d: `M${x + w - fold},${y} L${x + w - fold},${y + fold} L${x + w},${y + fold}`, stroke, fill: 'none', strokeWidth: sw * 0.7, opacity: 0.5 }),
      );
      break;
    }
    case 'uml-state':
    case 'uml-activity':
    case 'uml-action': {
      // Rounded rect
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 3, ry: 3 }),
      );
      break;
    }
    case 'uml-decision':
    case 'uml-merge': {
      // Diamond
      const cx = x + w / 2, cy = y + h / 2;
      children.push(
        React.createElement('path', { key: 'd', d: `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`, stroke, fill: 'none', strokeWidth: sw }),
      );
      break;
    }
    case 'uml-initial-node': {
      // Filled circle
      children.push(
        React.createElement('circle', { key: 'c', cx: x + w / 2, cy: y + h / 2, r: 4, fill: stroke }),
      );
      break;
    }
    case 'uml-final-node': {
      // Double circle (outer ring + filled inner)
      const cx = x + w / 2, cy = y + h / 2;
      children.push(
        React.createElement('circle', { key: 'o', cx, cy, r: 5, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('circle', { key: 'i', cx, cy, r: 3, fill: stroke }),
      );
      break;
    }
    case 'uml-flow-final': {
      // Circle with X
      const cx = x + w / 2, cy = y + h / 2, r = 4.5;
      children.push(
        React.createElement('circle', { key: 'c', cx, cy, r, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('line', { key: 'x1', x1: cx - 3, y1: cy - 3, x2: cx + 3, y2: cy + 3, stroke, strokeWidth: sw }),
        React.createElement('line', { key: 'x2', x1: cx + 3, y1: cy - 3, x2: cx - 3, y2: cy + 3, stroke, strokeWidth: sw }),
      );
      break;
    }
    case 'uml-fork':
    case 'uml-join': {
      // Thick horizontal bar
      children.push(
        React.createElement('rect', { key: 'bar', x, y: y + h / 2 - 1.5, width: w, height: 3, fill: stroke, rx: 0.5 }),
      );
      break;
    }
    case 'uml-lifeline': {
      // Head box + dashed line
      children.push(
        React.createElement('rect', { key: 'r', x: x + 3, y, width: w - 6, height: 5, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('line', { key: 'l', x1: x + w / 2, y1: y + 5, x2: x + w / 2, y2: y + h, stroke, strokeWidth: sw, strokeDasharray: '1.5 1' }),
      );
      break;
    }
    case 'uml-activation': {
      // Narrow vertical rect
      children.push(
        React.createElement('rect', { key: 'r', x: x + w / 2 - 2, y, width: 4, height: h, stroke, fill: 'none', strokeWidth: sw }),
      );
      break;
    }
    case 'uml-fragment': {
      // Dashed rect with label tab
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, strokeDasharray: '2 1', rx: 0.5 }),
        React.createElement('path', { key: 'tab', d: `M${x},${y + 4} L${x + 5},${y + 4} L${x + 6},${y + 3} L${x + 6},${y} `, stroke, fill: 'none', strokeWidth: sw * 0.7 }),
      );
      break;
    }
    default: {
      // Generic box fallback
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
      );
      break;
    }
  }

  return React.createElement('svg', { width: ICON_W + 2, height: ICON_H + 2, viewBox: ICON_VB, style: { flexShrink: 0 } }, ...children);
}

/**
 * Render a mini shape icon for wireframe element types (20×14 SVG).
 */
function renderWfMiniShape(type: string, stroke: string): React.ReactElement {
  const w = ICON_W, h = ICON_H, x = 1, y = 1, sw = 1.2;
  const children: React.ReactElement[] = [];

  switch (type) {
    case 'wf-page': {
      // Browser chrome: title bar + body
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('line', { key: 'bar', x1: x, y1: y + 3, x2: x + w, y2: y + 3, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('circle', { key: 'd1', cx: x + 2, cy: y + 1.5, r: 0.7, fill: stroke }),
        React.createElement('circle', { key: 'd2', cx: x + 4, cy: y + 1.5, r: 0.7, fill: stroke }),
        React.createElement('circle', { key: 'd3', cx: x + 6, cy: y + 1.5, r: 0.7, fill: stroke }),
      );
      break;
    }
    case 'wf-section': {
      // Dashed rect
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, strokeDasharray: '2 1.5', rx: 1 }),
      );
      break;
    }
    case 'wf-card':
    case 'wf-modal': {
      // Rounded card
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 2 }),
      );
      if (type === 'wf-modal') {
        // X button
        children.push(
          React.createElement('line', { key: 'x1', x1: x + w - 3, y1: y + 1, x2: x + w - 1, y2: y + 3, stroke, strokeWidth: sw * 0.7 }),
          React.createElement('line', { key: 'x2', x1: x + w - 1, y1: y + 1, x2: x + w - 3, y2: y + 3, stroke, strokeWidth: sw * 0.7 }),
        );
      }
      break;
    }
    case 'wf-header': {
      // Rect with fill band
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('rect', { key: 'f', x: x + 0.5, y: y + 0.5, width: w - 1, height: 3, fill: stroke, opacity: 0.2, rx: 0.5 }),
      );
      break;
    }
    case 'wf-button': {
      // Pill
      children.push(
        React.createElement('rect', { key: 'r', x, y: y + 2, width: w, height: h - 4, stroke, fill: 'none', strokeWidth: sw, rx: (h - 4) / 2 }),
      );
      break;
    }
    case 'wf-input':
    case 'wf-textarea': {
      // Input field
      children.push(
        React.createElement('rect', { key: 'r', x, y: y + (type === 'wf-textarea' ? 0 : 2), width: w, height: type === 'wf-textarea' ? h : h - 4, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('line', { key: 'cursor', x1: x + 2, y1: y + (type === 'wf-textarea' ? 2 : 4), x2: x + 2, y2: y + (type === 'wf-textarea' ? 5 : 8), stroke, strokeWidth: sw * 0.5, opacity: 0.5 }),
      );
      break;
    }
    case 'wf-select': {
      // Dropdown
      children.push(
        React.createElement('rect', { key: 'r', x, y: y + 2, width: w, height: h - 4, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('path', { key: 'arr', d: `M${x + w - 5},${y + 4} L${x + w - 3},${y + 6.5} L${x + w - 1},${y + 4}`, stroke, fill: 'none', strokeWidth: sw }),
      );
      break;
    }
    case 'wf-checkbox': {
      children.push(
        React.createElement('rect', { key: 'r', x: x + 5, y: y + 2, width: 8, height: 8, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('path', { key: 'ck', d: `M${x + 7},${y + 6} L${x + 9},${y + 8} L${x + 12},${y + 4}`, stroke, fill: 'none', strokeWidth: sw }),
      );
      break;
    }
    case 'wf-radio': {
      children.push(
        React.createElement('circle', { key: 'o', cx: x + w / 2, cy: y + h / 2, r: 4, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('circle', { key: 'i', cx: x + w / 2, cy: y + h / 2, r: 2, fill: stroke }),
      );
      break;
    }
    case 'wf-table': {
      // Grid
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('line', { key: 'h1', x1: x, y1: y + 4, x2: x + w, y2: y + 4, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'h2', x1: x, y1: y + 8, x2: x + w, y2: y + 8, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'v1', x1: x + 6, y1: y, x2: x + 6, y2: y + h, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'v2', x1: x + 12, y1: y, x2: x + 12, y2: y + h, stroke, strokeWidth: sw * 0.7 }),
      );
      break;
    }
    case 'wf-list': {
      // Stacked lines
      for (let i = 0; i < 3; i++) {
        const ly = y + 1 + i * 4;
        children.push(
          React.createElement('circle', { key: `b${i}`, cx: x + 2, cy: ly + 1, r: 0.8, fill: stroke }),
          React.createElement('line', { key: `l${i}`, x1: x + 4, y1: ly + 1, x2: x + w - 1, y2: ly + 1, stroke, strokeWidth: sw * 0.7 }),
        );
      }
      break;
    }
    case 'wf-form': {
      // Stacked input fields
      children.push(
        React.createElement('rect', { key: 'r1', x, y, width: w, height: 4, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 'r2', x, y: y + 5.5, width: w, height: 4, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 'btn', x: x + w - 7, y: y + h - 1.5, width: 7, height: 1.5, fill: stroke, opacity: 0.4, rx: 0.5 }),
      );
      break;
    }
    case 'wf-nav': {
      // Horizontal bar with dots
      children.push(
        React.createElement('rect', { key: 'r', x, y: y + 3, width: w, height: 6, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('line', { key: 'l1', x1: x + 3, y1: y + 5, x2: x + 7, y2: y + 5, stroke, strokeWidth: sw * 0.6, opacity: 0.5 }),
        React.createElement('line', { key: 'l2', x1: x + 9, y1: y + 5, x2: x + 13, y2: y + 5, stroke, strokeWidth: sw * 0.6, opacity: 0.5 }),
        React.createElement('line', { key: 'l3', x1: x + 15, y1: y + 5, x2: x + 18, y2: y + 5, stroke, strokeWidth: sw * 0.6, opacity: 0.5 }),
      );
      break;
    }
    case 'wf-link': {
      // Underlined text
      children.push(
        React.createElement('line', { key: 'l', x1: x + 3, y1: y + h / 2 + 1, x2: x + w - 3, y2: y + h / 2 + 1, stroke, strokeWidth: sw }),
        React.createElement('line', { key: 'u', x1: x + 3, y1: y + h / 2 + 3, x2: x + w - 3, y2: y + h / 2 + 3, stroke, strokeWidth: sw * 0.5 }),
      );
      break;
    }
    case 'wf-tab-group': {
      // Tabs
      children.push(
        React.createElement('rect', { key: 'body', x, y: y + 3, width: w, height: h - 3, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 't1', x, y, width: 6, height: 4, stroke, fill: 'none', strokeWidth: sw, rx: 0.5 }),
        React.createElement('rect', { key: 't2', x: x + 6.5, y, width: 6, height: 4, stroke, fill: 'none', strokeWidth: sw * 0.6, rx: 0.5, opacity: 0.5 }),
      );
      break;
    }
    case 'wf-text': {
      // Text lines
      children.push(
        React.createElement('line', { key: 'l1', x1: x, y1: y + 2, x2: x + w, y2: y + 2, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'l2', x1: x, y1: y + 5, x2: x + w - 3, y2: y + 5, stroke, strokeWidth: sw * 0.7 }),
        React.createElement('line', { key: 'l3', x1: x, y1: y + 8, x2: x + w - 6, y2: y + 8, stroke, strokeWidth: sw * 0.7 }),
      );
      break;
    }
    case 'wf-image': {
      // Image placeholder with mountain icon
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
        React.createElement('path', { key: 'm', d: `M${x + 2},${y + h - 2} L${x + 6},${y + 3} L${x + 10},${y + 7} L${x + 13},${y + 5} L${x + w - 2},${y + h - 2} Z`, stroke, fill: 'none', strokeWidth: sw * 0.7 }),
      );
      break;
    }
    case 'wf-icon': {
      // Star icon
      const cx = x + w / 2, cy = y + h / 2;
      children.push(
        React.createElement('circle', { key: 'c', cx, cy, r: 5, stroke, fill: 'none', strokeWidth: sw }),
        React.createElement('circle', { key: 'dot', cx, cy, r: 1.5, fill: stroke }),
      );
      break;
    }
    case 'wf-placeholder': {
      // X in a box
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, strokeDasharray: '2 1', rx: 1 }),
        React.createElement('line', { key: 'x1', x1: x + 2, y1: y + 2, x2: x + w - 2, y2: y + h - 2, stroke, strokeWidth: sw * 0.5, opacity: 0.4 }),
        React.createElement('line', { key: 'x2', x1: x + w - 2, y1: y + 2, x2: x + 2, y2: y + h - 2, stroke, strokeWidth: sw * 0.5, opacity: 0.4 }),
      );
      break;
    }
    default: {
      children.push(
        React.createElement('rect', { key: 'r', x, y, width: w, height: h, stroke, fill: 'none', strokeWidth: sw, rx: 1 }),
      );
      break;
    }
  }

  return React.createElement('svg', { width: ICON_W + 2, height: ICON_H + 2, viewBox: ICON_VB, style: { flexShrink: 0 } }, ...children);
}

// ── UML palette groups ──────────────────────────────────────────

interface SimpleGroup {
  key: string;
  label: string;
  types: string[];
}

const UML_CLASS_GROUPS: SimpleGroup[] = [
  { key: 'classes', label: 'Classes', types: ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum', 'uml-package'] },
  { key: 'components', label: 'Components', types: ['uml-component'] },
  { key: 'other-uml', label: 'Other', types: ['uml-actor', 'uml-use-case', 'uml-note', 'uml-state', 'uml-activity'] },
];

const UML_ACTIVITY_GROUPS: SimpleGroup[] = [
  { key: 'act-nodes', label: 'Action Nodes', types: ['uml-action', 'uml-decision', 'uml-merge'] },
  { key: 'act-control', label: 'Control Nodes', types: ['uml-initial-node', 'uml-final-node', 'uml-flow-final', 'uml-fork', 'uml-join'] },
];

const UML_USECASE_GROUPS: SimpleGroup[] = [
  { key: 'uc-elements', label: 'Elements', types: ['uml-actor', 'uml-use-case'] },
];

const UML_SEQUENCE_GROUPS: SimpleGroup[] = [
  { key: 'seq-elements', label: 'Elements', types: ['uml-lifeline', 'uml-activation', 'uml-fragment'] },
];

const WIREFRAME_GROUPS: SimpleGroup[] = [
  { key: 'layout', label: 'Layout', types: ['wf-page', 'wf-section', 'wf-card', 'wf-modal', 'wf-header'] },
  { key: 'controls', label: 'Controls', types: ['wf-button', 'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio'] },
  { key: 'data', label: 'Data', types: ['wf-table', 'wf-list', 'wf-form'] },
  { key: 'navigation', label: 'Navigation', types: ['wf-nav', 'wf-link', 'wf-tab-group'] },
  { key: 'content', label: 'Content', types: ['wf-text', 'wf-image', 'wf-icon', 'wf-placeholder'] },
];

export function Palette(): React.ReactElement {
  const theme = useThemeStore(s => s.theme);
  const sublayerConfig = useModelStore(s => s.sublayerConfig);
  const currentView = useViewStore(s => s.currentView);
  const viewpointType = currentView?.viewpoint_type ?? 'layered';
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const layerGroups = useMemo(() => buildLayerGroups(sublayerConfig), [sublayerConfig]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, archimateType: string, layer: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ archimate_type: archimateType, layer }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Determine palette mode from viewpoint
  const isUmlSequence = viewpointType === 'uml_sequence';
  const isUmlActivity = viewpointType === 'uml_activity';
  const isUmlUseCase = viewpointType === 'uml_usecase';
  const isUml = !isUmlSequence && !isUmlActivity && !isUmlUseCase && (viewpointType === 'uml_class' || viewpointType === 'uml_component');
  const isWireframe = viewpointType === 'wireframe';

  const paletteTitle = isUmlSequence ? 'Sequence Elements'
    : isUmlActivity ? 'Activity Elements'
    : isUmlUseCase ? 'Use Case Elements'
    : isUml ? 'UML Elements'
    : isWireframe ? 'Wireframe Elements'
    : 'Elements';

  // Render a simple (non-ArchiMate) group for UML / wireframe palettes
  const renderSimpleGroup = (group: SimpleGroup, borderColour: string, chipBg: string, dropLayer: string, miniShapeRenderer?: (type: string, stroke: string) => React.ReactElement) => {
    const isExpanded = expandedGroups.has(group.key);
    return React.createElement('div', {
      key: group.key,
      style: {
        marginBottom: 4,
        borderLeft: `3px solid ${borderColour}`,
        borderRadius: 2,
      },
    },
      // Group header
      React.createElement('div', {
        onClick: () => toggleGroup(group.key),
        style: {
          padding: '3px 6px',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none' as const,
          background: `${borderColour}18`,
          borderRadius: '0 2px 2px 0',
        },
      },
        group.label,
        React.createElement('span', {
          style: { fontSize: 7, opacity: 0.5 },
        }, isExpanded ? '\u25BC' : '\u25B6'),
      ),
      // Type chips — icon-centric grid
      isExpanded && React.createElement('div', {
        style: {
          padding: '4px 2px',
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: 2,
        },
      },
        ...group.types.map(type =>
          React.createElement('div', {
            key: type,
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, type, dropLayer),
            style: {
              padding: '3px 2px 1px',
              cursor: 'grab',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              width: 52,
              userSelect: 'none' as const,
            },
            title: formatTypeName(type),
          },
            miniShapeRenderer ? miniShapeRenderer(type, borderColour) : null,
            React.createElement('span', {
              style: {
                fontSize: 7,
                lineHeight: '9px',
                textAlign: 'center' as const,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                width: '100%',
                opacity: 0.7,
                marginTop: 1,
              },
            }, formatTypeName(type)),
          ),
        ),
      ),
    );
  };

  return React.createElement('div', {
    style: {
      borderTop: '1px solid var(--border-primary)',
      fontSize: 11,
    },
  },
    // Header
    React.createElement('div', {
      onClick: () => setCollapsed(c => !c),
      style: {
        padding: '6px 10px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none' as const,
      },
    },
      paletteTitle,
      React.createElement('span', {
        style: { fontSize: 8, opacity: 0.6 },
      }, collapsed ? '\u25B6' : '\u25BC'),
    ),

    // Body — UML Sequence palette
    !collapsed && isUmlSequence && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_SEQUENCE_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application', renderUmlMiniShape)),
    ),

    // Body — UML Activity palette
    !collapsed && isUmlActivity && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_ACTIVITY_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application', renderUmlMiniShape)),
    ),

    // Body — UML Use Case palette
    !collapsed && isUmlUseCase && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_USECASE_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application', renderUmlMiniShape)),
    ),

    // Body — UML class/component palette
    !collapsed && isUml && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_CLASS_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application', renderUmlMiniShape)),
    ),

    // Body — Wireframe palette
    !collapsed && isWireframe && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...WIREFRAME_GROUPS.map(g => renderSimpleGroup(g, '#8E8E93', 'rgba(142,142,147,0.08)', 'implementation', renderWfMiniShape)),
    ),

    // Body — ArchiMate palette (default)
    !collapsed && !isUml && !isUmlSequence && !isUmlActivity && !isUmlUseCase && !isWireframe && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...layerGroups.map(group => {
        const colours = getLayerColours(group.colorKey, theme);
        const isExpanded = expandedGroups.has(group.key);

        return React.createElement('div', {
          key: group.key,
          style: {
            marginBottom: 4,
            borderLeft: `3px solid ${colours.stroke}`,
            borderRadius: 2,
          },
        },
          // Group header
          React.createElement('div', {
            onClick: () => toggleGroup(group.key),
            style: {
              padding: '3px 6px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none' as const,
              background: colours.planeFill,
              borderRadius: '0 2px 2px 0',
            },
          },
            group.label,
            React.createElement('span', {
              style: { fontSize: 7, opacity: 0.5 },
            }, isExpanded ? '\u25BC' : '\u25B6'),
          ),

          // Type chips — icon-centric grid
          isExpanded && React.createElement('div', {
            style: {
              padding: '4px 2px',
              display: 'flex',
              flexWrap: 'wrap' as const,
              gap: 2,
            },
          },
            ...group.types.map(type =>
              React.createElement('div', {
                key: type,
                draggable: true,
                onDragStart: (e: React.DragEvent) => handleDragStart(e, type, group.colorKey),
                style: {
                  padding: '3px 2px 1px',
                  cursor: 'grab',
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  width: 52,
                  userSelect: 'none' as const,
                },
                title: formatTypeName(type),
              },
                renderMiniShape(type, colours.stroke),
                React.createElement('span', {
                  style: {
                    fontSize: 7,
                    lineHeight: '9px',
                    textAlign: 'center' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    width: '100%',
                    opacity: 0.7,
                    marginTop: 1,
                  },
                }, formatTypeName(type)),
              ),
            ),
          ),
        );
      }),
    ),
  );
}
