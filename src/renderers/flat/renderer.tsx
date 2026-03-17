import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import type { PositionedElement, PositionedEdge } from '../types';
import { getZoomTierConfig } from '../spatial/zoom-tiers';
import { renderShape } from '../../notation/shapes/index';
import { renderBadge } from '../../notation/badges';
import { getShapeDefinition } from '../../shared/registry';
import { getLayerStroke, getLayerFill, getLayerColours, HIGHLIGHT_COLOURS } from '../../shared/colors';
import { getEdgeStyle, renderMarkerDefs } from '../../shared/edge-styles';
import { computeOrthogonalRoutes } from '../../layout/edge-routing';
import type { ThemeMode } from '../../theme/tokens';

interface LayerBand {
  layerKey: string;
  label: string;
  colorKey: string;
  y: number;
  height: number;
}

interface FlatRendererProps {
  elements: PositionedElement[];
  edges: PositionedEdge[];
  layerBands: LayerBand[];
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  selectedId: string | null;
  onElementClick: (id: string) => void;
  onElementDoubleClick: (id: string) => void;
  onBackgroundClick: () => void;
  onElementContextMenu?: (id: string, x: number, y: number) => void;
  onBackgroundContextMenu?: (x: number, y: number) => void;
  highlightLayer?: string | null;
  theme: ThemeMode;
  specialisationMap: Map<string, { code: string }>;
}

export function FlatRenderer({
  elements,
  edges,
  layerBands,
  highlightedNodes,
  highlightedEdges,
  selectedId,
  onElementClick,
  onElementDoubleClick,
  onBackgroundClick,
  onElementContextMenu,
  onBackgroundContextMenu,
  highlightLayer,
  theme,
  specialisationMap,
}: FlatRendererProps): React.ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.65);
  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);

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

  const tierConfig = getZoomTierConfig(zoom);
  const hasHighlight = highlightedNodes.size > 0;
  const highlightColour = HIGHLIGHT_COLOURS[theme].highlight;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { lastX: e.clientX, lastY: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.93 : 1.07;
    setZoom(z => Math.max(0.15, Math.min(10, z * factor)));
  }, []);

  // Register wheel handler natively with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const viewBox = useMemo(() => {
    const w = size.width / zoom;
    const h = size.height / zoom;
    const x = -pan.x / zoom;
    const y = -pan.y / zoom;
    return `${x} ${y} ${w} ${h}`;
  }, [size, zoom, pan]);

  return React.createElement('svg', {
    ref: svgRef,
    width: '100%',
    height: '100%',
    viewBox,
    style: { cursor: dragRef.current ? 'grabbing' : 'grab', userSelect: 'none' },
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onClick: (e: React.MouseEvent) => {
      if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).classList.contains('bg-rect')) {
        onBackgroundClick();
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).classList.contains('bg-rect')) {
        onBackgroundContextMenu?.(e.clientX, e.clientY);
      }
    },
  },
    React.createElement('defs', {
      dangerouslySetInnerHTML: { __html: renderMarkerDefs() },
    }),

    React.createElement('rect', {
      className: 'bg-rect',
      x: -5000, y: -5000,
      width: 10000, height: 10000,
      fill: 'transparent',
    }),

    // Layer bands
    ...layerBands.map((band) => {
      const colours = getLayerColours(band.colorKey, theme);
      const isDropTarget = highlightLayer === band.layerKey;
      return React.createElement('g', { key: `band-${band.layerKey}` },
        React.createElement('rect', {
          x: -20,
          y: band.y - 10,
          width: 1200,
          height: band.height + 20,
          fill: colours.planeFill,
          stroke: colours.stroke,
          strokeWidth: 0.5,
          strokeOpacity: 0.3,
          rx: 4,
        }),
        isDropTarget ? React.createElement('rect', {
          x: -20,
          y: band.y - 10,
          width: 1200,
          height: band.height + 20,
          fill: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)',
          stroke: colours.stroke,
          strokeWidth: 2,
          strokeOpacity: 0.8,
          rx: 4,
          pointerEvents: 'none',
        }) : null,
        React.createElement('text', {
          x: -10,
          y: band.y + 6,
          fontSize: 10,
          fill: colours.stroke,
          textAnchor: 'end',
          opacity: 0.6,
        }, band.label),
      );
    }),

    // Compute orthogonal routes for all edges
    ...(() => {
      const flatElements = elements.map(el => ({
        id: el.id, sx: el.wx, sy: el.wy,
        width: el.width, height: el.height, scale: 1,
      }));
      const edgeRoutes = computeOrthogonalRoutes(edges, flatElements);
      return edges.map((edge) => {
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
      });
    })(),

    // Elements
    ...elements.map((el) => {
      const shapeDef = getShapeDefinition(el.archimateType);
      const isSelected = selectedId === el.id;
      const isHighlighted = hasHighlight && highlightedNodes.has(el.id);
      const isDimmed = hasHighlight && !isHighlighted;
      const opacity = isDimmed ? 0.09 : 1;
      const stroke = isSelected || isHighlighted ? highlightColour : getLayerStroke(el.layer, theme);
      const fill = getLayerFill(el.layer, theme);

      const elGroup: React.ReactElement[] = [];

      if (isSelected || isHighlighted) {
        elGroup.push(React.createElement('rect', {
          key: `glow-${el.id}`,
          x: el.wx - 2, y: el.wy - 2,
          width: el.width + 4, height: el.height + 4,
          rx: 3, fill: 'none', stroke: highlightColour,
          strokeWidth: 2, opacity: 0.4,
        }));
      }

      elGroup.push(
        renderShape({
          key: `shape-${el.id}`,
          shapeType: shapeDef.shapeType,
          iconType: shapeDef.iconType,
          x: el.wx, y: el.wy,
          width: shapeDef.defaultWidth,
          height: shapeDef.defaultHeight,
          stroke, fill, scale: 1, opacity,
        } as Parameters<typeof renderShape>[0]),
      );

      if (tierConfig.showLabel) {
        const labelText = el.name.length > 16 ? el.name.substring(0, 15) + '…' : el.name;
        elGroup.push(React.createElement('text', {
          key: `label-${el.id}`,
          x: el.wx + el.width / 2,
          y: el.wy + el.height / 2 + 3,
          textAnchor: 'middle', fontSize: 7,
          fill: theme === 'dark' ? '#e0e0e0' : '#222',
          opacity, pointerEvents: 'none',
        }, labelText));
      }

      if (tierConfig.showBadge && el.specialisation) {
        const spec = specialisationMap.get(el.specialisation);
        if (spec) {
          elGroup.push(
            React.createElement(React.Fragment, { key: `badge-${el.id}` },
              renderBadge({
                code: spec.code,
                x: el.wx + el.width,
                y: el.wy,
                scale: 1,
                theme,
              }),
            ),
          );
        }
      }

      return React.createElement('g', {
        key: el.id,
        style: { cursor: 'pointer' },
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); onElementClick(el.id); },
        onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); onElementDoubleClick(el.id); },
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          onElementContextMenu?.(el.id, e.clientX, e.clientY);
        },
      }, ...elGroup);
    }),
  );
}
