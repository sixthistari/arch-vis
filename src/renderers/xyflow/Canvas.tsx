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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { MarkerDefs } from './MarkerDefs';
import { UmlMarkerDefs } from './edges/uml/UmlMarkerDefs';
import type { ArchimateNodeData } from './nodes';
import type { LayerBandNodeData } from './nodes/LayerBandNode';
import type { ArchimateEdgeData, LineType } from './edges/ArchimateEdge';
import type { Element, Relationship, ViewElement, SublayerConfig } from '../../model/types';
import { getLayerColours } from '../../notation/colors';
import { getShapeDefinition } from '../../notation/registry';
import { computeOrthogonalRoutes, type RouteEdge, type RouteElement, type PortSide } from '../../layout/edge-routing';
import { assignPorts } from '../../layout/connection-points';
import { WaypointUpdateContext } from './context';
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
  for (const [layerKey, layerConfig] of Object.entries(config.layers)) {
    layerOrder[layerKey] = layerIdx++;
    layerLabels[layerKey] = layerConfig.label;
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

// Compute layer band boundaries for background rendering
function computeLayerBands(
  elements: Element[],
  positions: Map<string, { x: number; y: number }>,
  layerLabels: Record<string, string>,
): {
  layer: string;
  label: string;
  minY: number;
  maxY: number;
  maxX: number;
}[] {
  const byLayer = new Map<string, { minY: number; maxY: number; maxX: number }>();

  const NODE_SCALE = 1.6; // must match ArchimateNode scale constant
  for (const el of elements) {
    const pos = positions.get(el.id);
    if (!pos) continue;
    const shapeDef = getShapeDefinition(el.archimate_type);
    const elW = Math.round(shapeDef.defaultWidth * NODE_SCALE);
    const elH = Math.round(shapeDef.defaultHeight * NODE_SCALE);
    const existing = byLayer.get(el.layer);
    if (existing) {
      existing.minY = Math.min(existing.minY, pos.y);
      existing.maxY = Math.max(existing.maxY, pos.y + elH);
      existing.maxX = Math.max(existing.maxX, pos.x + elW);
    } else {
      byLayer.set(el.layer, { minY: pos.y, maxY: pos.y + elH, maxX: pos.x + elW });
    }
  }

  // Compute uniform width — all bands use the widest layer's width
  let globalMaxX = 0;
  for (const bounds of byLayer.values()) {
    globalMaxX = Math.max(globalMaxX, bounds.maxX + 30);
  }
  // Minimum band width
  globalMaxX = Math.max(globalMaxX, 800);

  return [...byLayer.entries()]
    .map(([layer, bounds]) => ({
      layer,
      label: layerLabels[layer] ?? layer,
      minY: bounds.minY - 25,
      maxY: bounds.maxY + 15,
      maxX: globalMaxX,
    }))
    .sort((a, b) => a.minY - b.minY);
}

// ── Live band resize: recomputes band node geometry from current node positions ──
// Called after every node drag so bands stay tight around their elements.
function recomputeBands(
  nodes: Node[],
  layerLabels: Record<string, string>,
  theme: 'dark' | 'light',
): Node[] {
  const byLayer = new Map<string, { minY: number; maxY: number; maxX: number }>();

  for (const n of nodes) {
    if (n.type !== 'archimate') continue;
    const layer = (n.data as { layer: string }).layer;
    const x = n.position.x;
    const y = n.position.y;
    const w = n.width ?? 130;
    const h = n.height ?? 50;
    const existing = byLayer.get(layer);
    if (existing) {
      existing.minY = Math.min(existing.minY, y);
      existing.maxY = Math.max(existing.maxY, y + h);
      existing.maxX = Math.max(existing.maxX, x + w);
    } else {
      byLayer.set(layer, { minY: y, maxY: y + h, maxX: x + w });
    }
  }

  let globalMaxX = 800;
  for (const b of byLayer.values()) {
    globalMaxX = Math.max(globalMaxX, b.maxX + 30);
  }

  return nodes.map(n => {
    if (!n.id.startsWith('__band-')) return n;
    const layer = n.id.replace('__band-', '');
    const b = byLayer.get(layer);
    if (!b) return n;
    const minY = b.minY - 25;
    const maxY = b.maxY + 15;
    return {
      ...n,
      position: { x: n.position.x, y: minY },
      data: {
        ...n.data,
        bandHeight: maxY - minY,
        bandWidth: globalMaxX + 20,
        label: layerLabels[layer] ?? layer,
        theme,
      },
    };
  });
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

    return {
      id: el.id,
      type: 'archimate' as const,
      position: pos,
      data: {
        label: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation,
        layer: el.layer,
        theme,
        onLabelChange,
      },
      // Use scaled dimensions to match ArchimateNode's rendered SVG size (scale=1.6)
      width: ve?.width ?? Math.round(shapeDef.defaultWidth * 1.6),
      height: ve?.height ?? Math.round(shapeDef.defaultHeight * 1.6),
    };
  });

  // Compute layer band background nodes
  const bands = computeLayerBands(elements, allPositions, layerLabels);
  const bandNodes: Node[] = bands.map((band) => ({
    id: `__band-${band.layer}`,
    type: 'layer-band' as const,
    position: { x: band.minY === Infinity ? 0 : -10, y: band.minY },
    data: {
      layer: band.layer,
      label: band.label,
      bandWidth: Math.max(band.maxX + 20, 800),
      bandHeight: band.maxY - band.minY,
      theme,
    } as LayerBandNodeData,
    selectable: false,
    draggable: false,
    connectable: false,
    // Render behind element nodes
    zIndex: -1,
    style: { zIndex: -1 },
  }));

  return [...bandNodes, ...elementNodes];
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
): { srcSide: string; tgtSide: string } {
  const srcCx = srcPos.x + srcW / 2;
  const srcCy = srcPos.y + 20;
  const tgtCx = tgtPos.x + tgtW / 2;
  const tgtCy = tgtPos.y + 20;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;
  const absDy = Math.abs(dy);

  // Same row — use left/right
  if (absDy < 40) {
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
  nodePositions: Map<string, { x: number; y: number; w: number }>,
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
      const { srcSide, tgtSide } = computeHandleSides(srcPos, tgtPos, srcPos.w, tgtPos.w);
      const srcResult = nextHandle(rel.source_id, srcSide);
      sourceHandle = srcResult.handleId;
      const tgtResult = nextHandle(rel.target_id, tgtSide);
      targetHandle = `${tgtResult.handleId}-t`;
      // Vary the step offset per slot to prevent horizontal/vertical line stacking
      stepOffset = SLOT_OFFSETS[srcResult.slotIndex % SLOT_OFFSETS.length]!;
    }

    return {
      id: rel.id,
      type: 'archimate' as const,
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

interface PendingConnection {
  sourceId: string;
  targetId: string;
  x: number;
  y: number;
}

function RelationshipTypePicker({
  conn, onSelect, onCancel, theme,
}: {
  conn: PendingConnection;
  onSelect: (type: string) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';

  // Keep picker inside the canvas bounds
  const pickerW = 160;
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
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ padding: '4px 12px 6px', fontSize: 10, color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Relationship type
      </div>
      {ARCHIMATE_REL_TYPES.map(rt => (
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
  onCreateRelationship?: (sourceId: string, targetId: string, relType: string) => void;
}

// ── Bridge: captures screenToFlowPosition inside the ReactFlow provider ───
function ScreenToFlowBridge({
  bridgeRef,
}: {
  bridgeRef: React.MutableRefObject<((pos: { x: number; y: number }) => { x: number; y: number }) | null>;
}) {
  const { screenToFlowPosition } = useReactFlow();
  bridgeRef.current = screenToFlowPosition;
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
  onCreateRelationship,
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

  // screenToFlowPosition captured from inside the ReactFlow provider via ScreenToFlowBridge
  const screenToFlowRef = React.useRef<((pos: { x: number; y: number }) => { x: number; y: number }) | null>(null);

  // Mouse position in canvas-local coordinates (used to position relationship picker)
  const containerMouseRef = React.useRef({ x: 0, y: 0 });
  // Pending connection set by onConnect; position filled by containerMouseRef on mouseup
  const pendingConnRef = React.useRef<{ sourceId: string; targetId: string } | null>(null);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);

  // Edge context menu state
  const [edgeMenu, setEdgeMenu] = React.useState<EdgeContextMenuState | null>(null);

  // Selected node IDs for connected-edge highlighting
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<Set<string>>(new Set());

  // Build position map from nodes for edge handle computation
  function buildPositionMap(nodes: Node[]): Map<string, { x: number; y: number; w: number }> {
    const map = new Map<string, { x: number; y: number; w: number }>();
    for (const n of nodes) {
      if (n.type !== 'layer-band') {
        map.set(n.id, { x: n.position.x, y: n.position.y, w: n.width ?? 130 });
      }
    }
    return map;
  }

  // Detect view switch → recompute from scratch
  const viewChanged = currentViewRef.current !== viewId;
  if (viewChanged) {
    currentViewRef.current = viewId;
    nodesRef.current = elementsToNodes(elements, viewElements, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current));
  }

  // Initial load — if ref is empty, compute
  if (nodesRef.current.length === 0 && elements.length > 0) {
    nodesRef.current = elementsToNodes(elements, viewElements, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current));
  }

  // Position-preserving rebuild whenever elements change (rename, create, external delete).
  // Skips initial load (handled above) and skips when view just switched (handled by viewChanged block).
  React.useEffect(() => {
    if (nodesRef.current.length === 0) return; // initial load handles itself

    // Snapshot positions that may have been dragged by the user
    const draggedPos = new Map<string, { x: number; y: number }>();
    for (const n of nodesRef.current) {
      if (n.type === 'archimate') draggedPos.set(n.id, n.position);
    }
    // Merge dragged positions into viewElements so elementsToNodes respects them
    const liveVE = viewElements.map(ve => {
      const p = draggedPos.get(ve.element_id);
      return p ? { ...ve, x: p.x, y: p.y } : ve;
    });

    nodesRef.current = elementsToNodes(elements, liveVE, theme, layerOrder, sublayerOrder, layerLabels, onLabelChange);
    edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current));
    forceRender(n => n + 1);
  }, [elements]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

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

  const handleNodeDragStop: NodeMouseHandler = useCallback((_event, node) => {
    // Refit layer bands around new element positions
    nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
    forceRender(n => n + 1);
    if (onPositionChange) {
      onPositionChange([{
        element_id: node.id,
        x: node.position.x,
        y: node.position.y,
      }]);
    }
  }, [onPositionChange, layerLabels, theme]);

  // Multi-select drag stop — same band refit + save all moved positions
  const handleSelectionDragStop = useCallback((_event: React.MouseEvent, movedNodes: Node[]) => {
    nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
    forceRender(n => n + 1);
    if (onPositionChange) {
      onPositionChange(
        movedNodes
          .filter(n => n.type === 'archimate')
          .map(n => ({ element_id: n.id, x: n.position.x, y: n.position.y })),
      );
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
  }, [onDropElement]);

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

  // ── Obstacle-aware edge routing ──────────────────────────────────────────

  // Detect which face of a node a port coordinate sits on
  function detectPortSide(px: number, py: number, b: { x: number; y: number; w: number; h: number }): PortSide {
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

  // Build element bounds map from current xyflow node state (includes dragged positions)
  const elementBoundsMap = new Map<string, { x: number; y: number; w: number; h: number }>();
  for (const n of nodes) {
    if (n.type === 'layer-band') continue;
    elementBoundsMap.set(n.id, { x: n.position.x, y: n.position.y, w: n.width ?? 130, h: n.height ?? 50 });
  }

  // Only compute routed paths for edges that don't have manual waypoints
  let displayEdges = edges;
  if (elementBoundsMap.size > 0 && edges.length > 0) {
    const edgesForRouting = edges.filter(e => {
      const wp = e.data?.waypoints as unknown[];
      return !wp || wp.length === 0;
    });

    if (edgesForRouting.length > 0) {
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

      const routedPaths = computeOrthogonalRoutes(routeEdges, routeElements);

      displayEdges = edges.map(e => {
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
      });
    }
  }
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
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onSelectionDragStop={handleSelectionDragStop}
        onReconnect={handleReconnect}
        onEdgeContextMenu={handleEdgeContextMenu}
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
        <ScreenToFlowBridge bridgeRef={screenToFlowRef} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={gridColour} />
        <Controls position="bottom-right" />
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
      {pendingConnection && (
        <RelationshipTypePicker
          conn={pendingConnection}
          onSelect={handleRelTypeSelect}
          onCancel={handleRelTypeCancel}
          theme={theme}
        />
      )}
      </WaypointUpdateContext.Provider>
    </div>
  );
}
