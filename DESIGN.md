# arch-vis — Design

**Version:** 1.0 | March 2026

---

## 1. Paradigm: Model → View → Renderer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ MODEL         │────▶│ VIEW ENGINE   │────▶│ RENDERER          │
│ (SQLite +     │     │ (filter,      │     │ (SVG flat or      │
│  Graphology)  │     │  project,     │     │  SVG spatial 3D)  │
│               │     │  layout)      │     │                   │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 1.1 Model Layer

**SQLite** is the persistent store (schema in `schema/schema.sql`). On application load, the model is read into a **Graphology** in-memory graph for fast traversal, neighbour queries, and relationship highlighting. Writes go to SQLite then update the Graphology graph.

The model has two levels of typing:
- `archimate_type`: base ArchiMate element (e.g. `application-component`, `data-object`, `constraint`)
- `specialisation`: AI/Knowledge subtype (e.g. `domain-agent`, `knowledge-store`, `autonomy-level`), nullable for standard elements

### 1.2 View Engine

A view is a named projection stored in the `views` + `view_elements` + `view_relationships` tables. The view engine:
1. Queries elements matching the view's filter (by domain, layer, archetype, specialisation)
2. Looks up each element's notation shape via the shape registry (keyed by `archimate_type`)
3. Applies sublayer ordering from the config
4. Computes layout positions (ELK/dagre for flat, spatial assignment for 3D)
5. Merges saved positions from `view_elements` (manual overrides)
6. Outputs positioned shape descriptors for the renderer

### 1.3 Renderer

Two rendering backends:

**xyflow Canvas** (React Flow): The **primary** rendering mode for all interactive diagramming — ArchiMate flat views, UML diagrams, wireframes. xyflow provides built-in multi-select, box select, minimap, keyboard shortcuts, connection handles, pan-zoom, and custom node/edge renderers. ArchiMate notation shapes, UML shapes, and wireframe shapes are implemented as xyflow custom node components. Layout is computed by ELK/dagre and applied as node positions.

**SVG Spatial Renderer** *(experimental)*: D3.js-based 3D perspective projection onto SVG. Layer planes as projected quadrilaterals. Entities depth-sorted. Rotation via Y-axis turntable + X-axis tilt. Uses the `project3D` function — pure math, no WebGL. Retained for large-scale architecture visualisation experiments, potentially with LLM-driven layout. Not used for interactive editing.

The view definition specifies which renderer to use. The ViewSwitcher labels spatial views as "(experimental)".

---

## 2. Presentation Schema

The visualiser has its own SQLite schema, separate from the PFC backend. It is the source of truth for the architecture model. PFC data enters via ingestion.

See `schema/schema.sql` for the full DDL. Key tables:

### Element Storage

```
elements
├── id (TEXT PK)
├── archimate_type (TEXT NOT NULL)     — base ArchiMate type
├── specialisation (TEXT)              — AI/Knowledge subtype, NULL for standard
├── layer (TEXT NOT NULL)              — ArchiMate layer
├── sublayer (TEXT)                    — from config, overridable
├── name (TEXT NOT NULL)
├── description (TEXT)
├── domain_id (TEXT FK → domains)
├── status (TEXT)
├── properties (JSON)                  — type-specific properties
├── confidence (REAL)                  — from PFC extraction
├── source_session_id (TEXT)           — PFC session that created this
├── created_at, updated_at
```

### Relationships

```
relationships
├── id (TEXT PK)
├── archimate_type (TEXT NOT NULL)     — ArchiMate relationship type
├── specialisation (TEXT)              — e.g. 'grounded_in', NULL for standard
├── source_id (TEXT FK → elements)
├── target_id (TEXT FK → elements)
├── label (TEXT)
├── properties (JSON)
├── confidence (REAL)
├── created_at
```

### View Model

```
views
├── id, name, viewpoint_type, description
├── filter_domain, filter_layers, filter_specialisations (JSON)
├── render_mode ('flat' | 'spatial')
├── rotation_default (JSON: {y, x})
├── created_at

view_elements
├── view_id + element_id (composite PK)
├── x, y, width, height
├── sublayer_override
├── style_overrides (JSON)

view_relationships
├── view_id + relationship_id (composite PK)
├── route_points (JSON)
├── style_overrides (JSON)
```

---

