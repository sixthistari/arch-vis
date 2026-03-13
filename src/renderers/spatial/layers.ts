import React from 'react';
import { project3D, PLANE_WIDTH, PLANE_DEPTH, LAYER_COMPRESSION } from './projection';
import { getLayerColours } from '../../notation/colors';
import type { ThemeMode } from '../../theme/tokens';

export interface LayerPlaneConfig {
  layerKey: string;
  label: string;
  colorKey: string;
  index: number;
}

interface PlaneCorner {
  sx: number;
  sy: number;
}

interface ProjectedPlane {
  corners: [PlaneCorner, PlaneCorner, PlaneCorner, PlaneCorner];
  labelPos: { sx: number; sy: number };
  z: number;
  config: LayerPlaneConfig;
}

/**
 * Compute the world-space Y for a layer, centred around origin.
 * Motivation (index 0) → most negative wy → visually on top.
 * Implementation (last index) → most positive wy → visually on bottom.
 */
export function layerWorldY(index: number, totalLayers: number, spacing: number): number {
  const midpoint = (totalLayers - 1) / 2;
  return (index - midpoint) * spacing * LAYER_COMPRESSION;
}

export function projectLayerPlanes(
  planes: LayerPlaneConfig[],
  rotY: number,
  rotX: number,
  centreX: number,
  centreY: number,
  zoom: number,
  viewWidth: number,
  viewHeight: number,
  panX: number,
  panY: number,
  layerSpacing: number,
): ProjectedPlane[] {
  const halfW = PLANE_WIDTH / 2;
  const halfD = PLANE_DEPTH / 2;
  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const totalLayers = planes.length;

  return planes.map((config) => {
    const wy = layerWorldY(config.index, totalLayers, layerSpacing);

    // Project 4 corners, then scale by zoom around view centre
    const rawCorners = [
      project3D(-halfW, wy, -halfD, rotY, rotX, centreX, centreY),
      project3D(halfW, wy, -halfD, rotY, rotX, centreX, centreY),
      project3D(halfW, wy, halfD, rotY, rotX, centreX, centreY),
      project3D(-halfW, wy, halfD, rotY, rotX, centreX, centreY),
    ] as const;

    const corners: [PlaneCorner, PlaneCorner, PlaneCorner, PlaneCorner] = [
      { sx: cx + (rawCorners[0].sx - cx) * zoom + panX, sy: cy + (rawCorners[0].sy - cy) * zoom + panY },
      { sx: cx + (rawCorners[1].sx - cx) * zoom + panX, sy: cy + (rawCorners[1].sy - cy) * zoom + panY },
      { sx: cx + (rawCorners[2].sx - cx) * zoom + panX, sy: cy + (rawCorners[2].sy - cy) * zoom + panY },
      { sx: cx + (rawCorners[3].sx - cx) * zoom + panX, sy: cy + (rawCorners[3].sy - cy) * zoom + panY },
    ];

    const rawLabel = project3D(-halfW - 10, wy, -halfD, rotY, rotX, centreX, centreY);
    const labelPos = {
      sx: cx + (rawLabel.sx - cx) * zoom + panX,
      sy: cy + (rawLabel.sy - cy) * zoom + panY,
    };

    const avgZ = project3D(0, wy, 0, rotY, rotX, centreX, centreY).z;

    return { corners, labelPos, z: avgZ, config };
  });
}

/**
 * Interpolate between two projected corners.
 * t=0 returns `from`, t=1 returns `to`.
 */
function lerpCorner(from: PlaneCorner, to: PlaneCorner, t: number): PlaneCorner {
  return { sx: from.sx + (to.sx - from.sx) * t, sy: from.sy + (to.sy - from.sy) * t };
}

