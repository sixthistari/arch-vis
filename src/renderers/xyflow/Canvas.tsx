/**
 * xyflow Canvas — primary interactive diagramming canvas.
 *
 * Wraps ReactFlow with ArchiMate custom nodes/edges, minimap, and controls.
 * Computes grid layout when saved positions are all zero.
 */
import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type OnSelectionChangeParams,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  useReactFlow,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { MarkerDefs } from './MarkerDefs';
import { UmlMarkerDefs } from './edges/uml/UmlMarkerDefs';
import type { ArchimateNodeData } from './nodes';
import type { LayerBandNodeData } from './nodes/LayerBandNode';
import type { ArchimateEdgeData, LineType } from './edges/ArchimateEdge';
import type { Element, Relationship, ViewElement, SublayerConfig, ValidRelationship } from '../../model/types';
import { getLayerColours } from '../../notation/colors';
import { getShapeDefinition } from '../../notation/registry';
import { computeOrthogonalRoutes, type RouteEdge, type RouteElement, type RoutedEdge, type PortSide } from '../../layout/edge-routing';
import { assignPorts } from '../../layout/connection-points';
import { WaypointUpdateContext } from './context';
import { getNotation, getNodeType, getEdgeType } from '../../model/notation';
import { useLayerVisibilityStore } from '../../store/layer-visibility';
import { useDataOverlayStore } from '../../store/data-overlay';
import React from 'react';

// ═══════════════════════════════════════
// Layer ordering for auto-layout
// ═══════════════════════════════════════

// Fallback layer order when sublayerConfig is not available
const FALLBACK_LAYER_ORDER: Record<string, number> = {
  motivation: 0,
  strategy: 1,
  business: 2,
  business_upper: 2,
  business_lower: 3,
  application: 4,
  data: 5,
  technology: 6,
  implementation: 7,
};

// Fallback sublayer order (archimate_type → sort order within its layer)
const FALLBACK_SUBLAYER_ORDER: Record<string, number> = {
  'stakeholder': 0, 'driver': 10, 'assessment': 20, 'goal': 30, 'outcome': 40,
  'principle': 50, 'constraint': 50, 'requirement': 60, 'meaning': 35, 'value': 45,
  'value-stream': 0, 'course-of-action': 10, 'capability': 20, 'resource': 30,
  'business-actor': 0, 'business-role': 0, 'business-collaboration': 5,
  'business-service': 10, 'business-interface': 15,
  'business-process': 20, 'business-function': 20, 'business-interaction': 20,
  'business-event': 25, 'business-object': 30, 'contract': 30, 'representation': 30, 'product': 35,
  'application-service': 0, 'application-interface': 5,
  'application-process': 10, 'application-function': 10, 'application-interaction': 10,
  'application-event': 15, 'application-component': 20, 'application-collaboration': 20,
  'data-object': 30,
  'technology-service': 0, 'technology-interface': 5,
  'technology-process': 10, 'technology-function': 10, 'technology-interaction': 10,
  'technology-event': 15, 'node': 20, 'device': 20, 'system-software': 25,
  'technology-collaboration': 20, 'communication-network': 30, 'path': 30, 'artifact': 35,
  'gap': 0, 'plateau': 10, 'implementation-event': 15, 'deliverable': 20, 'work-package': 30,
};

/** Derive layer and sublayer ordering from sublayer config YAML (loaded via API). */
function buildOrderMaps(config: SublayerConfig | null): {
  layerOrder: Record<string, number>;
  sublayerOrder: Record<string, number>;
  layerLabels: Record<string, string>;
} {
  if (!config) {
    return {
      layerOrder: FALLBACK_LAYER_ORDER,
      sublayerOrder: FALLBACK_SUBLAYER_ORDER,
      layerLabels: {
        motivation: 'Motivation', strategy: 'Strategy', business: 'Business',
        business_upper: 'Business — Functions & Processes', business_lower: 'Business — Services & Information',
        application: 'Application', technology: 'Technology',
        data: 'Data & Artifacts', implementation: 'Implementation & Migration',
      },
    };
  }

  const layerOrder: Record<string, number> = {};
  const sublayerOrder: Record<string, number> = {};
  const layerLabels: Record<string, string> = {};

  let layerIdx = 0;
  // Track the first config key for each base layer (e.g. business_upper → business)
  const baseLayerSeen = new Map<string, number>();
  for (const [layerKey, layerConfig] of Object.entries(config.layers)) {
    layerOrder[layerKey] = layerIdx;
    layerLabels[layerKey] = layerConfig.label;

    // Also map the base layer name (strip _upper, _lower suffixes) for elements
    // that use the base layer key in the database
    const baseName = layerKey.replace(/_(upper|lower)$/, '');
    if (!baseLayerSeen.has(baseName)) {
      baseLayerSeen.set(baseName, layerIdx);
      if (!(baseName in layerOrder)) {
        layerOrder[baseName] = layerIdx;
        layerLabels[baseName] = layerConfig.label.replace(/ — .*$/, '');
      }
    }

    layerIdx++;
    layerConfig.sublayers.forEach((sublayer, sublayerIdx) => {
      const order = sublayerIdx * 10;
      for (const type of sublayer.element_types) {
        // Don't overwrite if already assigned (type appears in multiple sublayers)
        if (!(type in sublayerOrder)) sublayerOrder[type] = order;
      }
    });
  }

  return { layerOrder, sublayerOrder, layerLabels };
}

/**
 * Compute grid layout positions for elements without saved positions.
 * Returns absolute positions (not relative to layer bands).
 */
function computeGridLayout(
  elements: Element[],
  layerOrder: Record<string, number>,
  sublayerOrder: Record<string, number>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group by layer
  const byLayer = new Map<string, Element[]>();
  for (const el of elements) {
    const group = byLayer.get(el.layer) ?? [];
    group.push(el);
    byLayer.set(el.layer, group);
  }

  // Sort layers by ArchiMate order
  const sortedLayers = [...byLayer.entries()].sort(
    ([a], [b]) => (layerOrder[a] ?? 99) - (layerOrder[b] ?? 99)
  );

  const COL_WIDTH = 210;       // wider for routing channels between elements
  const ROW_HEIGHT = 80;       // taller for horizontal routing channels
  const LAYER_HEADER = 30;
  const LAYER_GAP = 90;        // more space between layers for cross-layer routes
  const LEFT_PAD = 30;
  const MAX_COLS = 8;
  let currentY = 20;

  for (const [, layerElements] of sortedLayers) {
    // Group elements by sublayer order → each sublayer becomes a row
    const sublayerGroups = new Map<number, Element[]>();
    for (const el of layerElements) {
      const order = sublayerOrder[el.archimate_type] ?? 50;
      const group = sublayerGroups.get(order) ?? [];
      group.push(el);
      sublayerGroups.set(order, group);
    }

    // Sort sublayer groups by order value
    const sortedSublayers = [...sublayerGroups.entries()].sort(([a], [b]) => a - b);

    // Layer header space
    currentY += LAYER_HEADER;

    for (const [, sublayerElements] of sortedSublayers) {
      // Each sublayer row
      for (let i = 0; i < sublayerElements.length; i++) {
        const col = i % MAX_COLS;
        const row = Math.floor(i / MAX_COLS);
        positions.set(sublayerElements[i]!.id, {
          x: LEFT_PAD + col * COL_WIDTH,
          y: currentY + row * ROW_HEIGHT,
        });
      }
      const rows = Math.ceil(sublayerElements.length / MAX_COLS);
      currentY += rows * ROW_HEIGHT;
    }

    currentY += LAYER_GAP;
  }

  return positions;
}

/** Padding inside a layer band around the child elements. */
const BAND_PAD = { top: 30, bottom: 20, left: 15, right: 15 };
/** Vertical gap between adjacent layer bands. */
const BAND_GAP = 40;

