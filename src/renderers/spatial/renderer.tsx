import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { project3D } from './projection';
import { depthSort } from './depth-sort';
import { getZoomTierConfig } from './zoom-tiers';
import { projectLayerPlanes, renderLayerPlanes } from './layers';
import { computeOrthogonalRoutes } from '../../layout/edge-routing';
import type { LayerPlaneConfig } from './layers';
import type { PositionedElement, PositionedEdge } from '../types';
import { renderShape } from '../../notation/shapes/index';
import { renderBadge } from '../../notation/badges';
import { getShapeDefinition } from '../../notation/registry';
import { getLayerStroke, getLayerFill, HIGHLIGHT_COLOURS } from '../../shared/colors';
import { getEdgeStyle, renderMarkerDefs } from '../../notation/edge-styles';
import type { CameraState } from '../../interaction/pan-zoom-rotate';
import { applyPan, applyZoom, applyRotation } from '../../interaction/pan-zoom-rotate';
import type { ThemeMode } from '../../theme/tokens';

interface SpatialRendererProps {
  elements: PositionedElement[];
  edges: PositionedEdge[];
  layerPlanes: LayerPlaneConfig[];
  camera: CameraState;
  onCameraChange: (camera: CameraState) => void;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  selectedId: string | null;
  onElementClick: (id: string) => void;
  onElementDoubleClick: (id: string) => void;
  onBackgroundClick: () => void;
  onElementDrag: (id: string, dwx: number, dwy: number) => void;
  onElementDragEnd?: (id: string) => void;
  onElementContextMenu?: (id: string, x: number, y: number) => void;
  onBackgroundContextMenu?: (x: number, y: number) => void;
  onLayerClick?: (layerKey: string) => void;
  highlightLayer?: string | null;
  theme: ThemeMode;
  specialisationMap: Map<string, { code: string }>;
}