## 3. Two-Level Type System

Every element in the model has:

```typescript
interface Element {
  id: string;
  archimate_type: ArchimateType;      // 'application-component', 'data-object', etc.
  specialisation: string | null;       // 'domain-agent', 'knowledge-store', etc.
  layer: ArchimateLayer;
  sublayer: string | null;
  name: string;
  // ...
}
```

**Rendering rule:** The shape registry maps `archimate_type` → shape geometry. If `specialisation` is non-null, a badge is overlaid.

Example:
- `{archimate_type: 'application-component', specialisation: null}` → renders as Application Component rect, no badge
- `{archimate_type: 'application-component', specialisation: 'domain-agent'}` → same rect shape, plus "A1" badge in top-right
- `{archimate_type: 'data-object', specialisation: 'knowledge-store'}` → folded-corner rect + "DA1" badge

This means the shape registry has ~30 entries (one per base ArchiMate type), not 85+ entries.

---

## 4. Sublayer Configuration

Sublayers are defined in `reference/sublayer-config.yaml`. Each ArchiMate layer has ordered sublayers, each sublayer lists which element types belong to it.

The auto-layout engine reads this config to assign vertical position within a layer band. Manual repositioning overrides the default per view.

The renderer reads layer/sublayer structure from config — it never hardcodes "there are 5 layers." If the config defines 7 layers (adding Motivation and Implementation), the renderer shows 7 planes.

---

## 5. Spatial 3D Projection

> **Note:** The spatial renderer is marked experimental. The flat 2D renderer is the primary view. The technical details below remain accurate as reference.

### 5.1 Coordinate System

Elements have world-space positions:
- `wx`: left-right (assigned by layout within sublayer)
- `wy`: vertical (layer index × LAYER_Y_SPACING)
- `wz`: depth (sublayer offset + random jitter for visual separation)

### 5.2 Projection

```typescript
function project3D(
  wx: number, wy: number, wz: number,
  rotY: number, rotX: number,
  centreX: number, centreY: number
): { sx: number; sy: number; scale: number; z: number } {
  // Y rotation (turntable)
  const x1 = wx * cos(rotY) - wz * sin(rotY);
  const z1 = wx * sin(rotY) + wz * cos(rotY);
  // X tilt
  const y2 = wy * cos(rotX) - z1 * sin(rotX);
  const z2 = wy * sin(rotX) + z1 * cos(rotX);
  // Perspective
  const P = 1200;
  const s = P / (P + z2);
  return { sx: centreX + x1 * s, sy: centreY + y2 * s, scale: s, z: z2 };
}
```

### 5.3 Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| LAYER_Y_SPACING | 150 | Vertical distance between layer planes |
| PLANE_WIDTH | 700 | Width of each layer platform |
| PLANE_DEPTH | 110 | Depth of each layer platform |
| PERSPECTIVE | 1200 | Projection distance |
| Default rotY | -0.3 | Initial viewing angle (~-17°) |
| Default rotX | 0.18 | Initial tilt (~10°) |
| X_RANGE | ±0.314 | ±18° tilt limit (10% of π) |

### 5.4 Interaction

| Input | Action |
|-------|--------|
| Left-drag | Pan |
| Shift+drag horizontal | Rotate Y |
| Shift+drag vertical | Tilt X (clamped) |
| Scroll | Zoom (×0.93 / ×1.07) |
| Click entity | Select → open detail panel |
| Right-click entity | Context menu → Show Incoming / Show Outgoing (highlight mode) |
| Double-click entity | Open detail panel |
| Click background | Deselect, close highlight mode |

---

## 5.5 Connection Ports and Edge Routing

Elements expose discrete **connection ports** — anchor points spaced ~10px apart around the element perimeter. Edge routing assigns each edge to a unique port so no two edges share the same attachment point.

**Port assignment algorithm:**
1. Compute candidate ports for each element (evenly spaced around the boundary)
2. Sort edges by length (shortest first)
3. Assign each edge's source and target to the nearest available port
4. Mark assigned ports as occupied

**Orthogonal routing:**
- Routes start from boundary ports directly (no centre-to-centre lines, no EXIT_GAP offset)
- Same-layer routes use 2–3 segments with right-angle bends
- Cross-layer routes use 4 segments (exit port → horizontal → vertical → horizontal → enter port)