interface LayerBandInfo {
  layer: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute layer band positions and sizes from element positions.
 * Bands are positioned so they don't overlap — each has exclusive vertical space.
 */
function computeLayerBands(
  elements: Element[],
  positions: Map<string, { x: number; y: number }>,
  layerLabels: Record<string, string>,
  layerOrder: Record<string, number>,
): LayerBandInfo[] {
  const byLayer = new Map<string, { minX: number; minY: number; maxY: number; maxX: number }>();

  const NODE_SCALE = 1.6; // must match ArchimateNode scale constant
  for (const el of elements) {
    const pos = positions.get(el.id);
    if (!pos) continue;
    const shapeDef = getShapeDefinition(el.archimate_type);
    const elW = Math.round(shapeDef.defaultWidth * NODE_SCALE);
    const elH = Math.round(shapeDef.defaultHeight * NODE_SCALE);
    const existing = byLayer.get(el.layer);
    if (existing) {
      existing.minX = Math.min(existing.minX, pos.x);
      existing.minY = Math.min(existing.minY, pos.y);
      existing.maxY = Math.max(existing.maxY, pos.y + elH);
      existing.maxX = Math.max(existing.maxX, pos.x + elW);
    } else {
      byLayer.set(el.layer, { minX: pos.x, minY: pos.y, maxY: pos.y + elH, maxX: pos.x + elW });
    }
  }

  if (byLayer.size === 0) return [];

  // Compute uniform width — all bands use the widest layer's width
  let globalWidth = 800;
  for (const bounds of byLayer.values()) {
    globalWidth = Math.max(globalWidth, bounds.maxX - bounds.minX + BAND_PAD.left + BAND_PAD.right + 30);
  }

  // Sort layers by ArchiMate order for vertical stacking
  const sorted = [...byLayer.entries()].sort(
    ([a], [b]) => (layerOrder[a] ?? 99) - (layerOrder[b] ?? 99),
  );

  // Stack bands vertically with gaps — non-overlapping
  const bands: LayerBandInfo[] = [];
  let nextY = 0;
  for (const [layer, bounds] of sorted) {
    const contentH = bounds.maxY - bounds.minY;
    const bandH = contentH + BAND_PAD.top + BAND_PAD.bottom;
    bands.push({
      layer,
      label: layerLabels[layer] ?? layer,
      x: 0,
      y: nextY,
      width: globalWidth,
      height: bandH,
    });
    nextY += bandH + BAND_GAP;
  }

  return bands;
}

/**
 * Live band resize: recomputes band node dimensions from child element positions.
 * Child positions are RELATIVE to the band, so we just scan children.
 * Does NOT move bands — only resizes them to fit their children.
 */
function recomputeBands(
  nodes: Node[],
  layerLabels: Record<string, string>,
  theme: 'dark' | 'light',
): Node[] {
  // Gather child bounds per band (positions are relative to band)
  const byBand = new Map<string, { maxX: number; maxY: number }>();

  for (const n of nodes) {
    if (n.type === 'layer-band' || !n.parentId) continue;
    const x = n.position.x;
    const y = n.position.y;
    const w = n.width ?? 130;
    const h = n.height ?? 50;
    const existing = byBand.get(n.parentId);
    if (existing) {
      existing.maxX = Math.max(existing.maxX, x + w);
      existing.maxY = Math.max(existing.maxY, y + h);
    } else {
      byBand.set(n.parentId, { maxX: x + w, maxY: y + h });
    }
  }

  // Compute uniform width across all bands
  let globalWidth = 800;
  for (const b of byBand.values()) {
    globalWidth = Math.max(globalWidth, b.maxX + BAND_PAD.left + BAND_PAD.right);
  }

  return nodes.map(n => {
    if (!n.id.startsWith('__band-')) return n;
    const layer = n.id.replace('__band-', '');
    const b = byBand.get(n.id);
    if (!b) return n;
    return {
      ...n,
      width: globalWidth,
      height: b.maxY + BAND_PAD.bottom,
      data: {
        ...n.data,
        bandHeight: b.maxY + BAND_PAD.bottom,
        bandWidth: globalWidth,
        label: layerLabels[layer] ?? layer,
        theme,
      },
    };
  });
}

// ═══════════════════════════════════════
// Data overlay colour maps
// ═══════════════════════════════════════

const STATUS_COLOURS: Record<string, string> = {
  active: '#22C55E', draft: '#94A3B8', superseded: '#F59E0B',
  deprecated: '#EF4444', retired: '#6B7280',
};

const MATURITY_COLOURS: Record<string, string> = {
  initial: '#EF4444', defined: '#F59E0B', managed: '#3B82F6', optimised: '#22C55E',
};

const DOMAIN_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#EAB308', '#6366F1', '#06B6D4'];

function domainColour(domainId: string): string {
  let hash = 0;
  for (let i = 0; i < domainId.length; i++) hash = ((hash << 5) - hash + domainId.charCodeAt(i)) | 0;
  return DOMAIN_PALETTE[Math.abs(hash) % DOMAIN_PALETTE.length]!;
}

interface OverlayConfig {
  colourByProperty: string | null;
  showStatusBadge: boolean;
  displayFieldKeys: string[];
}

// ═══════════════════════════════════════
// Data conversion: model → xyflow
// ═══════════════════════════════════════

function elementsToNodes(
  elements: Element[],
  viewElements: ViewElement[],
  theme: 'dark' | 'light' = 'dark',
  layerOrder: Record<string, number> = FALLBACK_LAYER_ORDER,
  sublayerOrder: Record<string, number> = FALLBACK_SUBLAYER_ORDER,
  layerLabels: Record<string, string> = {},
  onLabelChange?: (id: string, newLabel: string) => void,
  overlay?: OverlayConfig,
): Node[] {
  const posMap = new Map(viewElements.map(ve => [ve.element_id, ve]));

  // Find elements that need auto-layout (no saved position or at 0,0)
  const needsLayout = elements.filter(el => {
    const ve = posMap.get(el.id);
    return !ve || (ve.x === 0 && ve.y === 0);
  });

  // Compute grid positions for elements that need layout
  const gridPositions = needsLayout.length > 0
    ? computeGridLayout(needsLayout, layerOrder, sublayerOrder)
    : null;

  // Build all positions map (saved + grid) for layer band computation
  const allPositions = new Map<string, { x: number; y: number }>();

  const elementNodes: Node[] = elements.map((el) => {
    const ve = posMap.get(el.id);
    const shapeDef = getShapeDefinition(el.archimate_type);
    const hasSavedPosition = ve && (ve.x !== 0 || ve.y !== 0);
    const gridPos = hasSavedPosition ? null : gridPositions?.get(el.id);

    const pos = {
      x: hasSavedPosition ? ve.x : (gridPos?.x ?? 0),
      y: hasSavedPosition ? ve.y : (gridPos?.y ?? 0),
    };
    allPositions.set(el.id, pos);

    const nodeType = getNodeType(el.archimate_type);
    const notation = getNotation(el.archimate_type);

    // Build notation-appropriate data object
    let data: Record<string, unknown>;
    if (nodeType === 'uml-class') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        classType: el.archimate_type.replace('uml-', '') as string,
        attributes: (props.attributes as unknown[]) ?? [],
        methods: (props.methods as unknown[]) ?? [],
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-component') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        stereotype: (props.stereotype as string) ?? undefined,
        ports: (props.ports as unknown[]) ?? [],
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-state') {
      data = {
        label: el.name,
        theme,
        onLabelChange,
      };
    } else if (notation === 'wireframe') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      if (nodeType === 'wf-page') {
        data = { label: el.name, url: props.url, pageWidth: props.pageWidth, pageHeight: props.pageHeight, theme, onLabelChange };
      } else if (nodeType === 'wf-section') {
        data = { label: el.name, sectionType: props.sectionType ?? el.archimate_type.replace('wf-', ''), title: props.title, columns: props.columns, sectionWidth: props.sectionWidth, sectionHeight: props.sectionHeight, theme, onLabelChange };
      } else if (nodeType === 'wf-nav') {
        data = { label: el.name, items: props.items, orientation: props.orientation, theme, onLabelChange };
      } else if (nodeType === 'wf-table') {
        data = { label: el.name, columns: props.columns, rows: props.rows, theme, onLabelChange };
      } else if (nodeType === 'wf-form') {
        data = { label: el.name, fields: props.fields, theme, onLabelChange };
      } else if (nodeType === 'wf-list') {
        data = { label: el.name, items: props.items, listType: props.listType, theme, onLabelChange };
      } else if (nodeType === 'wf-control') {
        data = { label: el.name, controlType: props.controlType ?? el.archimate_type.replace('wf-', ''), variant: props.variant, placeholder: props.placeholder, value: props.value, theme, onLabelChange };
      } else {
        data = { label: el.name, theme, onLabelChange };
      }
    } else {
      // ArchiMate (default) — compute overlay data
      let colourOverride: { fill: string; stroke: string } | undefined;
      if (overlay?.colourByProperty === 'status') {
        const c = STATUS_COLOURS[el.status];
        if (c) colourOverride = { fill: c + '33', stroke: c };
      } else if (overlay?.colourByProperty === 'maturity') {
        const props = (el.properties ?? {}) as Record<string, unknown>;
        const maturity = (props.maturity as string) ?? undefined;
        if (maturity) {
          const c = MATURITY_COLOURS[maturity];
          if (c) colourOverride = { fill: c + '33', stroke: c };
        }
      } else if (overlay?.colourByProperty === 'domain' && el.domain_id) {
        const c = domainColour(el.domain_id);
        colourOverride = { fill: c + '33', stroke: c };
      }

      const statusBadge = overlay?.showStatusBadge ? el.status : undefined;

      const overlayDisplayFields = overlay?.displayFieldKeys && overlay.displayFieldKeys.length > 0
        ? overlay.displayFieldKeys.map(k => {
            if (k === 'status') return el.status;
            if (k === 'layer') return el.layer;
            if (k === 'domain_id') return el.domain_id ?? '';
            if (k === 'sublayer') return el.sublayer ?? '';
            return '';
          }).filter(Boolean)
        : undefined;

      data = {
        label: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation,
        layer: el.layer,
        theme,
        onLabelChange,
        colourOverride,
        statusBadge,
        displayFields: overlayDisplayFields,
      };
    }

    // Compute dimensions — notation-aware defaults
    let width: number;
    let height: number;
    if (notation === 'archimate') {
      width = ve?.width ?? Math.round(shapeDef.defaultWidth * 1.6);
      height = ve?.height ?? Math.round(shapeDef.defaultHeight * 1.6);
    } else if (nodeType === 'uml-class') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      const attrCount = Array.isArray(props.attributes) ? props.attributes.length : 0;
      const methCount = Array.isArray(props.methods) ? props.methods.length : 0;
      width = ve?.width ?? 180;
      height = ve?.height ?? Math.max(80, 40 + (attrCount + methCount) * 18);
    } else if (notation === 'wireframe') {
      width = ve?.width ?? 200;
      height = ve?.height ?? 100;
    } else {
      width = ve?.width ?? 150;
      height = ve?.height ?? 60;
    }

