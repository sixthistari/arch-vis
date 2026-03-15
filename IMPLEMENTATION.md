# arch-vis — Implementation

**Version:** 1.0 | March 2026

This document describes the React/TypeScript-specific implementation design of arch-vis. It is the third layer in the documentation hierarchy:

- **REQUIREMENTS.md** — what the system does
- **DESIGN.md** — logical architecture (model-view-renderer paradigm)
- **IMPLEMENTATION.md** (this document) — specific technology choices, code architecture, and runtime structure

---

## 1. Technology Stack

| Library | Version | Role |
|---------|---------|------|
| React | ^18.3.1 | UI framework (StrictMode enabled) |
| TypeScript | ^5.6.3 | Language (strict mode, `noUncheckedIndexedAccess`) |
| @xyflow/react | ^12.10.1 | Interactive canvas (ReactFlow v12) |
| Zustand | ^4.5.5 | Client-side state management |
| Zod | ^3.23.8 | Runtime schema validation (API responses) |
| Graphology | ^0.25.4 | In-memory directed multigraph (highlight traversal) |
| elkjs | ^0.9.3 | Hierarchical auto-layout (ELK algorithm) |
| dagre | ^0.8.5 | DAG layout (fallback) |
| better-sqlite3 | ^11.3.0 | Local SQLite persistence |
| Express | ^4.21.0 | REST API server |
| Vite | ^5.4.10 | Build tool + dev server |
| Vitest | ^2.1.4 | Unit test framework |
| d3 | ^7.9.0 | SVG rendering (spatial 3D experimental only) |
| html-to-image | ^1.11.13 | Canvas export (PNG/SVG) |
| concurrently | ^9.0.1 | Run client + server in parallel |
| tsx | ^4.19.1 | TypeScript execution for server |