Implementation: `src/layout/connection-points.ts` (port computation), `src/layout/edge-routing.ts` (route assignment).

---

## 6. Relationship Highlighting

Highlighting is **opt-in via context menu**, not triggered on regular click. Clicking an element selects it and opens the detail panel without dimming.

To enter highlight mode:
1. Right-click an element → context menu → "Show Incoming" or "Show Outgoing"
2. Compute directed neighbours based on selection
3. Collect connected entity IDs into `highlightedNodes` set
4. Collect edge indices into `highlightedEdges` set
5. Render highlighted entities at full opacity + highlight stroke + glow
6. Render highlighted edges at 80–90% opacity + highlight colour + label
7. Render everything else dimmed (entities 7–12%, edges 2–4%)
8. Dim layer planes with no highlighted entities to 12–15%

Click background to exit highlight mode and clear dimming.

---

## 7. Zoom Tiers

| Tier | Range | Canvas Shows |
|------|-------|-------------|
| Birds Eye | 15–32% | Coloured dots. No labels. |
| Context | 32–55% | Entity labels. Shape outlines. |
| Structure | 55–90% | Archetype icons inside shapes. Specialisation badges. |
| Detail | 90–150% | Full notation. All edge labels. |
| Full | 150%+ | Maximum detail. |

Fields/schema NEVER appear on canvas at any zoom level.

---

## 8. API Design

Express.js backend serving SQLite. All routes return JSON.

```
GET    /api/domains
POST   /api/domains
GET    /api/elements?layer=&domain=&specialisation=
POST   /api/elements
PUT    /api/elements/:id
DELETE /api/elements/:id
GET    /api/relationships?source=&target=
POST   /api/relationships
DELETE /api/relationships/:id
GET    /api/views
POST   /api/views
GET    /api/views/:id          (includes view_elements + view_relationships)
PUT    /api/views/:id/elements (batch upsert positions)
GET    /api/sublayer-config
GET    /api/valid-relationships
POST   /api/import/pfc-yaml
POST   /api/import/archimate-xml
POST   /api/import/model-batch     (agent batch creation — any notation)
GET    /api/export/archimate-xml
GET    /api/export/json
GET    /api/export/model-batch?view=:id  (round-trip agent export)
```

---

## 9. PFC Integration

PFC data enters via the `/api/import/pfc-yaml` endpoint. The ingestion pipeline:

1. Parse YAML from PFC export (`output/live-model/{session_id}.yaml`)
2. Map PFC concern tables to visualiser elements:
   - `motivation.*` → elements with appropriate archimate_type
   - `strategy.*` → elements
   - `business_architecture.*` → elements (split upper/lower by archetype)
   - `solution_architecture.*` → elements (layer assigned by archimate_type)
   - `relationships` → relationships (polymorphic source/target resolved)
3. Set `source_session_id` for provenance tracking
4. Preserve `confidence` from PFC
5. Upsert into SQLite (update if ID exists, insert if new)
6. Rebuild Graphology graph

---

## 10. Project Structure