    return {
      id: el.id,
      type: nodeType,
      position: pos,
      data,
      width,
      height,
    };
  });

  // Compute layer band group nodes
  const bands = computeLayerBands(elements, allPositions, layerLabels, layerOrder);

  // Build a lookup: layer → band info (position/size)
  const bandLookup = new Map<string, LayerBandInfo>();
  for (const band of bands) bandLookup.set(band.layer, band);

  // Also compute the original content minX/minY per layer so we can convert to relative
  const layerContentOrigin = new Map<string, { minX: number; minY: number }>();
  {
    for (const el of elements) {
      const pos = allPositions.get(el.id);
      if (!pos) continue;
      const existing = layerContentOrigin.get(el.layer);
      if (existing) {
        existing.minX = Math.min(existing.minX, pos.x);
        existing.minY = Math.min(existing.minY, pos.y);
      } else {
        layerContentOrigin.set(el.layer, { minX: pos.x, minY: pos.y });
      }
    }
  }

  const bandNodes: Node[] = bands.map((band) => ({
    id: `__band-${band.layer}`,
    type: 'layer-band' as const,
    position: { x: band.x, y: band.y },
    data: {
      layer: band.layer,
      label: band.label,
      bandWidth: band.width,
      bandHeight: band.height,
      theme,
    } as LayerBandNodeData,
    selectable: true,
    draggable: true,
    connectable: false,
    width: band.width,
    height: band.height,
    // Render behind element nodes
    zIndex: -1,
    style: { zIndex: -1 },
  }));

  // Convert element positions from absolute to band-relative and set parentId
  const nodeById = new Map(elementNodes.map(n => [n.id, n]));
  const elById = new Map(elements.map(e => [e.id, e]));

  for (const node of elementNodes) {
    const el = elById.get(node.id);
    if (!el) continue;

    // First handle wireframe parent-child nesting
    if (el.parent_id) {
      const parentNode = nodeById.get(el.parent_id);
      if (parentNode) {
        node.position = {
          x: Math.max(5, node.position.x - parentNode.position.x),
          y: Math.max(30, node.position.y - parentNode.position.y),
        };
        node.parentId = el.parent_id;
        node.extent = 'parent';
        continue; // wireframe children are parented to their element, not a band
      }
    }

    // Parent this element to its layer band
    const bandId = `__band-${el.layer}`;
    const band = bandLookup.get(el.layer);
    const origin = layerContentOrigin.get(el.layer);
    if (band && origin) {
      // Convert absolute position to band-relative
      node.position = {
        x: BAND_PAD.left + (node.position.x - origin.minX),
        y: BAND_PAD.top + (node.position.y - origin.minY),
      };
      node.parentId = bandId;
      node.extent = 'parent' as const;
    }
  }

  // Topological sort: xyflow requires parents before children in the array.
  // Band nodes come first (depth -1), then elements sorted by nesting depth.
  const depthCache = new Map<string, number>();
  function getDepth(id: string): number {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const el = elements.find(e => e.id === id);
    if (!el?.parent_id) { depthCache.set(id, 0); return 0; }
    const d = getDepth(el.parent_id) + 1;
    depthCache.set(id, d);
    return d;
  }
  const sortedElements = [...elementNodes].sort((a, b) => getDepth(a.id) - getDepth(b.id));

  return [...bandNodes, ...sortedElements];
}

/**
 * Determine direction between two nodes and pick the best side.
 * Returns the side ('t', 'b', 'l', 'r') for source and target.
 *
 * Logic:
 *   - If vertical distance < 40px (same row), use left/right handles.
 *   - If target is below with significant gap, use bottom→top.
 *   - If target is above, use top→bottom.
 */
function computeHandleSides(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
  srcW: number,
  tgtW: number,
  srcH: number,
  tgtH: number,
): { srcSide: string; tgtSide: string } {
  const srcCx = srcPos.x + srcW / 2;
  const srcCy = srcPos.y + srcH / 2;
  const tgtCx = tgtPos.x + tgtW / 2;
  const tgtCy = tgtPos.y + tgtH / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;
  const absDy = Math.abs(dy);

  // Same row — use left/right
  if (absDy < Math.max(srcH, tgtH)) {
    return dx > 0
      ? { srcSide: 'r', tgtSide: 'l' }
      : { srcSide: 'l', tgtSide: 'r' };
  }

  // Target below → bottom→top
  if (dy > 0) {
    return { srcSide: 'b', tgtSide: 't' };
  }

  // Target above → top→bottom
  return { srcSide: 't', tgtSide: 'b' };
}

// Handle IDs per side — 5 positions at 15%, 30%, 50%, 70%, 85%
const SIDE_HANDLES: Record<string, string[]> = {
  t: ['t0', 't1', 't2', 't3', 't4'],
  b: ['b0', 'b1', 'b2', 'b3', 'b4'],
  l: ['l0', 'l1', 'l2', 'l3', 'l4'],
  r: ['r0', 'r1', 'r2', 'r3', 'r4'],
};

/**
 * Convert relationships to xyflow edges with handle usage tracking.
 * Distributes edges across the 3 handles per side (25%, 50%, 75%)
 * to prevent lines from stacking on the same connection point.
 */