export function SpatialRenderer({
  elements,
  edges,
  layerPlanes,
  camera,
  onCameraChange,
  highlightedNodes,
  highlightedEdges,
  selectedId,
  onElementClick,
  onElementDoubleClick,
  onBackgroundClick,
  onElementDrag,
  onElementDragEnd,
  onElementContextMenu,
  onBackgroundContextMenu,
  onLayerClick,
  highlightLayer,
  theme,
  specialisationMap,
}: SpatialRendererProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const dragRef = useRef<{ type: 'pan' | 'rotate' | 'element'; lastX: number; lastY: number; elementId?: string } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current?.parentElement) {
        setSize({
          width: svgRef.current.parentElement.clientWidth,
          height: svgRef.current.parentElement.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const centreX = size.width / 2 + camera.panX;
  const centreY = size.height / 2 + camera.panY;

  const tierConfig = getZoomTierConfig(camera.zoom);

  // Project all elements — zoom scales both size and position around centre
  // When zoomed in past 1.0, apply a fidelity reduction so elements shrink
  // relative to the plane, improving layout density and readability.
  const fidelityScale = camera.zoom > 1.0
    ? 1.0 / Math.pow(camera.zoom, 0.4)
    : 1.0;

  const projectedElements = useMemo(() => {
    const cx = size.width / 2;
    const cy = size.height / 2;
    return elements.map((el) => {
      const p = project3D(el.wx, el.wy, el.wz, camera.rotY, camera.rotX, centreX, centreY);
      return {
        ...el,
        sx: cx + (p.sx - cx) * camera.zoom + camera.panX,
        sy: cy + (p.sy - cy) * camera.zoom + camera.panY,
        scale: p.scale * camera.zoom * fidelityScale,
        z: p.z,
      };
    });
  }, [elements, camera.rotY, camera.rotX, camera.zoom, centreX, centreY, size, camera.panX, camera.panY, fidelityScale]);

  // Project layer planes — with zoom scaling and configurable spacing
  const projectedPlanes = useMemo(() => {
    return projectLayerPlanes(
      layerPlanes, camera.rotY, camera.rotX, centreX, centreY,
      camera.zoom, size.width, size.height, camera.panX, camera.panY,
      camera.layerSpacing,
    );
  }, [layerPlanes, camera.rotY, camera.rotX, centreX, centreY, camera.zoom, size, camera.panX, camera.panY, camera.layerSpacing]);

  // Compute which layers have highlighted elements
  const layerHasHighlighted = useMemo(() => {
    const map = new Map<string, boolean>();
    if (highlightedNodes.size > 0) {
      for (const el of elements) {
        if (highlightedNodes.has(el.id)) {
          map.set(el.layer, true);
        }
      }
    }
    return map;
  }, [elements, highlightedNodes]);

  // Project edges
  const projectedEdges = useMemo(() => {
    const elementMap = new Map(projectedElements.map(e => [e.id, e]));
    return edges.map((edge) => {
      const src = elementMap.get(edge.sourceId);
      const tgt = elementMap.get(edge.targetId);
      if (!src || !tgt) return null;
      return {
        ...edge,
        sx1: src.sx + (src.width * src.scale) / 2,
        sy1: src.sy + (src.height * src.scale) / 2,
        sx2: tgt.sx + (tgt.width * tgt.scale) / 2,
        sy2: tgt.sy + (tgt.height * tgt.scale) / 2,
        sourceLayer: src.layer,
        targetLayer: tgt.layer,
      };
    }).filter((e): e is PositionedEdge => e !== null);
  }, [projectedElements, edges]);

  // Orthogonal edge routes
  const edgeRoutes = useMemo(() => {
    return computeOrthogonalRoutes(projectedEdges, projectedElements);
  }, [projectedEdges, projectedElements]);

  // Depth-sorted elements
  const sortedElements = useMemo(() => depthSort(projectedElements), [projectedElements]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const type = e.shiftKey ? 'rotate' : 'pan';
    dragRef.current = { type, lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    if (dragRef.current.type === 'rotate') {
      onCameraChange(applyRotation(camera, dx * 0.005, -dy * 0.005));
    } else if (dragRef.current.type === 'element' && dragRef.current.elementId) {
      // Convert screen delta to world delta (approximate inverse of projection)
      const worldDx = dx / (camera.zoom);
      const worldDy = dy / (camera.zoom);
      onElementDrag(dragRef.current.elementId, worldDx, worldDy);
    } else {
      onCameraChange(applyPan(camera, dx, dy));
    }
  }, [camera, onCameraChange, onElementDrag]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current?.type === 'element' && dragRef.current.elementId) {
      onElementDragEnd?.(dragRef.current.elementId);
    }
    dragRef.current = null;
  }, [onElementDragEnd]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    onCameraChange(applyZoom(camera, e.deltaY));
  }, [camera, onCameraChange]);

  // Register wheel handler natively with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleBgClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).classList.contains('bg-rect')) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

  const hasHighlight = highlightedNodes.size > 0;
  const highlightColour = HIGHLIGHT_COLOURS[theme].highlight;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).classList.contains('bg-rect')) {
      onBackgroundContextMenu?.(e.clientX, e.clientY);
    }
  }, [onBackgroundContextMenu]);

  return React.createElement('svg', {
    ref: svgRef,
    width: '100%',
    height: '100%',
    style: { cursor: dragRef.current ? 'grabbing' : 'grab', userSelect: 'none' },
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onClick: handleBgClick,
    onContextMenu: handleContextMenu,
  },
    // Marker defs
    React.createElement('defs', {
      dangerouslySetInnerHTML: { __html: renderMarkerDefs() },
    }),

    // Background
    React.createElement('rect', {
      className: 'bg-rect',
      width: '100%',
      height: '100%',
      fill: 'transparent',
    }),

    // Layer planes
    ...renderLayerPlanes(projectedPlanes, theme, highlightedNodes, layerHasHighlighted, camera.zoom, onLayerClick, highlightLayer ?? null),

    // Edges
    ...projectedEdges.map((edge) => {
      const style = getEdgeStyle(edge.archimateType);
      const isHighlighted = hasHighlight && highlightedEdges.has(edge.id);
      const isDimmed = hasHighlight && !isHighlighted;
      const opacity = isDimmed ? 0.03 : isHighlighted ? 0.85 : 0.4;
      const colour = isHighlighted ? highlightColour : getLayerStroke(edge.sourceLayer, theme);

      const pathD = edgeRoutes.get(edge.id) ?? `M${edge.sx1},${edge.sy1} L${edge.sx2},${edge.sy2}`;

      return React.createElement('path', {
        key: edge.id,
        d: pathD,
        stroke: colour,
        strokeWidth: style.width,
        strokeDasharray: style.dashArray,
        fill: 'none',
        opacity,
        markerStart: style.sourceMarker ? `url(#marker-${style.sourceMarker})` : undefined,
        markerEnd: style.targetMarker ? `url(#marker-${style.targetMarker})` : undefined,
        style: { color: colour },
      });
    }),

    // Elements
    ...sortedElements.map((el) => {
      const shapeDef = getShapeDefinition(el.archimateType);
      const isSelected = selectedId === el.id;
      const isHighlighted = hasHighlight && highlightedNodes.has(el.id);
      const isDimmed = hasHighlight && !isHighlighted;
      const opacity = isDimmed ? 0.09 : 1;

      const stroke = isSelected || isHighlighted
        ? highlightColour
        : getLayerStroke(el.layer, theme);
      const fill = getLayerFill(el.layer, theme);
      const w = (shapeDef.defaultWidth) * el.scale;
      const h = (shapeDef.defaultHeight) * el.scale;

      const elGroup: React.ReactElement[] = [];

      // Selection glow
      if (isSelected || isHighlighted) {
        elGroup.push(React.createElement('rect', {
          key: `glow-${el.id}`,
          x: el.sx - 2,
          y: el.sy - 2,
          width: w + 4,
          height: h + 4,
          rx: 3,
          fill: 'none',
          stroke: highlightColour,
          strokeWidth: 2,
          opacity: 0.4,
          filter: 'blur(3px)',
        }));
      }

      // Shape
      elGroup.push(
        renderShape({
          key: `shape-${el.id}`,
          shapeType: shapeDef.shapeType,
          iconType: shapeDef.iconType,
          x: el.sx,
          y: el.sy,
          width: shapeDef.defaultWidth,
          height: shapeDef.defaultHeight,
          stroke,
          fill,
          scale: el.scale,
          opacity,
        } as Parameters<typeof renderShape>[0]),
      );

      // Label
      if (tierConfig.showLabel && el.scale > 0.2) {
        const fontSize = Math.max(5, 7 * el.scale);
        const labelText = el.name.length > 14 ? el.name.substring(0, 13) + '…' : el.name;
        elGroup.push(React.createElement('text', {
          key: `label-${el.id}`,
          x: el.sx + w / 2,
          y: el.sy + h / 2 + fontSize * 0.35,
          textAnchor: 'middle',
          fontSize,
          fill: theme === 'dark' ? '#e0e0e0' : '#222',
          opacity,
          pointerEvents: 'none',
          style: { userSelect: 'none' },
        }, labelText));
      }

      // Badge
      if (tierConfig.showBadge && el.specialisation) {
        const spec = specialisationMap.get(el.specialisation);
        if (spec) {
          elGroup.push(
            React.createElement(React.Fragment, { key: `badge-${el.id}` },
              renderBadge({
                code: spec.code,
                x: el.sx + w,
                y: el.sy,
                scale: el.scale,
                theme,
              }),
            ),
          );
        }
      }

      const elHandlers = {
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation();
          dragRef.current = { type: 'element', lastX: e.clientX, lastY: e.clientY, elementId: el.id };
        },
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onElementClick(el.id); },
        onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); onElementDoubleClick(el.id); },
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onElementContextMenu?.(el.id, e.clientX, e.clientY);
        },
      };

      // Birds-eye dot
      if (!tierConfig.showLabel) {
        return React.createElement('circle', {
          key: el.id,
          cx: el.sx + w / 2,
          cy: el.sy + h / 2,
          r: Math.max(2, 4 * el.scale),
          fill: stroke,
          opacity,
          style: { cursor: 'pointer' },
          ...elHandlers,
        });
      }

      return React.createElement('g', {
        key: el.id,
        style: { cursor: 'move' },
        ...elHandlers,
      }, ...elGroup);
    }),
  );
}