```
arch-vis/
├── CLAUDE.md
├── REQUIREMENTS.md
├── DESIGN.md
├── reference/
│   ├── archimate-elements.md
│   ├── archimate-relationships.md
│   ├── specialisation-profile.md
│   ├── sublayer-config.yaml
│   └── viewpoints.md
├── schema/
│   └── schema.sql
├── data/
│   ├── seed-elements.json
│   ├── seed-relationships.json
│   └── seed-views.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server/
│   ├── index.ts               # Express entry, SQLite init
│   ├── db.ts                  # better-sqlite3 wrapper, seed loader
│   ├── routes/
│   │   ├── elements.ts
│   │   ├── relationships.ts
│   │   ├── views.ts
│   │   ├── domains.ts
│   │   ├── import.ts
│   │   └── export.ts
│   └── seed.ts                # Load seed data on first run
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── model/
│   │   ├── graph.ts           # Graphology setup
│   │   ├── types.ts           # Element, Relationship, View types
│   │   ├── archetypes.ts      # archimate_type enum + layer mapping
│   │   └── specialisations.ts # specialisation registry
│   ├── notation/
│   │   ├── registry.ts        # archimate_type → ShapeDefinition
│   │   ├── shapes/            # SVG shape renderers per archetype
│   │   ├── badges.ts          # specialisation badge renderer
│   │   ├── colors.ts          # per-layer, per-archetype colours
│   │   ├── edges.ts           # relationship type → edge style
│   │   └── uml/
│   │       ├── class-shape.ts
│   │       ├── component-shape.ts
│   │       └── edges.ts
│   ├── renderers/
│   │   ├── types.ts           # ShapeDescriptor, PositionedElement
│   │   ├── xyflow/
│   │   │   ├── Canvas.tsx     # xyflow ReactFlow wrapper + config
│   │   │   ├── nodes/         # Custom node components per notation
│   │   │   │   ├── ArchimateNode.tsx
│   │   │   │   ├── UmlClassNode.tsx
│   │   │   │   ├── UmlComponentNode.tsx
│   │   │   │   ├── WireframeNode.tsx
│   │   │   │   └── index.ts   # nodeTypes registry
│   │   │   ├── edges/         # Custom edge components per notation
│   │   │   │   ├── ArchimateEdge.tsx
│   │   │   │   ├── UmlEdge.tsx
│   │   │   │   └── index.ts   # edgeTypes registry
│   │   │   ├── controls.tsx   # Toolbar, minimap, zoom controls
│   │   │   └── hooks.ts       # xyflow event handlers → Zustand store
│   │   └── spatial/           # (experimental — D3 SVG, not xyflow)
│   │       ├── projection.ts  # project3D
│   │       ├── renderer.tsx   # Spatial SVG renderer
│   │       ├── rotation.ts    # Rotation state + input
│   │       ├── layers.ts      # Layer plane rendering
│   │       └── depth-sort.ts
│   ├── interaction/
│   │   ├── highlight.ts       # Relationship graph computation
│   │   ├── selection.ts
│   │   ├── multi-select.ts    # Box select + shift/ctrl click
│   │   ├── undo-redo.ts       # Command pattern undo/redo
│   │   └── pan-zoom-rotate.ts
│   ├── layout/
│   │   ├── elk.ts
│   │   ├── dagre.ts
│   │   ├── spatial.ts         # World-position assignment
│   │   ├── connection-points.ts # Discrete anchor ports around elements
│   │   ├── edge-routing.ts    # Orthogonal route + port assignment
│   │   └── types.ts
│   ├── theme/
│   │   ├── tokens.ts
│   │   ├── dark.ts
│   │   ├── light.ts
│   │   └── provider.tsx
│   ├── ui/
│   │   ├── Shell.tsx          # App chrome, top bar, sidebar
│   │   ├── Canvas.tsx         # SVG container, renderer host
│   │   ├── DetailPanel.tsx
│   │   ├── Palette.tsx        # Element palette
│   │   ├── ModelTree.tsx      # Archi-style folder tree
│   │   ├── Navigator.tsx      # Relationship navigator panel
│   │   ├── Properties.tsx     # Properties editor
│   │   ├── ViewSwitcher.tsx
│   │   ├── ZoomBar.tsx
│   │   ├── RotationPanel.tsx
│   │   ├── SelectionBadge.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ExportMenu.tsx
│   ├── store/
│   │   ├── model.ts           # Zustand: elements, relationships
│   │   ├── view.ts            # Zustand: current view, positions
│   │   ├── interaction.ts     # Zustand: selection, highlight
│   │   └── theme.ts           # Zustand: theme state
│   └── api/
│       └── client.ts          # fetch wrappers for Express API
├── tests/
│   ├── projection.test.ts
│   ├── highlight.test.ts
│   ├── shapes.test.ts
│   └── schema.test.ts
└── public/
    └── index.html
```

---

## 11. Model Tree Architecture

The model tree mirrors Archi's folder structure, providing a navigable hierarchy of all model elements.

### 11.1 Folder Structure

Top-level folders by ArchiMate layer + Relations + Views:

```
Model
├── Strategy/
├── Business/
├── Application/
├── Technology/
├── Motivation/
├── Implementation/
├── Other/
├── Relations/
└── Views/
```

Each layer folder contains elements of that layer. User-created sub-folders provide manual organisation within layers.

### 11.2 Folders Table

```
folders
├── id (TEXT PK)
├── name (TEXT NOT NULL)
├── parent_id (TEXT FK → folders)    — NULL for top-level layer folders
├── folder_type (TEXT NOT NULL)       — 'layer' | 'user' | 'relations' | 'views'
├── sort_order (INTEGER)
├── created_at
```