function relationshipsToEdges(
  relationships: Relationship[],
  nodePositions: Map<string, { x: number; y: number; w: number; h: number }>,
  theme: 'dark' | 'light' = 'dark',
): Edge<ArchimateEdgeData>[] {
  // Track how many edges are using each handle on each node
  // Key: "nodeId:handleSide" → next available slot index (0, 1, 2)
  const handleUsage = new Map<string, number>();

  // Step offsets per slot — varies the routing channel to prevent stacking
  const SLOT_OFFSETS = [20, 12, 28, 8, 36];

  function nextHandle(nodeId: string, side: string): { handleId: string; slotIndex: number } {
    const key = `${nodeId}:${side}`;
    const slotIndex = handleUsage.get(key) ?? 0;
    handleUsage.set(key, slotIndex + 1);
    const handles = SIDE_HANDLES[side] ?? ['t1'];
    // Distribute: middle first, then spread outward
    const order = [2, 1, 3, 0, 4];
    const pick = order[slotIndex % 5]!;
    return { handleId: handles[pick]!, slotIndex };
  }

  return relationships.map((rel) => {
    const srcPos = nodePositions.get(rel.source_id);
    const tgtPos = nodePositions.get(rel.target_id);

    let sourceHandle: string | undefined;
    let targetHandle: string | undefined;

    let stepOffset = 20;

    if (srcPos && tgtPos) {
      const { srcSide, tgtSide } = computeHandleSides(srcPos, tgtPos, srcPos.w, tgtPos.w, srcPos.h, tgtPos.h);
      const srcResult = nextHandle(rel.source_id, srcSide);
      sourceHandle = srcResult.handleId;
      const tgtResult = nextHandle(rel.target_id, tgtSide);
      targetHandle = `${tgtResult.handleId}-t`;
      // Vary the step offset per slot to prevent horizontal/vertical line stacking
      stepOffset = SLOT_OFFSETS[srcResult.slotIndex % SLOT_OFFSETS.length]!;
    }

    const edgeType = getEdgeType(rel.archimate_type);

    return {
      id: rel.id,
      type: edgeType,
      source: rel.source_id,
      target: rel.target_id,
      sourceHandle,
      targetHandle,
      reconnectable: true,
      data: {
        relationshipType: rel.archimate_type,
        label: rel.label ?? undefined,
        specialisation: rel.specialisation,
        stepOffset,
        theme,
        ...(edgeType === 'uml-edge' ? { edgeType: rel.archimate_type } : {}),
      },
    };
  });
}

// ═══════════════════════════════════════
// Canvas component — fully controlled mode
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// Relationship type picker
// ═══════════════════════════════════════

const ARCHIMATE_REL_TYPES = [
  { value: 'association',    label: 'Association' },
  { value: 'serving',        label: 'Serving' },
  { value: 'assignment',     label: 'Assignment' },
  { value: 'realisation',    label: 'Realisation' },
  { value: 'composition',    label: 'Composition' },
  { value: 'aggregation',    label: 'Aggregation' },
  { value: 'influence',      label: 'Influence' },
  { value: 'triggering',     label: 'Triggering' },
  { value: 'flow',           label: 'Flow' },
  { value: 'access',         label: 'Access' },
  { value: 'specialisation', label: 'Specialisation' },
];

const UML_REL_TYPES = [
  { value: 'uml-inheritance',   label: 'Inheritance' },
  { value: 'uml-realisation',   label: 'Realisation' },
  { value: 'uml-composition',   label: 'Composition' },
  { value: 'uml-aggregation',   label: 'Aggregation' },
  { value: 'uml-association',   label: 'Association' },
  { value: 'uml-dependency',    label: 'Dependency' },
];

const WF_REL_TYPES = [
  { value: 'wf-contains',      label: 'Contains' },
  { value: 'wf-navigates-to',  label: 'Navigates To' },
  { value: 'wf-binds-to',      label: 'Binds To' },
];

interface PendingConnection {
  sourceId: string;
  targetId: string;
  x: number;
  y: number;
}