export function renderLayerPlanes(
  planes: ProjectedPlane[],
  theme: ThemeMode,
  highlightedNodes: Set<string>,
  _layerHasHighlighted: Map<string, boolean>,
  zoom: number,
  onLayerClick?: (layerKey: string) => void,
  highlightLayer?: string | null,
): React.ReactElement[] {
  // Sort planes by z (farthest first — painter's algorithm)
  const sorted = [...planes].sort((a, b) => b.z - a.z);

  // Major grid divisions (adaptive to zoom) + 15 minor lines between each pair
  const majorDivisions = Math.max(3, Math.min(10, Math.round(5 * zoom)));
  const minorPerMajor = 15;

  return sorted.map((plane) => {
    const { corners, labelPos, config } = plane;
    const colours = getLayerColours(config.colorKey, theme);
    const hasHighlight = highlightedNodes.size === 0 || (_layerHasHighlighted.get(config.layerKey) ?? false);
    const planeOpacity = hasHighlight ? 1 : 0.13;

    const points = corners.map(c => `${c.sx},${c.sy}`).join(' ');
    const [c0, c1, c2, c3] = corners; // TL, TR, BR, BL

    const gridElements: React.ReactElement[] = [];
    const totalLines = majorDivisions * minorPerMajor;
    let keyIdx = 0;

    // Horizontal grid lines (left edge c0→c3, right edge c1→c2)
    for (let i = 0; i <= totalLines; i++) {
      const t = i / totalLines;
      const isMajor = i % minorPerMajor === 0;
      const isBoundary = i === 0 || i === totalLines;
      const left = lerpCorner(c0, c3, t);
      const right = lerpCorner(c1, c2, t);
      gridElements.push(React.createElement('line', {
        key: `h-${keyIdx++}`,
        x1: left.sx, y1: left.sy,
        x2: right.sx, y2: right.sy,
        stroke: colours.stroke,
        strokeWidth: isBoundary ? 0.8 : isMajor ? 0.5 : 0.25,
        strokeOpacity: isBoundary ? 0.5 : isMajor ? 0.3 : 0.1,
      }));
    }

    // Vertical grid lines (top edge c0→c1, bottom edge c3→c2)
    for (let i = 0; i <= totalLines; i++) {
      const t = i / totalLines;
      const isMajor = i % minorPerMajor === 0;
      const isBoundary = i === 0 || i === totalLines;
      const top = lerpCorner(c0, c1, t);
      const bottom = lerpCorner(c3, c2, t);
      gridElements.push(React.createElement('line', {
        key: `v-${keyIdx++}`,
        x1: top.sx, y1: top.sy,
        x2: bottom.sx, y2: bottom.sy,
        stroke: colours.stroke,
        strokeWidth: isBoundary ? 0.8 : isMajor ? 0.5 : 0.25,
        strokeOpacity: isBoundary ? 0.5 : isMajor ? 0.3 : 0.1,
      }));
    }

    const isDropTarget = highlightLayer === config.layerKey;

    return React.createElement('g', { key: config.layerKey, opacity: planeOpacity },
      // Invisible click target covering the full plane area
      React.createElement('polygon', {
        points,
        fill: 'transparent',
        stroke: 'none',
        style: onLayerClick ? { cursor: 'pointer' } : undefined,
        onClick: onLayerClick ? (e: React.MouseEvent) => {
          e.stopPropagation();
          onLayerClick(config.layerKey);
        } : undefined,
      }),
      // Grid mesh
      ...gridElements,
      // Drop target tint overlay
      isDropTarget ? React.createElement('polygon', {
        points,
        fill: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
        stroke: colours.stroke,
        strokeWidth: 2,
        strokeOpacity: 0.8,
        pointerEvents: 'none',
      }) : null,
      // Label
      zoom >= 0.3 ? React.createElement('text', {
        x: labelPos.sx - 5,
        y: labelPos.sy,
        fontSize: Math.max(7, 9 * zoom),
        fill: colours.stroke,
        textAnchor: 'end',
        dominantBaseline: 'middle',
        opacity: 0.7,
        pointerEvents: 'none',
      }, config.label) : null,
    );
  });
}
