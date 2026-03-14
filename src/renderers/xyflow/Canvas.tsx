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
import { AllMarkerDefs } from './edges/AllMarkerDefs';
import type { ArchimateNodeData } from './nodes';
import type { LineType } from './edges';
import type { Element, Relationship, ViewElement, SublayerConfig, ValidRelationship } from '../../model/types';
import { getLayerColours } from '../../notation/colors';
import { computeOrthogonalRoutes, type RouteEdge, type RouteElement, type RoutedEdge } from '../../layout/edge-routing';
import { assignPorts } from '../../layout/connection-points';
import { WaypointUpdateContext } from './context';
import { getNotation } from '../../model/notation';
import { useLayerVisibilityStore } from '../../store/layer-visibility';
import { useDataOverlayStore } from '../../store/data-overlay';
import React from 'react';

import { buildOrderMaps } from './layout-computation';
import { recomputeBands } from './layer-bands';
import { elementsToNodes, type OverlayConfig } from './node-conversion';
import { relationshipsToEdges, detectPortSide } from './edge-routing-integration';
import { computeElkLayout } from '../../layout/elk';
import type { LayoutInput, SublayerEntry } from '../../layout/types';

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
  { value: 'uml-control-flow',  label: 'Control Flow' },
  { value: 'uml-object-flow',   label: 'Object Flow' },
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
  const heatmapProperty = useDataOverlayStore(s => s.heatmapProperty);
  const showStatusBadge = useDataOverlayStore(s => s.showStatusBadge);
  const displayFieldKeys = useDataOverlayStore(s => s.displayFields);
  const overlayConfig: OverlayConfig = React.useMemo(() => ({
    colourByProperty,
    heatmapProperty,
    showStatusBadge,
    displayFieldKeys,
  }), [colourByProperty, heatmapProperty, showStatusBadge, displayFieldKeys]);

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
    if (node.type === 'layer-band') return;
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
      <AllMarkerDefs />
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
          <button
            onClick={async () => {
              // ELK hierarchical auto-layout
              const posMap = buildPositionMap(nodesRef.current);
              const layoutInputs: LayoutInput[] = elements.map(el => {
                const p = posMap.get(el.id);
                return {
                  id: el.id,
                  archimateType: el.archimate_type,
                  layer: el.layer,
                  sublayer: el.sublayer ?? null,
                  width: p?.w ?? 150,
                  height: p?.h ?? 60,
                };
              });
              const rels = relationships.map(r => ({
                id: r.id,
                sourceId: r.source_id,
                targetId: r.target_id,
              }));
              // Build sublayer entries from sublayerConfig
              const sublayers: SublayerEntry[] = [];
              const cfg = sublayerConfig as { layers?: Record<string, { sublayers: Array<{ name: string; element_types: string[]; specialisations?: string[] }> }> } | null;
              if (cfg?.layers) {
                let layerIdx = 0;
                for (const [layerKey, layerDef] of Object.entries(cfg.layers)) {
                  layerDef.sublayers.forEach((sl, slIdx) => {
                    sublayers.push({
                      name: sl.name,
                      layerKey,
                      layerIndex: layerIdx,
                      sublayerIndex: slIdx,
                      elementTypes: sl.element_types,
                      specialisations: sl.specialisations,
                    });
                  });
                  layerIdx++;
                }
              }
              try {
                const result = await computeElkLayout(layoutInputs, rels, sublayers);
                // Apply positions from ELK to nodes
                const elkPosMap = new Map(result.map(r => [r.id, { x: r.wx, y: r.wy }]));
                nodesRef.current = nodesRef.current.map(n => {
                  const elkPos = elkPosMap.get(n.id);
                  if (elkPos) return { ...n, position: { x: elkPos.x, y: elkPos.y } };
                  return n;
                });
                nodesRef.current = recomputeBands(nodesRef.current, layerLabels, theme);
                edgesRef.current = relationshipsToEdges(relationships, buildPositionMap(nodesRef.current), theme);
                forceRender(n => n + 1);
                // Save positions
                if (onPositionChange) {
                  const positions = result.map(r => ({
                    element_id: r.id, x: r.wx, y: r.wy,
                  }));
                  if (positions.length > 0) onPositionChange(positions);
                }
                setTimeout(() => fitViewRef.current?.(), 50);
              } catch (err) {
                console.error('ELK layout failed:', err);
              }
            }}
            title="Arrange: ELK hierarchical auto-layout"
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
            ⊟
          </button>
        </Controls>
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as Record<string, unknown>;
            const layer = data.layer as string | undefined;
            if (!layer) return '#6B7280';
            try {
              const colours = getLayerColours(layer, theme);
              return colours.stroke;
            } catch {
              return '#6B7280';
            }
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