### TypeScript Configuration

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "server", "shared"]
}
```

---

## 2. Project Structure

```
arch-vis/
├── src/
│   ├── main.tsx                           # ReactDOM.createRoot entry
│   ├── App.tsx                            # Top-level: ThemeProvider → ErrorBoundary → Shell
│   │
│   ├── store/                             # Zustand stores (§3)
│   │   ├── model.ts                       # Elements, relationships, domains, graph
│   │   ├── view.ts                        # View list, current view, view elements
│   │   ├── interaction.ts                 # Selection, highlights, context menu
│   │   ├── theme.ts                       # Dark/light mode
│   │   ├── panel.ts                       # Panel open/close state
│   │   ├── layer-visibility.ts            # Hidden/locked layers, opacity
│   │   └── data-overlay.ts               # Colour-by, heatmap, status badges
│   │
│   ├── interaction/
│   │   └── undo-redo.ts                   # Command-pattern undo/redo store
│   │
│   ├── ui/                                # Shell and panel components
│   │   ├── Shell.tsx                      # Main layout (toolbar, 3-column, status bar)
│   │   ├── Canvas.tsx                     # Store bridge → XYFlowCanvas or legacy spatial
│   │   ├── Palette.tsx                    # Notation-filtered drag-to-create palette
│   │   ├── ModelTree.tsx                  # Hierarchical element browser
│   │   ├── DetailPanel.tsx                # Element properties panel
│   │   ├── ViewSwitcher.tsx               # View list + create
│   │   ├── LayerControls.tsx              # Layer visibility/lock/opacity
│   │   ├── DataOverlayControls.tsx        # Colour-by, heatmap, status badges
│   │   ├── ExportMenu.tsx                 # PNG/SVG/JSON export
│   │   ├── ContextMenu.tsx                # Right-click node context menu
│   │   ├── ErrorBoundary.tsx              # React error boundary (class component)
│   │   ├── ThemeToggle.tsx                # Dark/light toggle button
│   │   ├── ZoomBar.tsx                    # Zoom level indicator
│   │   ├── SelectionBadge.tsx             # Selection count badge
│   │   └── legacy/                        # Spatial 3D renderer (experimental)
│   │
│   ├── renderers/xyflow/                  # Primary canvas implementation (§4–6)
│   │   ├── Canvas.tsx                     # XYFlowCanvas — 921 lines, main canvas
│   │   ├── context.ts                     # WaypointUpdateContext (React context)
│   │   ├── node-conversion.ts             # elementsToNodes() — model → xyflow nodes
│   │   ├── edge-routing-integration.ts    # relationshipsToEdges(), handle distribution
│   │   ├── layout-computation.ts          # buildOrderMaps(), computeGridLayout()
│   │   ├── layer-bands.ts                 # computeLayerBands(), recomputeBands()
│   │   ├── RelationshipTypePicker.tsx     # Popup for choosing relationship type
│   │   ├── AlignmentToolbar.tsx           # Multi-select alignment actions
│   │   ├── SnaplineOverlay.tsx            # Drag alignment guide lines
│   │   ├── EdgeContextMenu.tsx            # Right-click edge menu
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCanvasKeyboard.ts       # Arrow nudge, Escape, Ctrl+A
│   │   │   ├── useCanvasConnection.ts     # Connection creation flow
│   │   │   ├── useNodeBehaviour.ts        # Shared node interaction (edit, hover, connect)
│   │   │   ├── useEditableNode.ts         # Inline label editing state machine
│   │   │   └── EditableInput.tsx          # Reusable inline edit input
│   │   │
│   │   ├── nodes/
│   │   │   ├── index.ts                   # nodeTypes registry
│   │   │   ├── ArchimateNode.tsx          # ArchiMate notation node
│   │   │   ├── LayerBandNode.tsx          # Layer grouping band
│   │   │   ├── archimate-icons.tsx        # SVG icon glyphs per ArchiMate type
│   │   │   ├── shared/
│   │   │   │   └── RoutingHandles.tsx     # 5-per-side invisible connection handles
│   │   │   ├── uml/
│   │   │   │   ├── UmlClassNode.tsx       # Class/enum/interface
│   │   │   │   ├── UmlComponentNode.tsx   # Component with ports
│   │   │   │   ├── UmlUseCaseNode.tsx     # Actor/use-case
│   │   │   │   ├── UmlStateNode.tsx       # State machine nodes
│   │   │   │   ├── UmlActivityNode.tsx    # Activity diagram nodes
│   │   │   │   └── UmlSequenceNodes.tsx   # Lifeline/activation/fragment (legacy)
│   │   │   ├── sequence/
│   │   │   │   ├── SequenceLifelineNode.tsx
│   │   │   │   ├── SequenceActivationNode.tsx
│   │   │   │   └── SequenceFragmentNode.tsx
│   │   │   └── wireframe/
│   │   │       ├── WfPageNode.tsx
│   │   │       ├── WfSectionNode.tsx
│   │   │       ├── WfControlNode.tsx
│   │   │       ├── WfNavNode.tsx
│   │   │       ├── WfTableNode.tsx
│   │   │       ├── WfFormNode.tsx
│   │   │       ├── WfListNode.tsx
│   │   │       └── WfFeedbackNode.tsx
│   │   │
│   │   ├── edges/
│   │   │   ├── index.ts                   # edgeTypes registry
│   │   │   ├── UnifiedEdge.tsx            # Single edge component for all notations
│   │   │   └── AllMarkerDefs.tsx          # SVG marker definitions (arrows, diamonds)
│   │   │
│   │   └── __tests__/
│   │       ├── layout-computation.test.ts
│   │       └── edge-routing-integration.test.ts
│   │
│   ├── notation/                          # ArchiMate visual notation
│   │   ├── registry.ts                    # Shape registry (archimate_type → shape/size)
│   │   ├── edge-styles.ts                 # Unified edge style registry (all notations)
│   │   ├── colors.ts                      # Layer colour palettes (dark + light)
│   │   ├── badges.ts                      # Specialisation badge definitions
│   │   ├── edges.ts                       # Legacy edge definitions
│   │   ├── shapes/                        # SVG shape renderers
│   │   └── __tests__/
│   │
│   ├── model/                             # Data model and graph
│   │   ├── types.ts                       # Zod schemas + TypeScript types
│   │   ├── notation.ts                    # getNotation(), getNodeType(), getEdgeType()
│   │   ├── graph.ts                       # buildGraphFromData() (Graphology)
│   │   ├── archetypes.ts                  # AI/Knowledge specialisation archetypes
│   │   ├── specialisations.ts             # Specialisation definitions
│   │   └── __tests__/
│   │
│   ├── layout/                            # Layout algorithms
│   │   ├── elk.ts                         # ELK hierarchical layout
│   │   ├── dagre.ts                       # Dagre fallback layout
│   │   ├── flat.ts                        # Flat grid layout
│   │   ├── spatial.ts                     # Spatial 3D layout
│   │   ├── edge-routing.ts                # A* orthogonal edge routing
│   │   ├── connection-points.ts           # Port assignment algorithm
│   │   └── types.ts                       # Layout input/output types
│   │
│   ├── api/
│   │   └── client.ts                      # Fetch wrappers with Zod validation
│   │
│   ├── shared/
│   │   └── layer-config.ts                # Fallback layer/sublayer ordering
│   │
│   └── theme/                             # Theme system (§12)
│       ├── tokens.ts                      # ThemeTokens interface
│       ├── dark.ts                        # Dark theme values
│       ├── light.ts                       # Light theme values
│       └── provider.tsx                   # ThemeProvider (CSS custom properties)
│
├── server/                                # Express API server (§8)
│   ├── index.ts                           # Express app, route mounting, startup
│   ├── db.ts                              # SQLite connection, schema, migrations
│   ├── seed.ts                            # Seed data loader
│   └── routes/
│       ├── elements.ts
│       ├── relationships.ts
│       ├── views.ts
│       ├── domains.ts
│       ├── batch.ts
│       ├── export.ts
│       ├── archimate-io.ts               # ArchiMate XML import
│       └── csv-io.ts                      # Archi CSV import/export
│
├── schema/
│   └── schema.sql                         # SQLite DDL
│
├── data/                                  # Seed data (Stanmore mining example)
│   ├── seed-elements.json
│   ├── seed-relationships.json
│   ├── seed-views.json
│   └── arch-vis.db                        # Runtime SQLite database
│
├── shared/
│   └── types.ts                           # Types shared between client and server
│
├── tests/                                 # Top-level test files
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── REQUIREMENTS.md
├── DESIGN.md
└── CLAUDE.md
```

---

## 3. State Management Architecture

The application uses seven Zustand stores plus one command-pattern store for undo/redo. Stores are independent — no cross-store subscriptions. Components read from multiple stores via selector hooks.

### 3.1 Model Store (`src/store/model.ts`)

Manages the full architecture model. Fetches everything on startup via `loadAll()`.

```typescript
interface ModelState {
  elements: Element[];
  relationships: Relationship[];
  domains: Domain[];
  sublayerConfig: SublayerConfig | null;
  validRelationships: ValidRelationship[];
  graph: Graph;                    // Graphology directed multigraph
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;    // Deduplicated via module-level promise
  createElement: (data: CreateElementInput) => Promise<Element>;
  updateElement: (id: string, data: ...) => Promise<Element>;  // Optimistic + rollback
  deleteElement: (id: string) => Promise<void>;                // Cascades graph edges
  updateElementStatus: (id: string, status: ...) => Promise<void>;
}
```

Key patterns:
- **Deduplicated loading**: A module-level `loadAllPromise` variable prevents concurrent fetches.
- **Optimistic updates with rollback**: `updateElement` and `deleteElement` apply changes immediately, then revert on API failure.
- **Graphology sync**: Every mutation keeps the Graphology graph in sync via `addElementToGraph`, `updateElementInGraph`, `removeElementFromGraph` helpers.

### 3.2 View Store (`src/store/view.ts`)

Manages view navigation and position persistence.

```typescript
interface ViewState {
  viewList: View[];
  currentView: View | null;
  viewElements: ViewElement[];
  viewRelationships: ViewRelationship[];
  loading: boolean;
  positionSaveError: string | null;
  loadViewList: () => Promise<void>;
  loadView: (id: string) => Promise<void>;
  switchView: (id: string) => Promise<void>;  // Alias for loadView
  savePositions: (viewId: string, elements: ViewElement[]) => Promise<void>;
  createView: (name: string, viewpointType?: string) => Promise<void>;
}
```

Key pattern — **Position save with retry**: `savePositions` catches the first failure, waits 1 second, then retries once. On second failure, sets `positionSaveError` which the status bar displays.

### 3.3 Interaction Store (`src/store/interaction.ts`)

Manages selection and context menu state.

```typescript
interface InteractionState {
  selectedId: string | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  contextMenu: { elementId: string; x: number; y: number } | null;
  select: (id: string | null) => void;
  clearSelection: () => void;       // Also clears highlights
  setHighlight: (nodes: Set<string>, edges: Set<string>) => void;
  showContextMenu: (elementId: string, x: number, y: number) => void;
  hideContextMenu: () => void;
}
```

### 3.4 Theme Store (`src/store/theme.ts`)

```typescript
interface ThemeState {
  theme: ThemeMode;               // 'dark' | 'light'
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}
```

Default: `'dark'`.

### 3.5 Panel Store (`src/store/panel.ts`)

```typescript
interface PanelState {
  leftPanelOpen: boolean;          // Default: true
  rightPanelOpen: boolean;         // Default: true
  bottomPanelOpen: boolean;        // Default: true
  bottomPanelHeight: number;       // Default: 220
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
}
```

### 3.6 Layer Visibility Store (`src/store/layer-visibility.ts`)

```typescript
interface LayerVisibilityState {
  hiddenLayers: Set<string>;       // Completely hidden layers
  lockedLayers: Set<string>;       // Non-draggable, non-selectable layers
  layerOpacity: Record<string, number>;  // Per-layer opacity (0–1)
  showRelationships: boolean;      // Toggle all edges
  toggleHidden: (layer: string) => void;
  toggleLocked: (layer: string) => void;
  setOpacity: (layer: string, opacity: number) => void;
  toggleRelationships: () => void;
  reset: () => void;
}
```

### 3.7 Data Overlay Store (`src/store/data-overlay.ts`)

```typescript
interface DataOverlayState {
  colourByProperty: string | null;   // 'status' | 'domain' | 'maturity' | null
  heatmapProperty: string | null;    // 'confidence' | 'priority' | null
  showStatusBadge: boolean;
  displayFields: string[];           // Max 2 property keys shown below labels
  setColourByProperty: (prop: string | null) => void;  // Clears heatmap
  setHeatmapProperty: (prop: string | null) => void;   // Clears colourBy
  toggleStatusBadge: () => void;
  setDisplayFields: (fields: string[]) => void;         // Caps at 2
}
```

Also exports `heatmapColour(t: number): string` — a pure function that interpolates blue → green → red for a normalised value.

### 3.8 Undo/Redo Store (`src/interaction/undo-redo.ts`)

Uses the command pattern with execute/undo pairs. Located in `src/interaction/` rather than `src/store/` because it includes command factory functions.

```typescript
interface Command {
  description: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

interface UndoRedoState {
  past: Command[];
  future: Command[];
  run: (cmd: Command) => Promise<void>;   // Execute + push to past, clear future
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
}
```

Command factories: `createElementCommand`, `moveElementCommand`, `deleteElementCommand`, `renameElementCommand`, `createRelationshipCommand`, `deleteRelationshipCommand`.

Keyboard binding: `UndoRedoKeyHandler` in `Shell.tsx` listens for Ctrl+Z / Ctrl+Y.

---

## 4. Canvas Architecture

The canvas rendering pipeline has three layers of component hierarchy:

```
App
└── Shell                          # Layout chrome
    └── ui/Canvas                  # Store bridge — reads all stores, filters to visible elements
        └── XYFlowCanvas           # The actual ReactFlow canvas (src/renderers/xyflow/Canvas.tsx)
            ├── ScreenToFlowBridge # Captures screenToFlowPosition inside ReactFlow provider
            ├── ReactFlow          # @xyflow/react core
            │   ├── Background
            │   ├── Controls       # Includes grid-layout + ELK-layout buttons
            │   ├── MiniMap
            │   └── SnaplineOverlay
            ├── EdgeContextMenu    # Conditional overlay
            ├── RelationshipTypePicker  # Conditional overlay
            └── AlignmentToolbar   # Visible when 2+ nodes selected
```

### 4.1 ui/Canvas — Store Bridge

`src/ui/Canvas.tsx` is the glue layer between Zustand stores and the xyflow canvas. It:

1. Reads from `useModelStore`, `useViewStore`, `useInteractionStore`, `useThemeStore`.
2. Filters elements/relationships to those in the current view via `viewElementIds`.
3. Creates all callback handlers (position save, label change, element creation, deletion).
4. Routes operations through the undo/redo store where appropriate.
5. Determines render mode (`flat` vs `spatial`) and lazy-loads the legacy spatial renderer.

### 4.2 XYFlowCanvas — The Main Canvas

`src/renderers/xyflow/Canvas.tsx` (921 lines) is the fully-controlled ReactFlow canvas. It operates in **ref-based mode**: node and edge arrays are stored in `useRef` rather than `useState`, with a `forceRender` counter triggering re-renders when they change.

Key architectural decisions:

**Ref-based node/edge storage**:
```typescript
const nodesRef = React.useRef<Node[]>([]);
const edgesRef = React.useRef<Edge[]>([]);
const [, forceRender] = React.useState(0);
```
This avoids stale-closure issues with xyflow callbacks that capture the current nodes array.

**View change detection**:
```typescript
const viewChanged = currentViewRef.current !== viewId;
if (viewChanged) {
  currentViewRef.current = viewId;
  nodesRef.current = elementsToNodes(/* ... */);
  edgesRef.current = relationshipsToEdges(/* ... */);
}
```

**Memoised A* routing**: The `routedPaths` computation runs in a `useMemo` keyed on `[nodes, edges]` — it does not re-run on selection changes, theme changes, or overlay changes.

### 4.3 ScreenToFlowBridge Pattern

ReactFlow's `useReactFlow()` hook only works inside a `<ReactFlow>` provider. The canvas needs `screenToFlowPosition` for drag-and-drop outside the provider scope. The bridge pattern captures it:

```typescript
function ScreenToFlowBridge({ bridgeRef, fitViewRef }) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  bridgeRef.current = screenToFlowPosition;
  fitViewRef.current = () => fitView({ padding: 0.15 });
  return null;
}
```

### 4.4 WaypointUpdateContext

Edge waypoint manipulation is communicated from child `UnifiedEdge` components back to the canvas via React context, avoiding prop drilling through ReactFlow's edge system:

```typescript
export type WaypointUpdater = (edgeId: string, waypoints: Waypoint[]) => void;
export const WaypointUpdateContext = React.createContext<WaypointUpdater | null>(null);
```

### 4.5 Extracted Hooks

| Hook | File | Responsibility |
|------|------|----------------|
| `useCanvasKeyboard` | `hooks/useCanvasKeyboard.ts` | Arrow nudge (1px / 10px with Shift), Escape deselect, Ctrl+A select all. Debounces nudge position saves (300ms). |
| `useCanvasConnection` | `hooks/useCanvasConnection.ts` | Connection creation flow: `pendingConnection` state, mouse position tracking, relationship type picker trigger. |
| `useNodeBehaviour` | `hooks/useNodeBehaviour.ts` | Composites `useEditableNode` + hover state + connection-in-progress detection + opacity. Returns handle style functions. |
| `useEditableNode` | `hooks/useEditableNode.ts` | Inline label editing state machine: double-click to edit, Enter to commit, Escape to cancel. |

### 4.6 Extracted Sub-Components

| Component | File | Role |
|-----------|------|------|
| `RelationshipTypePicker` | `RelationshipTypePicker.tsx` | Popup menu after connection drag — lists valid ArchiMate, UML, or wireframe relationship types filtered by source/target notation. |
| `AlignmentToolbar` | `AlignmentToolbar.tsx` | Floating toolbar (visible when 2+ nodes selected) with 8 actions: align left/centre/right/top/middle/bottom, distribute horizontal/vertical. |
| `SnaplineOverlay` | `SnaplineOverlay.tsx` | SVG overlay rendering orange dashed guidelines during node drag when edges/centres align within 5px threshold. |
| `EdgeContextMenu` | `EdgeContextMenu.tsx` | Right-click menu on edges: change line type (straight/bezier/step) or delete. |

---

## 5. Node Component Architecture

### 5.1 Node Type Registry

```typescript
// src/renderers/xyflow/nodes/index.ts
export const nodeTypes: NodeTypes = {
  // ArchiMate
  archimate: ArchimateNode,
  'layer-band': LayerBandNode,
  // UML
  'uml-class': UmlClassNode,
  'uml-component': UmlComponentNode,
  'uml-use-case': UmlUseCaseNode,
  'uml-state': UmlStateNode,
  'uml-activity': UmlActivityNode,
  'uml-lifeline': UmlLifelineNode,
  'uml-activation': UmlActivationNode,
  'uml-fragment': UmlFragmentNode,
  // Sequence diagram (dedicated)
  'sequence-lifeline': SequenceLifelineNode,
  'sequence-activation': SequenceActivationNode,
  'sequence-fragment': SequenceFragmentNode,
  // Wireframe
  'wf-page': WfPageNode,
  'wf-section': WfSectionNode,
  'wf-nav': WfNavNode,
  'wf-table': WfTableNode,
  'wf-form': WfFormNode,
  'wf-control': WfControlNode,
  'wf-list': WfListNode,
  'wf-feedback': WfFeedbackNode,
};
```

Node type assignment happens in `src/model/notation.ts` via `getNodeType(archimateType)`. This function maps ArchiMate element types (including UML and wireframe types) to xyflow node type keys.

### 5.2 ArchimateNode

The primary ArchiMate node renders inside an SVG with:
- **Shape boundary** determined by aspect (rect, rounded, pill, event, folded-corner, box-3d, dashed, chevron).
- **Layer colours** from `getLayerColours(layer, theme)`.
- **Icon glyph** in the top-right corner (via `archimate-icons.tsx`).
- **Specialisation badge** — amber pill with 2-3 character code (e.g. "A1", "DA4").
- **Data overlay** — colour overrides from status/domain/maturity/heatmap.
- **Zoom-tier gating** — icon, label, and badge visibility controlled by `getZoomTierConfig(zoom)`.
- **Inline editing** — double-click triggers `useNodeBehaviour` → foreignObject input.

Scale factor: `1.6×` the registry's `defaultWidth`/`defaultHeight`.

### 5.3 RoutingHandles

All node types include invisible `RoutingHandles` — 5 per side (at 15%, 30%, 50%, 70%, 85%) for both source and target. Handle IDs follow the pattern `t0..t4`, `b0..b4`, `l0..l4`, `r0..r4` (source) and `*-t` suffix (target).

Additionally, ArchiMate nodes render 4 visible cardinal connector handles (`conn-n`, `conn-s`, `conn-w`, `conn-e`) that appear on hover for user-initiated connections, plus 4 target handles (`conn-*-t`) that show dashed borders during connection drag.

### 5.4 LayerBandNode

Layer bands are synthetic group nodes (IDs prefixed `__band-`) that:
- Render behind element nodes (`zIndex: -1`).
- Auto-resize to fit their children via `recomputeBands()`.
- Display the layer label in the top-left.
- ArchiMate element nodes are parented to their layer band (`node.parentId = bandId`).
- UML and wireframe nodes float freely — they are not parented to bands.

### 5.5 Node Data Pipeline

`node-conversion.ts → elementsToNodes()` transforms model elements into xyflow nodes:

1. Builds a position map from `viewElements` (saved positions).
2. Computes grid layout for elements at position (0,0).
3. Per-element: resolves node type, builds notation-specific data object, computes dimensions.
4. Applies data overlay colours (status/domain/maturity/heatmap).
5. Computes layer bands and converts element positions to band-relative coordinates.
6. Topologically sorts nodes (parents before children, bands before elements).

---

## 6. Edge Architecture

### 6.1 Edge Type Registry

```typescript
// src/renderers/xyflow/edges/index.ts
export const edgeTypes: EdgeTypes = {
  archimate: UnifiedEdge,
  'uml-edge': UnifiedEdge,
  'sequence-message': UnifiedEdge,
  'wireframe': UnifiedEdge,
};
```

All four edge type keys resolve to the same `UnifiedEdge` component. The edge type key is assigned by `getEdgeType(relationshipType)` in `src/model/notation.ts`.

### 6.2 UnifiedEdge Component

`UnifiedEdge` (`src/renderers/xyflow/edges/UnifiedEdge.tsx`) is a single memo'd component handling all notation families:

```typescript
export interface UnifiedEdgeData {
  relationshipType: string;        // Key into unified style registry
  label?: string;
  specialisation?: string | null;
  lineType?: LineType;             // 'straight' | 'bezier' | 'step'
  stepOffset?: number;             // Offset for orthogonal routing channel
  highlighted?: boolean;           // Connected to selected node
  dimmed?: boolean;
  theme?: 'dark' | 'light';
  routedWaypoints?: { x: number; y: number }[];   // From A* router
  waypoints?: Waypoint[];          // User-set manual waypoints
  customPath?: string;             // Pre-computed SVG path string
  // UML-specific fields
  edgeType?: string;
  messageType?: string;            // sync, async, return, create, destroy, self
  sequenceNumber?: number;
  stereotype?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  sourceRole?: string;
  targetRole?: string;
}
```

Rendering branches:
1. **Self-message** (sequence): Loop-back arc with inline arrowhead.
2. **Message** (sequence): Straight horizontal line with inline arrowhead + destroy marker.
3. **Standard edge** (ArchiMate/UML class/wireframe): SVG path with markers.

Path selection priority:
1. User-set waypoints → `buildRoundedPath(fullPath)`.
2. A* routed waypoints → `buildRoundedPath(routedWaypoints)`.
3. Pre-computed custom path string.
4. Orthogonal fallback → `buildOrthogonalFallback()`.
5. xyflow built-in path (bezier/step/straight).

When selected, the edge shows:
- Endpoint markers (amber circles at source/target).
- Waypoint drag handles (draggable amber circles at each bend).
- Segment slide handles (rectangular, `ns-resize` or `ew-resize` cursor).
- Ctrl+click on the path inserts a new waypoint.

### 6.3 Edge Style Registry

`src/notation/edge-styles.ts` defines `getUnifiedEdgeStyle(relationshipType): UnifiedEdgeStyle` — a pure lookup returning stroke style, dash array, width, and source/target markers for every relationship type across ArchiMate (11 types), UML class/component (7), UML sequence (6), UML activity (2), and wireframe (3).

### 6.4 AllMarkerDefs

`AllMarkerDefs` renders a hidden `<svg>` containing `<defs>` with all SVG markers:
- ArchiMate: `marker-filled-diamond`, `marker-open-diamond`, `marker-filled-circle`, `marker-filled-arrow`, `marker-open-arrow`, `marker-open-triangle`.
- UML: `uml-hollow-triangle`, `uml-filled-diamond`, `uml-hollow-diamond`, `uml-open-arrow`, `uml-filled-arrow`.

### 6.5 Edge Routing Pipeline

`edge-routing-integration.ts → relationshipsToEdges()`:
1. For each relationship, computes source/target sides via angle-based quadrant detection (`computeHandleSides`).
2. Distributes edges across 5 handles per side (order: centre first, then spread outward) to prevent stacking.
3. Varies `stepOffset` per slot (20, 12, 28, 8, 36 px) to separate parallel routes.
4. Returns xyflow `Edge` objects with handle IDs and data.

The A* orthogonal router (`src/layout/edge-routing.ts`) and port assignment algorithm (`src/layout/connection-points.ts`) run in the canvas's `useMemo` to compute `routedPaths`.

---

## 7. Data Pipeline

The complete data flow from database to pixels:

```
SQLite DB
    ↓ [server/routes/*.ts — SQL queries]
Express REST API (port 3001)
    ↓ [HTTP JSON responses]
src/api/client.ts (Zod-validated fetch wrappers)
    ↓ [validated TypeScript objects]
Zustand Stores (model.ts, view.ts)
    ↓ [React component reads via selectors]
ui/Canvas.tsx (store bridge)
    ↓ [filters to visible elements, creates callbacks]
renderers/xyflow/Canvas.tsx (XYFlowCanvas)
    ↓
node-conversion.ts → elementsToNodes()
    ↓ [Element[] + ViewElement[] → Node[]]
edge-routing-integration.ts → relationshipsToEdges()
    ↓ [Relationship[] + positions → Edge[]]
layout/connection-points.ts → assignPorts()
layout/edge-routing.ts → computeOrthogonalRoutes()
    ↓ [A* routed paths → Map<edgeId, RoutedEdge>]
ReactFlow → SVG render
```

### Key Transformation Functions

| Function | Location | Input → Output |
|----------|----------|----------------|
| `buildGraphFromData` | `model/graph.ts` | Elements + Relationships → Graphology Graph |
| `buildOrderMaps` | `layout-computation.ts` | SublayerConfig → layerOrder, sublayerOrder, layerLabels |
| `elementsToNodes` | `node-conversion.ts` | Elements + ViewElements → Node[] (with bands, overlays, sorting) |
| `computeGridLayout` | `layout-computation.ts` | Elements + ordering → Map<id, {x,y}> |
| `computeLayerBands` | `layer-bands.ts` | Elements + positions → LayerBandInfo[] |
| `recomputeBands` | `layer-bands.ts` | Node[] → Node[] (resized bands) |
| `relationshipsToEdges` | `edge-routing-integration.ts` | Relationships + positions → Edge[] (with handles) |
| `assignPorts` | `layout/connection-points.ts` | Edge list + element bounds → port coordinates |
| `computeOrthogonalRoutes` | `layout/edge-routing.ts` | RouteEdge[] + RouteElement[] → Map<id, RoutedEdge> |
| `computeElkLayout` | `layout/elk.ts` | LayoutInput[] + rels → positioned elements |

---

## 8. Server Architecture

### 8.1 Express Application

`server/index.ts` bootstraps:
1. Creates and seeds the SQLite database.
2. Mounts CORS middleware (origin: `http://localhost:5173`).
3. Registers 8 route modules under `/api`.
4. Binds to `0.0.0.0:3001`.

### 8.2 Route Modules

| Route File | Endpoints | Purpose |
|------------|-----------|---------|
| `elements.ts` | GET/POST/PUT/DELETE `/elements` | Element CRUD |
| `relationships.ts` | GET/POST/DELETE `/relationships` | Relationship CRUD |
| `views.ts` | GET/POST `/views`, GET/PUT `/views/:id` | View CRUD + view element management |
| `domains.ts` | GET/POST `/domains` | Domain CRUD |
| `batch.ts` | POST `/batch/import`, GET `/batch/export` | Bulk model import/export |
| `export.ts` | GET `/export` | Model export (JSON) |
| `archimate-io.ts` | POST `/import/archimate-xml` | ArchiMate XML import |
| `csv-io.ts` | POST `/import/csv`, GET `/export/csv` | Archi CSV import/export |

### 8.3 Database Layer

`server/db.ts`:
- SQLite database at `data/arch-vis.db`.
- WAL journal mode for concurrent reads.
- Foreign keys enforced.
- Schema loaded from `schema/schema.sql` (idempotent `CREATE IF NOT EXISTS`).
- Versioned migrations via `schema_version` table (currently 3 migrations).

### 8.4 Seed Data

`server/seed.ts` checks if the database is empty, then loads from:
- `data/seed-elements.json`
- `data/seed-relationships.json`
- `data/seed-views.json`

Uses `INSERT OR IGNORE` for idempotent seeding.

---

## 9. Build and Development

### 9.1 Development Server

```bash
npm run dev    # Runs both concurrently:
               #   dev:client → vite (port 5173)
               #   dev:server → tsx watch server/index.ts (port 3001)
```

### 9.2 Vite Configuration

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    host: '0.0.0.0',       // Accessible from 192.168.20.x (work machine)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

The proxy forwards `/api/*` requests from the Vite dev server to Express, so the client makes same-origin requests.

### 9.3 Production Build

```bash
npm run build    # tsc && vite build → dist/
npm run lint     # tsc --noEmit (type checking only)
```

---

## 10. Testing Architecture

### 10.1 Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { globals: true },
});
```

### 10.2 Test Locations

Tests exist in two patterns:
- **Co-located**: `src/**/__tests__/*.test.ts` (notation, model, renderers).
- **Top-level**: `tests/**/*.test.ts` (integration-style tests).

### 10.3 What Is Tested

| Test File | What It Tests |
|-----------|---------------|
| `src/notation/__tests__/registry.test.ts` | Shape registry lookup, all ArchiMate types registered |
| `src/notation/__tests__/edge-styles.test.ts` | Edge style lookup, all relationship types covered |
| `src/model/__tests__/notation.test.ts` | `getNotation()`, `getNodeType()`, `getEdgeType()` mapping |
| `src/model/__tests__/types.test.ts` | Zod schema validation for model types |
| `src/renderers/xyflow/__tests__/layout-computation.test.ts` | Grid layout, order map building |
| `src/renderers/xyflow/__tests__/edge-routing-integration.test.ts` | Handle side computation, port detection |
| `tests/model/types.test.ts` | Model type validation |
| `tests/model/graph.test.ts` | Graphology graph construction |
| `tests/layout/edge-routing.test.ts` | A* orthogonal routing |
| `tests/highlight.test.ts` | Graph traversal highlighting |
| `tests/projection.test.ts` | View projection logic |
| `tests/api/batch.test.ts` | Batch import API |

All tests target pure functions — no React component tests or DOM rendering.

---

## 11. Error Handling

### 11.1 ErrorBoundary Component

`src/ui/ErrorBoundary.tsx` is a React class component wrapping three regions:

```
App
└── ErrorBoundary name="Application"
    └── Shell
        ├── ErrorBoundary name="Canvas"
        │   └── Canvas
        └── ErrorBoundary name="Detail Panel"
            └── DetailPanel
```

On error: displays the error message, the boundary name, and "Try Again" / "Reload" buttons. Logs to console via `componentDidCatch`.

### 11.2 Position Save Retry

`useViewStore.savePositions` implements a single-retry strategy:
1. Attempt API call.
2. On failure: wait 1 second, retry once.
3. On second failure: set `positionSaveError` string.
4. Status bar displays amber warning icon when `positionSaveError` is non-null.

### 11.3 Model Store Rollback

`useModelStore.updateElement` and `deleteElement` use optimistic updates with try/catch rollback — if the API call fails, the previous state is restored in both the element array and the Graphology graph.

---

## 12. Theme System

### 12.1 Architecture

```
ThemeStore (Zustand)        ← toggleTheme()
    ↓
ThemeProvider (React context) ← applies CSS custom properties to :root
    ↓
Components                  ← read via var(--bg-primary), var(--text-primary), etc.
Node/edge components        ← receive theme as prop for SVG colour selection
```

### 12.2 Token Interface

```typescript
interface ThemeTokens {
  bgPrimary, bgSecondary, bgTertiary, bgCanvas: string;
  textPrimary, textSecondary, textMuted: string;
  borderPrimary, borderSecondary: string;
  buttonBg, buttonText, buttonHoverBg: string;
  panelBg, panelBorder: string;
  highlight, highlightEdge: string;
  dimNodeOpacity, dimEdgeOpacity, dimPlaneOpacity: number;
  selectionStroke, selectionGlow: string;
  statusBg, statusText: string;
}
```

### 12.3 Layer Colours

`src/notation/colors.ts` defines per-layer colour palettes with separate dark and light mode values. Each layer has three colour roles:
- `stroke`: Border and outline colour.
- `fill`: Node background (0.78 opacity dark, 0.60 light — opaque enough to occlude routed edges beneath).
- `planeFill`: Layer band background (low opacity).

Layers: motivation, strategy, business (+ \_upper/\_lower variants), application, technology, data, implementation.

### 12.4 CSS Custom Property Application

`ThemeProvider` runs a `useEffect` that sets 17 CSS custom properties on `document.documentElement` whenever the theme changes. The transition duration (0.2s) provides smooth theme switching.

---

## 13. Known Technical Debt

### Code Size

- **Canvas.tsx is 921 lines** — the extraction target was 500. Remaining in the file: all drag-stop handlers, alignment logic, layer visibility filtering, display edge computation, ELK layout trigger, and the JSX return block.

### Architecture

- **Graphology may be redundant** — it was introduced for highlight traversal (neighbour walks), but the same data is now available directly from the relationship array. The graph is maintained in sync with every element mutation but is rarely queried at runtime.

- **Full model load on startup** — `loadAll()` fetches all elements, relationships, domains, sublayer config, and valid relationships in a single batch. There is no lazy loading, pagination, or incremental sync. This is acceptable for the current model sizes (hundreds of elements) but would not scale to very large models.

- **`elementsToNodes` runs on every overlay/theme change** — the `useEffect` at line 213 has `[elements, overlayConfig]` as dependencies. Any change to colour-by, heatmap, status badge, or display fields triggers a full node rebuild. The rebuild preserves positions (via `buildPositionMap` snapshot), but the work is proportional to the element count.

### Lint Suppressions

Three `eslint-disable-line react-hooks/exhaustive-deps` comments in Canvas.tsx:
- **Line 227**: `useEffect` for position-preserving rebuild — intentionally excludes `theme`, `layerOrder`, `sublayerOrder`, `layerLabels`, `onLabelChange`, `relationships` to avoid rebuild loops.
- **Line 281**: `useMemo` for A* routing — intentionally excludes derived values that would cause unnecessary re-routing.
- **Line 581**: `useCallback` for alignment — intentionally excludes `resolveAbsolutePos` and `onPositionChangeRef`.

### Missing Undo Coverage

- Bulk relationship delete (`handleRelationshipsDelete` in `ui/Canvas.tsx`) is fire-and-forget — not routed through the undo/redo store. Only bulk element delete is undoable.

### Dual Sequence Implementations

Two sets of sequence diagram node components exist: the `uml/UmlSequenceNodes.tsx` legacy set and the `sequence/*.tsx` dedicated set. Both are registered in `nodeTypes`. The legacy set is kept for backward compatibility with existing seed data.