Elements reference their folder via `folder_id` FK on the `elements` table. Views reference their folder via `folder_id` FK on the `views` table.

### 11.3 Tree–Canvas Interaction

- Drag from model tree to canvas: adds existing element to current view (creates `view_elements` record with drop position)
- Drag from canvas to model tree folder: updates element's `folder_id` (reclassifies)
- Click in tree selects on canvas (if element is in current view) and vice versa
- Elements not appearing in any view rendered in italic (orphan detection)
- Search/filter by name, type, or property value

---

## 12. Notation System

### 12.1 Multi-Notation Support

The shape registry is extended to support multiple notations. The `notation` field on elements discriminates between rendering systems:

```typescript
type Notation = 'archimate' | 'uml' | 'wireframe';

// Shape registry keyed by (notation, type) tuple
type ShapeKey = `${Notation}:${string}`;
// e.g. 'archimate:application-component', 'uml:uml-class', 'wireframe:wf-page'
```

### 12.2 Schema Changes

Add `notation` column to `elements` table:

```sql
ALTER TABLE elements ADD COLUMN notation TEXT NOT NULL DEFAULT 'archimate';
-- CHECK (notation IN ('archimate', 'uml', 'wireframe'))
```

Add `notation` column to `relationships` table:

```sql
ALTER TABLE relationships ADD COLUMN notation TEXT NOT NULL DEFAULT 'archimate';
```

### 12.3 UML Shape Renderers

UML shapes live in `src/notation/uml/` parallel to existing ArchiMate shapes:

```
src/notation/
├── registry.ts              # Unified registry keyed by (notation, type)
├── shapes/                  # ArchiMate shape renderers (existing)
├── uml/
│   ├── class-shape.ts       # 3-compartment class box
│   ├── interface-shape.ts   # <<interface>> stereotype
│   ├── enum-shape.ts        # <<enumeration>> stereotype
│   ├── component-shape.ts   # Component with icon
│   ├── actor-shape.ts       # Stick figure
│   ├── use-case-shape.ts    # Ellipse
│   ├── package-shape.ts     # Tab-rectangle container
│   ├── note-shape.ts        # Folded corner
│   └── edges.ts             # UML edge styles (6 types)
├── wireframe/
│   ├── page-shape.ts        # Browser chrome container
│   ├── section-shape.ts     # Nestable container with header
│   ├── controls.ts          # Button, input, select, checkbox, radio, textarea
│   ├── table-shape.ts       # Grid with header row
│   ├── nav-shape.ts         # Horizontal/vertical nav bar
│   ├── media-shape.ts       # Image placeholder, icon
│   ├── text-shape.ts        # Text block, link, heading
│   ├── modal-shape.ts       # Overlay container
│   └── edges.ts             # Wireframe edge styles (navigates-to, contains)
├── badges.ts
├── colors.ts
└── edges.ts                 # ArchiMate edge styles (existing)
```

All three notations (ArchiMate, UML, wireframe) share the same canvas interaction, layout engine, and persistence infrastructure. The renderer dispatches to the correct shape renderer based on the element's `notation` field.

### 12.4 Wireframe Rendering

Wireframes use a **nested containment** layout rather than the graph-based ELK layout used by ArchiMate/UML:

- **Container elements** (page, section, card, modal, form) have children positioned spatially inside their bounds
- **Nesting** is via `parent_id` on the elements table — same field used for ArchiMate capability trees
- **Layout** is constraint-based: children flow top-to-bottom within their parent, respecting padding and spacing
- **Style** is intentionally lo-fi: greyscale palette, thin borders, no colour fills. Wireframes should look unfinished
- **Page flow** arrows (`wf-navigates-to`) connect pages/buttons to target pages, rendered as simple dashed arrows

### 12.5 UML Sequence Tables

Sequence diagrams require dedicated tables since they have a fundamentally different data model (time-ordered messages, not spatial relationships):