function RelationshipTypePicker({
  conn, onSelect, onCancel, theme, sourceType, targetType, validRelationships, sourceNotation,
}: {
  conn: PendingConnection;
  onSelect: (type: string) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  sourceType: string;
  targetType: string;
  validRelationships: ValidRelationship[];
  sourceNotation?: 'archimate' | 'uml' | 'wireframe';
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const invalidColour = isDark ? '#4B5563' : '#CBD5E1';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';

  // Select relationship type list based on source notation
  const relTypes = sourceNotation === 'uml' ? UML_REL_TYPES
    : sourceNotation === 'wireframe' ? WF_REL_TYPES
    : ARCHIMATE_REL_TYPES;

  // Build a set of valid relationship types for this source→target pair
  const validSet = React.useMemo(() => {
    const set = new Set<string>();
    // Association is universally valid
    set.add('association');
    // Specialisation is valid between same-type elements
    if (sourceType === targetType) {
      set.add('specialisation');
    }
    // Check the valid_relationships table
    for (const vr of validRelationships) {
      if (vr.source_archimate_type === sourceType && vr.target_archimate_type === targetType) {
        set.add(vr.relationship_type);
      }
    }
    return set;
  }, [sourceType, targetType, validRelationships]);

  // Sort: valid types first, then invalid
  const sortedTypes = React.useMemo(() => {
    const valid = relTypes.filter(rt => validSet.has(rt.value));
    const invalid = relTypes.filter(rt => !validSet.has(rt.value));
    return { valid, invalid };
  }, [validSet, relTypes]);

  // Keep picker inside the canvas bounds
  const pickerW = 200;
  const clampedX = Math.min(conn.x, window.innerWidth - pickerW - 20);

  return (
    <div
      style={{
        position: 'absolute',
        left: clampedX,
        top: conn.y,
        zIndex: 2000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: '4px 0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        minWidth: pickerW,
        fontFamily: 'Inter, system-ui, sans-serif',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ padding: '4px 12px 6px', fontSize: 10, color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Relationship type
      </div>
      {sortedTypes.valid.map(rt => (
        <div
          key={rt.value}
          onClick={() => onSelect(rt.value)}
          style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: textColour }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {rt.label}
        </div>
      ))}
      {sortedTypes.invalid.length > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${border}`, margin: '4px 0' }} />
          <div style={{ padding: '2px 12px 4px', fontSize: 9, color: isDark ? '#4B5563' : '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Not valid for this pair
          </div>
          {sortedTypes.invalid.map(rt => (
            <div
              key={rt.value}
              onClick={() => onSelect(rt.value)}
              title="Not valid per ArchiMate 3.2 metamodel for this element pair"
              style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: invalidColour, opacity: 0.6 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
            >
              {rt.label}
            </div>
          ))}
        </>
      )}
      <div style={{ borderTop: `1px solid ${border}`, margin: '4px 0' }} />
      <div
        onClick={onCancel}
        style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: '#EF4444' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        Cancel
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Alignment toolbar
// ═══════════════════════════════════════

type AlignAction = 'left' | 'centre-h' | 'right' | 'top' | 'centre-v' | 'bottom' | 'dist-h' | 'dist-v';

const ALIGN_BTNS: { label: string; title: string; action: AlignAction; sep?: true }[] = [
  { label: '⊢',  title: 'Align left edges',       action: 'left'     },
  { label: '↔',  title: 'Centre horizontally',     action: 'centre-h' },
  { label: '⊣',  title: 'Align right edges',       action: 'right',   sep: true },
  { label: '⊤',  title: 'Align top edges',         action: 'top'      },
  { label: '↕',  title: 'Centre vertically',       action: 'centre-v' },
  { label: '⊥',  title: 'Align bottom edges',      action: 'bottom',  sep: true },
  { label: '⇔',  title: 'Distribute horizontally', action: 'dist-h'   },
  { label: '⇕',  title: 'Distribute vertically',   action: 'dist-v'   },
];

function AlignmentToolbar({
  count, onAlign, theme,
}: {
  count: number;
  onAlign: (action: AlignAction) => void;
  theme: 'dark' | 'light';
}) {
  if (count < 2) return null;
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const text = isDark ? '#E5E7EB' : '#1F2937';
  const hover = isDark ? '#334155' : '#E2E8F0';

  return (
    <div
      style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, background: bg, border: `1px solid ${border}`, borderRadius: 6,
        padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', userSelect: 'none',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {ALIGN_BTNS.map(btn => (
        <React.Fragment key={btn.action}>
          <button
            title={btn.title}
            onClick={() => onAlign(btn.action)}
            style={{
              background: 'transparent', border: 'none', color: text,
              cursor: 'pointer', padding: '3px 7px', fontSize: 14,
              borderRadius: 3, lineHeight: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {btn.label}
          </button>
          {btn.sep && (
            <div style={{ width: 1, height: 16, background: border, margin: '0 3px', flexShrink: 0 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- Alignment snapline overlay (rendered inside ReactFlow) ---------- */

function SnaplineOverlay({ lines }: { lines: { x?: number; y?: number }[] }) {
  const { x: vx, y: vy, zoom } = useViewport();
  if (lines.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {lines.map((line, i) => {
        if (line.x !== undefined) {
          const sx = line.x * zoom + vx;
          return (
            <line
              key={`snap-x-${i}`}
              x1={sx}
              y1={0}
              x2={sx}
              y2="100%"
              stroke="#F97316"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        }
        if (line.y !== undefined) {
          const sy = line.y * zoom + vy;
          return (
            <line
              key={`snap-y-${i}`}
              x1={0}
              y1={sy}
              x2="100%"
              y2={sy}
              stroke="#F97316"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

interface XYFlowCanvasProps {
  elements: Element[];
  relationships: Relationship[];
  viewElements: ViewElement[];
  viewId?: string;
  theme?: 'dark' | 'light';
  sublayerConfig?: SublayerConfig | null;
  onNodeClick?: (elementId: string) => void;
  onPositionChange?: (positions: { element_id: string; x: number; y: number }[]) => void;
  onLabelChange?: (elementId: string, newLabel: string) => void;
  onElementsDelete?: (elementIds: string[]) => void;
  onRelationshipsDelete?: (relationshipIds: string[]) => void;
  onDropElement?: (archimateType: string, layer: string, x: number, y: number) => void;
  onDropTreeElement?: (elementId: string, x: number, y: number) => void;
  onCreateRelationship?: (sourceId: string, targetId: string, relType: string) => void;
  onClearSelection?: () => void;
  onNodeContextMenu?: (elementId: string, x: number, y: number) => void;
  validRelationships?: ValidRelationship[];
}

// ── Bridge: captures screenToFlowPosition inside the ReactFlow provider ───
function ScreenToFlowBridge({
  bridgeRef,
  fitViewRef,
}: {
  bridgeRef: React.MutableRefObject<((pos: { x: number; y: number }) => { x: number; y: number }) | null>;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  bridgeRef.current = screenToFlowPosition;
  fitViewRef.current = () => fitView({ padding: 0.15 });
  return null;
}

// ═══════════════════════════════════════
// Edge context menu component
// ═══════════════════════════════════════

interface EdgeContextMenuState {
  edgeId: string;
  x: number;
  y: number;
}

interface EdgeContextMenuProps {
  menu: EdgeContextMenuState;
  onSelect: (edgeId: string, action: 'straight' | 'bezier' | 'step' | 'delete') => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

function EdgeContextMenu({ menu, onSelect, onClose, theme }: EdgeContextMenuProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';

  const items: { label: string; action: 'straight' | 'bezier' | 'step' | 'delete' }[] = [
    { label: 'Orthogonal (default)', action: 'step' },
    { label: 'Straight', action: 'straight' },
    { label: 'Curved', action: 'bezier' },
    { label: 'Delete', action: 'delete' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: menu.y,
        left: menu.x,
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: '4px 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: 160,
      }}
      onMouseLeave={onClose}
    >
      {items.map((item) => (
        <div
          key={item.action}
          onClick={() => onSelect(menu.edgeId, item.action)}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: item.action === 'delete' ? '#EF4444' : textColour,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── Pure routing helper — module level so it is not recreated on every render ─

/** Detect which face of a node box a port coordinate sits on. */
function detectPortSide(
  px: number, py: number,
  b: { x: number; y: number; w: number; h: number },
): PortSide {
  const dl = Math.abs(px - b.x);
  const dr = Math.abs(px - (b.x + b.w));
  const dt = Math.abs(py - b.y);
  const db = Math.abs(py - (b.y + b.h));
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) return 'left';
  if (m === dr) return 'right';
  if (m === dt) return 'top';
  return 'bottom';
}

export function XYFlowCanvas({
  elements,
  relationships,
  viewElements,
  viewId,
  theme = 'dark',
  sublayerConfig,
  onNodeClick,
  onPositionChange,
  onLabelChange,
  onElementsDelete,
  onRelationshipsDelete,
  onDropElement,
  onDropTreeElement,
  onCreateRelationship,
  onClearSelection,
  onNodeContextMenu,
  validRelationships = [],
}: XYFlowCanvasProps) {
  // Derive layout order maps from sublayer config (or fallback to hardcoded)
  const { layerOrder, sublayerOrder, layerLabels } = React.useMemo(
    () => buildOrderMaps(sublayerConfig ?? null),
    [sublayerConfig],
  );

  // Local state for node positions (survives re-renders, resets on view switch)
  const nodesRef = React.useRef<Node[]>([]);
  const edgesRef = React.useRef<Edge[]>([]);
  const currentViewRef = React.useRef<string | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [, forceRender] = React.useState(0);

  // screenToFlowPosition + fitView captured from inside the ReactFlow provider via ScreenToFlowBridge
  const screenToFlowRef = React.useRef<((pos: { x: number; y: number }) => { x: number; y: number }) | null>(null);
  const fitViewRef = React.useRef<(() => void) | null>(null);

  // Mouse position in canvas-local coordinates (used to position relationship picker)
  const containerMouseRef = React.useRef({ x: 0, y: 0 });
  // Pending connection set by onConnect; position filled by containerMouseRef on mouseup
  const pendingConnRef = React.useRef<{ sourceId: string; targetId: string } | null>(null);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);

  // Layer visibility / lock controls
  const hiddenLayers = useLayerVisibilityStore(s => s.hiddenLayers);
  const lockedLayers = useLayerVisibilityStore(s => s.lockedLayers);
  const layerOpacityMap = useLayerVisibilityStore(s => s.layerOpacity);
  const showRelationships = useLayerVisibilityStore(s => s.showRelationships);

  // Data overlay controls
  const colourByProperty = useDataOverlayStore(s => s.colourByProperty);
  const showStatusBadge = useDataOverlayStore(s => s.showStatusBadge);
  const displayFieldKeys = useDataOverlayStore(s => s.displayFields);
  const overlayConfig: OverlayConfig = React.useMemo(() => ({
    colourByProperty,
    showStatusBadge,
    displayFieldKeys,
  }), [colourByProperty, showStatusBadge, displayFieldKeys]);

  // Edge context menu state
  const [edgeMenu, setEdgeMenu] = React.useState<EdgeContextMenuState | null>(null);

  // Selected node IDs for connected-edge highlighting
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<Set<string>>(new Set());

  // Alignment snaplines shown during node drag
  const [snaplines, setSnaplines] = React.useState<{ x?: number; y?: number }[]>([]);

  // Stable callback refs — avoid stale closures in keyboard useEffect
  const onPositionChangeRef = React.useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onClearSelectionRef = React.useRef(onClearSelection);
  onClearSelectionRef.current = onClearSelection;
  // Timer ref for debouncing nudge position saves
  const nudgeSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build position map with ABSOLUTE positions for edge handle computation.
  // Child nodes have positions relative to their parent — we resolve to absolute.
  function buildPositionMap(nodes: Node[]): Map<string, { x: number; y: number; w: number; h: number }> {
    const nodeMap = new Map<string, Node>();
    for (const n of nodes) nodeMap.set(n.id, n);

    function absolutePos(n: Node): { x: number; y: number } {
      if (!n.parentId) return { x: n.position.x, y: n.position.y };
      const parent = nodeMap.get(n.parentId);
      if (!parent) return { x: n.position.x, y: n.position.y };
      const pp = absolutePos(parent);
      return { x: pp.x + n.position.x, y: pp.y + n.position.y };
    }

    const map = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of nodes) {
      if (n.type !== 'layer-band') {
        const abs = absolutePos(n);
        map.set(n.id, { x: abs.x, y: abs.y, w: n.width ?? 130, h: n.height ?? 80 });
      }
    }
    return map;
  }

  // Detect view switch → recompute from scratch
  const viewChanged = currentViewRef.current !== viewId;
  if (viewChanged) {
    currentViewRef.current = viewId;
    nodesRef.current = elementsToNodes(elements, viewElements, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange, overlayConfig);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current), theme);
  }

  // Initial load — if ref is empty, compute
  if (nodesRef.current.length === 0 && elements.length > 0) {
    nodesRef.current = elementsToNodes(elements, viewElements, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange, overlayConfig);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current), theme);
  }

  // Position-preserving rebuild whenever elements change (rename, create, external delete).
  // Skips initial load (handled above) and skips when view just switched (handled by viewChanged block).
  React.useEffect(() => {
    if (nodesRef.current.length === 0) return; // initial load handles itself

    // Snapshot ABSOLUTE positions of elements (resolving parent-child nesting)
    const absPositions = buildPositionMap(nodesRef.current);
    // Merge dragged positions into viewElements so elementsToNodes respects them
    const liveVE = viewElements.map(ve => {
      const p = absPositions.get(ve.element_id);
      return p ? { ...ve, x: p.x, y: p.y } : ve;
    });

    nodesRef.current = elementsToNodes(elements, liveVE, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange, overlayConfig);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current), theme);
    forceRender(n => n + 1);
  }, [elements, overlayConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  // ── Memoised routing ───────────────────────────────────────────────────────
  // Re-runs only when node positions or edge topology change — NOT on selection
  // changes, theme changes, or other UI state updates.  This eliminates the
  // main source of choppiness: full A* re-routing on every forceRender call.
  const routedPaths = React.useMemo((): Map<string, RoutedEdge> => {
    const empty = new Map<string, RoutedEdge>();

    // Build element bounds map with ABSOLUTE positions (resolving parent-child nesting)
    const absMap = buildPositionMap(nodes);
    const elementBoundsMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const [id, pos] of absMap) {
      elementBoundsMap.set(id, pos);
    }
    if (elementBoundsMap.size === 0 || edges.length === 0) return empty;

    // Only route edges without manual waypoints
    const edgesForRouting = edges.filter(e => {
      const wp = e.data?.waypoints as unknown[];
      return !wp || wp.length === 0;
    });
    if (edgesForRouting.length === 0) return empty;

    const portAssignments = assignPorts(
      edgesForRouting.map(e => ({ id: e.id, sourceId: e.source, targetId: e.target })),
      elementBoundsMap,
    );

    const routeEdges: RouteEdge[] = edgesForRouting.reduce<RouteEdge[]>((acc, e) => {
      const ep = portAssignments.get(e.id);
      if (!ep) return acc;
      const srcB = elementBoundsMap.get(e.source);
      const tgtB = elementBoundsMap.get(e.target);
      acc.push({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        sx1: ep.sx1, sy1: ep.sy1,
        sx2: ep.sx2, sy2: ep.sy2,
        srcSide: srcB ? detectPortSide(ep.sx1, ep.sy1, srcB) : undefined,
        tgtSide: tgtB ? detectPortSide(ep.sx2, ep.sy2, tgtB) : undefined,
      });
      return acc;
    }, []);

    const routeElements: RouteElement[] = [...elementBoundsMap.entries()].map(([id, box]) => ({
      id, sx: box.x, sy: box.y, width: box.w, height: box.h, scale: 1,
    }));

    return computeOrthogonalRoutes(routeEdges, routeElements);
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps
  // ───────────────────────────────────────────────────────────────────────────

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    nodesRef.current = applyNodeChanges(changes, nodesRef.current);
    forceRender(n => n + 1);
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    edgesRef.current = applyEdgeChanges(changes, edgesRef.current);
    forceRender(n => n + 1);
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  /** Resolve a node's absolute position (handles parent-child nesting). */
  function resolveAbsolutePos(nodeId: string): { x: number; y: number } {
    const nodeMap = new Map<string, Node>();
    for (const n of nodesRef.current) nodeMap.set(n.id, n);

    function abs(n: Node): { x: number; y: number } {
      if (!n.parentId) return { x: n.position.x, y: n.position.y };
      const parent = nodeMap.get(n.parentId);
      if (!parent) return { x: n.position.x, y: n.position.y };
      const pp = abs(parent);
      return { x: pp.x + n.position.x, y: pp.y + n.position.y };
    }

    const node = nodeMap.get(nodeId);
    if (!node) return { x: 0, y: 0 };
    return abs(node);
  }

  const handleNodeDragStop: NodeMouseHandler = useCallback((_event, node) => {
    setSnaplines([]);

    if (node.type === 'layer-band') {
      // Layer band dragged — all children moved with it, save their absolute positions
      forceRender(n => n + 1);
      if (onPositionChange) {
        const children = nodesRef.current.filter(
          n => n.parentId === node.id && n.type !== 'layer-band',
        );
        const positions = children.map(n => {
          const abs = resolveAbsolutePos(n.id);
          return { element_id: n.id, x: abs.x, y: abs.y };
        });
        if (positions.length > 0) onPositionChange(positions);
      }
    } else {
      // Element node dragged — refit the parent band, save element position
      nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
      forceRender(n => n + 1);
      if (onPositionChange) {
        const abs = resolveAbsolutePos(node.id);
        onPositionChange([{ element_id: node.id, x: abs.x, y: abs.y }]);
      }
    }
  }, [onPositionChange, layerLabels, theme]);

  // Alignment snaplines during drag — show guides when near other nodes' edges/centres
  const handleNodeDrag: NodeMouseHandler = useCallback((_event, draggedNode) => {
    if (draggedNode.type === 'layer-band') return;
    const SNAP_THRESHOLD = 5;
    const lines: { x?: number; y?: number }[] = [];

    const dw = draggedNode.width ?? 130;
    const dh = draggedNode.height ?? 50;
    const dLeft = draggedNode.position.x;
    const dRight = dLeft + dw;
    const dCx = dLeft + dw / 2;
    const dTop = draggedNode.position.y;
    const dBottom = dTop + dh;
    const dCy = dTop + dh / 2;

    const seenX = new Set<number>();
    const seenY = new Set<number>();

    for (const n of nodesRef.current) {
      if (n.id === draggedNode.id || n.type === 'layer-band') continue;
      const nw = n.width ?? 130;
      const nh = n.height ?? 50;
      const nLeft = n.position.x;
      const nRight = nLeft + nw;
      const nCx = nLeft + nw / 2;
      const nTop = n.position.y;
      const nBottom = nTop + nh;
      const nCy = nTop + nh / 2;

      // Vertical guide lines (x-axis alignment)
      for (const nx of [nLeft, nRight, nCx]) {
        for (const dx of [dLeft, dRight, dCx]) {
          if (Math.abs(dx - nx) <= SNAP_THRESHOLD && !seenX.has(nx)) {
            seenX.add(nx);
            lines.push({ x: nx });
          }
        }
      }

      // Horizontal guide lines (y-axis alignment)
      for (const ny of [nTop, nBottom, nCy]) {
        for (const dy of [dTop, dBottom, dCy]) {
          if (Math.abs(dy - ny) <= SNAP_THRESHOLD && !seenY.has(ny)) {
            seenY.add(ny);
            lines.push({ y: ny });
          }
        }
      }
    }

    setSnaplines(lines);
  }, []);

  // Multi-select drag stop — save absolute positions
  const handleSelectionDragStop = useCallback((_event: React.MouseEvent, movedNodes: Node[]) => {
    nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
    forceRender(n => n + 1);
    if (onPositionChange) {
      const elementNodes = movedNodes.filter(n => n.type !== 'layer-band');
      // If a layer band was in the selection, also include its children
      const bandIds = new Set(movedNodes.filter(n => n.type === 'layer-band').map(n => n.id));
      if (bandIds.size > 0) {
        for (const n of nodesRef.current) {
          if (n.parentId && bandIds.has(n.parentId) && n.type !== 'layer-band') {
            if (!elementNodes.find(en => en.id === n.id)) elementNodes.push(n);
          }
        }
      }
      const positions = elementNodes.map(n => {
        const abs = resolveAbsolutePos(n.id);
        return { element_id: n.id, x: abs.x, y: abs.y };
      });
      if (positions.length > 0) onPositionChange(positions);
    }
  }, [onPositionChange, layerLabels, theme]);

  // Edge reconnection handler
  const handleReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    edgesRef.current = reconnectEdge(oldEdge, newConnection, edgesRef.current);
    forceRender(n => n + 1);
  }, []);

  // Delete selected nodes via keyboard
  const handleNodesDelete = useCallback((deletedNodes: Node[]) => {
    const ids = deletedNodes.map(n => n.id).filter(id => !id.startsWith('__band-'));
    if (ids.length > 0) onElementsDelete?.(ids);
  }, [onElementsDelete]);

  // Delete selected edges via keyboard
  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    const ids = deletedEdges.map(e => e.id);
    if (ids.length > 0) onRelationshipsDelete?.(ids);
  }, [onRelationshipsDelete]);

  // Edge right-click context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    if (node.type === 'layerBand') return;
    const data = node.data as ArchimateNodeData;
    if (onNodeContextMenu) {
      onNodeContextMenu(data.elementId as string, event.clientX, event.clientY);
    }
  }, [onNodeContextMenu]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    // Position relative to the canvas container, not the viewport
    const rect = containerRef.current?.getBoundingClientRect();
    setEdgeMenu({
      edgeId: edge.id,
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    });
  }, []);

  const handleEdgeMenuSelect = useCallback((edgeId: string, action: 'straight' | 'bezier' | 'step' | 'delete') => {
    if (action === 'delete') {
      edgesRef.current = edgesRef.current.filter(e => e.id !== edgeId);
    } else {
      edgesRef.current = edgesRef.current.map(e => {
        if (e.id !== edgeId) return e;
        return {
          ...e,
          data: {
            ...e.data,
            lineType: action as LineType,
          },
        };
      });
    }
    setEdgeMenu(null);
    forceRender(n => n + 1);
  }, []);

  const handleCloseEdgeMenu = useCallback(() => {
    setEdgeMenu(null);
  }, []);

  // Close edge menu on pane click
  const handlePaneClick = useCallback(() => {
    setEdgeMenu(null);
    setPendingConnection(null);
    pendingConnRef.current = null;
  }, []);

  // Track selected nodes for connected-edge highlighting
  const handleSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    setSelectedNodeIds(new Set(
      nodes.map(n => n.id).filter(id => !id.startsWith('__band-')),
    ));
  }, []);

  // Keyboard shortcuts: arrow nudge, Escape deselect, Ctrl+A select all
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't intercept when focus is inside a text input
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Escape — clear selection
      if (e.key === 'Escape') {
        // Deselect all xyflow nodes
        nodesRef.current = nodesRef.current.map(n =>
          n.selected ? { ...n, selected: false } : n,
        );
        edgesRef.current = edgesRef.current.map(e =>
          e.selected ? { ...e, selected: false } : e,
        );
        setSelectedNodeIds(new Set());
        forceRender(n => n + 1);
        onClearSelectionRef.current?.();
        return;
      }

      // Ctrl+A — select all element nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        nodesRef.current = nodesRef.current.map(n =>
          n.type !== 'layer-band' ? { ...n, selected: true } : n,
        );
        setSelectedNodeIds(new Set(
          nodesRef.current.filter(n => n.type !== 'layer-band').map(n => n.id),
        ));
        forceRender(n => n + 1);
        return;
      }

      // Arrow keys — nudge selected nodes
      const NUDGE = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft')  dx = -NUDGE;
      if (e.key === 'ArrowRight') dx =  NUDGE;
      if (e.key === 'ArrowUp')    dy = -NUDGE;
      if (e.key === 'ArrowDown')  dy =  NUDGE;
      if (dx === 0 && dy === 0) return;

      e.preventDefault();
      // Nudge selected nodes (including layer bands — children move with them)
      nodesRef.current = nodesRef.current.map(n => {
        if (!n.selected) return n;
        return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
      });
      nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
      forceRender(n => n + 1);

      // Collect absolute positions of all affected element nodes for save
      const movedIds = new Set<string>();
      for (const n of nodesRef.current) {
        if (!n.selected) continue;
        if (n.type === 'layer-band') {
          // Layer band selected — all its children moved
          for (const c of nodesRef.current) {
            if (c.parentId === n.id && c.type !== 'layer-band') movedIds.add(c.id);
          }
        } else {
          movedIds.add(n.id);
        }
      }
      const movedPositions = [...movedIds].map(id => {
        const abs = resolveAbsolutePos(id);
        return { element_id: id, x: abs.x, y: abs.y };
      });

      // Debounce the position save so rapid key repeats don't flood the API
      if (nudgeSaveTimerRef.current) clearTimeout(nudgeSaveTimerRef.current);
      nudgeSaveTimerRef.current = setTimeout(() => {
        if (movedPositions.length > 0) {
          onPositionChangeRef.current?.(movedPositions);
        }
      }, 300);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [layerLabels, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alignment — applies to all currently selected archimate nodes
  const handleAlign = useCallback((action: AlignAction) => {
    const selected = nodesRef.current.filter(n => n.selected && n.type !== 'layer-band');
    if (selected.length < 2) return;

    let updated: Node[];

    if (action === 'dist-h' || action === 'dist-v') {
      if (selected.length < 3) return;
      if (action === 'dist-h') {
        const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);
        const first = sorted[0]!.position.x;
        const last = sorted[sorted.length - 1]!.position.x + (sorted[sorted.length - 1]!.width ?? 130);
        const totalW = sorted.reduce((s, n) => s + (n.width ?? 130), 0);
        const gap = (last - first - totalW) / (sorted.length - 1);
        let curX = first;
        const xMap = new Map<string, number>();
        for (const n of sorted) {
          xMap.set(n.id, curX);
          curX += (n.width ?? 130) + gap;
        }
        updated = nodesRef.current.map(n =>
          xMap.has(n.id) ? { ...n, position: { x: xMap.get(n.id)!, y: n.position.y } } : n,
        );
      } else {
        const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);
        const first = sorted[0]!.position.y;
        const last = sorted[sorted.length - 1]!.position.y + (sorted[sorted.length - 1]!.height ?? 50);
        const totalH = sorted.reduce((s, n) => s + (n.height ?? 50), 0);
        const gap = (last - first - totalH) / (sorted.length - 1);
        let curY = first;
        const yMap = new Map<string, number>();
        for (const n of sorted) {
          yMap.set(n.id, curY);
          curY += (n.height ?? 50) + gap;
        }
        updated = nodesRef.current.map(n =>
          yMap.has(n.id) ? { ...n, position: { x: n.position.x, y: yMap.get(n.id)! } } : n,
        );
      }
    } else {
      const xs = selected.map(n => n.position.x);
      const ys = selected.map(n => n.position.y);
      const rights = selected.map(n => n.position.x + (n.width ?? 130));
      const bottoms = selected.map(n => n.position.y + (n.height ?? 50));
      const minX = Math.min(...xs);
      const maxRight = Math.max(...rights);
      const minY = Math.min(...ys);
      const maxBottom = Math.max(...bottoms);
      const avgCx = (minX + maxRight) / 2;
      const avgCy = (minY + maxBottom) / 2;

      updated = nodesRef.current.map(n => {
        if (!n.selected || n.type === 'layer-band') return n;
        const w = n.width ?? 130;
        const h = n.height ?? 50;
        let x = n.position.x;
        let y = n.position.y;
        if (action === 'left')     x = minX;
        if (action === 'right')    x = maxRight - w;
        if (action === 'centre-h') x = avgCx - w / 2;
        if (action === 'top')      y = minY;
        if (action === 'bottom')   y = maxBottom - h;
        if (action === 'centre-v') y = avgCy - h / 2;
        return { ...n, position: { x, y } };
      });
    }

    nodesRef.current = recomputeBands(updated, layerLabels, theme);
    forceRender(n => n + 1);

    // Persist all moved positions (as absolute coordinates)
    const moved = nodesRef.current
      .filter(n => n.selected && n.type !== 'layer-band')
      .map(n => {
        const abs = resolveAbsolutePos(n.id);
        return { element_id: n.id, x: abs.x, y: abs.y };
      });
    onPositionChangeRef.current?.(moved);
  }, [layerLabels, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // User draws a connection by dragging from a connector handle to a target element
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    // Skip self-connections
    if (connection.source === connection.target) return;
    // Store in ref; position will be filled when mouse button releases
    pendingConnRef.current = { sourceId: connection.source, targetId: connection.target };
  }, []);

  // onConnectEnd fires after onConnect (or on failed drop) — capture mouse position then show picker
  const handleConnectEnd = useCallback((_event: MouseEvent | TouchEvent) => {
    if (!pendingConnRef.current) return;
    setPendingConnection({
      ...pendingConnRef.current,
      x: containerMouseRef.current.x,
      y: containerMouseRef.current.y,
    });
    pendingConnRef.current = null;
  }, []);

  const handleRelTypeSelect = useCallback((relType: string) => {
    if (!pendingConnection) return;
    onCreateRelationship?.(pendingConnection.sourceId, pendingConnection.targetId, relType);
    setPendingConnection(null);
  }, [pendingConnection, onCreateRelationship]);

  const handleRelTypeCancel = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // Palette drag-to-create
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      // Check for model tree drag first
      const treeRaw = e.dataTransfer.getData('application/archvis-tree');
      if (treeRaw) {
        const treeData = JSON.parse(treeRaw) as { elementId: string; archimateType: string; layer: string };
        const pos = screenToFlowRef.current?.({ x: e.clientX, y: e.clientY });
        if (pos && onDropTreeElement) {
          onDropTreeElement(treeData.elementId, pos.x, pos.y);
        }
        return;
      }
      // Palette drag-to-create
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw) as { archimate_type: string; layer: string };
      const pos = screenToFlowRef.current?.({ x: e.clientX, y: e.clientY });
      if (pos && onDropElement) {
        onDropElement(data.archimate_type, data.layer, pos.x, pos.y);
      }
    } catch {
      // ignore malformed drop data
    }
  }, [onDropElement, onDropTreeElement]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Waypoint updater — called by edge components when user drags waypoint handles
  const updateWaypoints = useCallback((edgeId: string, waypoints: { x: number; y: number }[]) => {
    edgesRef.current = edgesRef.current.map(e => {
      if (e.id !== edgeId) return e;
      return { ...e, data: { ...e.data, waypoints } };
    });
    forceRender(n => n + 1);
  }, []);

  const isDark = theme === 'dark';
  const bgColour = isDark ? '#0F172A' : '#FFFFFF';
  const gridColour = isDark ? '#1E293B' : '#F1F5F9';

  // Don't render until we have data
  if (elements.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgColour, color: '#9CA3AF', fontSize: 12 }}>
        Loading elements…
      </div>
    );
  }

  // ── Apply memoised routes + connected-edge highlighting ──────────────────
  // routedPaths was computed by useMemo([nodes, edges]) — not re-run here.
  let displayEdges = routedPaths.size > 0
    ? edges.map(e => {
        const routed = routedPaths.get(e.id);
        if (!routed) return e;
        const hasUserWps = ((e.data?.waypoints as unknown[]) ?? []).length > 0;
        return {
          ...e,
          data: {
            ...e.data,
            customPath: routed.path,
            ...(!hasUserWps && { routedWaypoints: routed.pts.slice(1, -1) }),
          },
        };
      })
    : edges;

  // ── Connected-edge highlighting — mark edges attached to selected nodes ──
  if (selectedNodeIds.size > 0) {
    displayEdges = displayEdges.map(e => ({
      ...e,
      data: {
        ...e.data,
        highlighted: selectedNodeIds.has(e.source) || selectedNodeIds.has(e.target),
      },
    }));
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Layer visibility, lock, and opacity filtering ─────────────────────
  const hasLayerFilters = hiddenLayers.size > 0 || lockedLayers.size > 0
    || Object.keys(layerOpacityMap).length > 0;

  const displayNodes = hasLayerFilters
    ? nodes.map(n => {
        if (n.type === 'layer-band') {
          const bandLayer = n.id.replace('__band-', '');
          if (hiddenLayers.has(bandLayer)) return { ...n, hidden: true };
          return n;
        }
        const nodeLayer = (n.data as Record<string, unknown>)?.layer as string | undefined;
        if (!nodeLayer) return n;
        if (hiddenLayers.has(nodeLayer)) return { ...n, hidden: true };
        let result = n;
        if (lockedLayers.has(nodeLayer)) {
          result = { ...result, draggable: false, selectable: false };
        }
        const opacity = layerOpacityMap[nodeLayer];
        if (opacity !== undefined && opacity < 1) {
          result = { ...result, style: { ...result.style, opacity } };
        }
        return result;
      })
    : nodes;

  const filteredEdges = !showRelationships
    ? displayEdges.map(e => ({ ...e, hidden: true }))
    : hiddenLayers.size > 0
      ? displayEdges.map(e => {
          const srcNode = displayNodes.find(n => n.id === e.source);
          const tgtNode = displayNodes.find(n => n.id === e.target);
          if (srcNode?.hidden === true || tgtNode?.hidden === true) {
            return { ...e, hidden: true };
          }
          return e;
        })
      : displayEdges;
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: bgColour, position: 'relative' }}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        containerMouseRef.current = {
          x: e.clientX - (rect?.left ?? 0),
          y: e.clientY - (rect?.top ?? 0),
        };
      }}
    >
      <MarkerDefs />
      <UmlMarkerDefs />
      <WaypointUpdateContext.Provider value={updateWaypoints}>
      <ReactFlow
        nodes={displayNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleSelectionDragStop}
        onReconnect={handleReconnect}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        edgesReconnectable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        snapToGrid
        snapGrid={[10, 10]}
        minZoom={0.1}
        maxZoom={4}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={true}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{ type: 'archimate' }}
        proOptions={{ hideAttribution: true }}
        style={{ background: bgColour }}
      >
        <SnaplineOverlay lines={snaplines} />
        <ScreenToFlowBridge bridgeRef={screenToFlowRef} fitViewRef={fitViewRef} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={gridColour} />
        <Controls position="bottom-right">
          <button
            onClick={() => {
              // Force auto-layout: zero all saved positions so elementsToNodes uses grid layout
              const resetVE = viewElements.map(ve => ({ ...ve, x: 0, y: 0 }));
              nodesRef.current = elementsToNodes(elements, resetVE, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange, overlayConfig);
              edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current), theme);
              forceRender(n => n + 1);
              // Save the new absolute positions
              if (onPositionChange) {
                const posMap = buildPositionMap(nodesRef.current);
                const positions = [...posMap.entries()].map(([id, p]) => ({
                  element_id: id, x: p.x, y: p.y,
                }));
                if (positions.length > 0) onPositionChange(positions);
              }
              // Fit view after layout
              setTimeout(() => fitViewRef.current?.(), 50);
            }}
            title="Auto-layout: reset all positions to grid layout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#94A3B8' : '#475569',
              fontSize: 14,
            }}
          >
            ⊞
          </button>
        </Controls>
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as ArchimateNodeData;
            const colours = getLayerColours(data.layer, theme);
            return colours.stroke;
          }}
          maskColor={isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
          position="bottom-left"
        />
      </ReactFlow>
      {edgeMenu && (
        <EdgeContextMenu
          menu={edgeMenu}
          onSelect={handleEdgeMenuSelect}
          onClose={handleCloseEdgeMenu}
          theme={theme}
        />
      )}
      {pendingConnection && (() => {
        const srcEl = elements.find(e => e.id === pendingConnection.sourceId);
        const tgtEl = elements.find(e => e.id === pendingConnection.targetId);
        return (
          <RelationshipTypePicker
            conn={pendingConnection}
            onSelect={handleRelTypeSelect}
            onCancel={handleRelTypeCancel}
            theme={theme}
            sourceType={srcEl?.archimate_type ?? ''}
            targetType={tgtEl?.archimate_type ?? ''}
            validRelationships={validRelationships}
            sourceNotation={srcEl ? getNotation(srcEl.archimate_type) : undefined}
          />
        );
      })()}
      <AlignmentToolbar
        count={selectedNodeIds.size}
        onAlign={handleAlign}
        theme={theme}
      />
      </WaypointUpdateContext.Provider>
    </div>
  );
}