```
sequence_messages
├── id (TEXT PK)
├── view_id (TEXT FK → views)
├── source_lifeline_id (TEXT FK → elements)
├── target_lifeline_id (TEXT FK → elements)
├── message_type (TEXT NOT NULL)       — 'synchronous' | 'asynchronous' | 'return' | 'create' | 'destroy' | 'self' | 'found' | 'lost'
├── label (TEXT)
├── sequence_order (INTEGER NOT NULL)
├── fragment_id (TEXT FK → sequence_fragments)
├── created_at

sequence_fragments
├── id (TEXT PK)
├── view_id (TEXT FK → views)
├── operator (TEXT NOT NULL)            — 'alt' | 'opt' | 'loop' | 'break' | 'par' | 'critical'
├── guard (TEXT)
├── parent_fragment_id (TEXT FK → sequence_fragments)
├── spanning_lifelines (JSON)           — array of element IDs
├── vertical_extent (JSON)              — {start_order, end_order}
├── created_at
```

### 12.6 Batch Model Import/Export (Agent Pathway)

The batch import API is the primary pathway for agent-driven model creation. It accepts a single JSON payload that describes a complete diagram — elements, relationships, nesting, and an optional view — and atomically upserts everything into SQLite.

**Endpoint:** `POST /api/import/model-batch`

**Payload schema:**

```typescript
interface BatchImportPayload {
  notation: 'archimate' | 'uml' | 'wireframe';
  view?: {
    name: string;
    viewpoint_type: string;        // 'class_diagram', 'component_diagram', 'wireframe', etc.
    description?: string;
  };
  elements: BatchElement[];
  relationships: BatchRelationship[];
}

interface BatchElement {
  id?: string;                      // auto-generated if omitted
  name: string;
  type: string;                     // notation-specific type (e.g. 'uml-class', 'wf-page')
  properties?: Record<string, unknown>;
  children?: BatchElement[];        // nested containment (wireframes, UML packages)
}

interface BatchRelationship {
  type: string;                     // notation-specific (e.g. 'uml-dependency', 'wf-navigates-to')
  source: string;                   // element name or ID
  target: string;                   // element name or ID
  label?: string;
  properties?: Record<string, unknown>;
}
```

**Processing pipeline:**

1. Parse and validate payload against Zod schema
2. Resolve name references → generate IDs for new elements
3. Flatten nested `children[]` into elements with `parent_id`
4. Validate all relationships against `valid_relationships` metamodel
5. If validation fails: return 400 with all errors, no writes
6. If validation passes: upsert elements, relationships, view, view_elements in a single transaction
7. Trigger auto-layout for the created view
8. Return created IDs and view URL

**Export:** `GET /api/export/model-batch?view=:id` returns the same payload format, enabling round-trip agent workflows (generate → user tweaks → agent reads back → agent iterates).

---

## 13. Relationship Validation

### 13.1 ArchiMate Metamodel Matrix

The `valid_relationships` table is populated from Archi's `relationships.xml` matrix, containing ~3000 source_type → target_type → relationship_type rules. This is the authoritative validation source for ArchiMate relationship creation.

The existing table keeps its current column names and composite PK. A `notation` column is added with a default of `'archimate'` to discriminate ArchiMate vs UML rules.

```
valid_relationships
├── source_archimate_type (TEXT NOT NULL)
├── target_archimate_type (TEXT NOT NULL)
├── relationship_type (TEXT NOT NULL)
├── notation (TEXT NOT NULL DEFAULT 'archimate')
├── PRIMARY KEY (source_archimate_type, target_archimate_type, relationship_type)
```

> **Note:** Column names `source_archimate_type` / `target_archimate_type` are retained from Phase 1 to avoid breaking existing queries and Zod schemas. The `notation` column is added when UML validation rules are needed (Phase 3). When UML rules are added, the PK should be extended to include `notation`.

### 13.2 Magic Connector Pattern

When the user drags to create a connection between two elements:

1. Query `valid_relationships` for all valid relationship types given the source and target element types
2. If no valid types exist: show "Not Allowed" cursor, prevent connection
3. If exactly one valid type: create the relationship directly
4. If multiple valid types: show popup menu with valid options

UML validation rules are stored alongside ArchiMate rules in the same table, discriminated by the `notation` column.

### 13.3 Junction Support

AND/OR junctions are special elements that enforce all connected relationships are the same type. When a relationship is connected to a junction:

1. Check existing relationships on the junction
2. If junction has existing relationships: new relationship must match the type
3. If junction is empty: any valid relationship type is allowed
