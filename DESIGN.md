# arch-vis — Logical Design

**Version:** 2.1 | March 2026

This document describes the technology-agnostic logical architecture of arch-vis. It defines data models, algorithms, patterns, and contracts that could be implemented on any stack. For implementation-specific details (UI framework, state management library, rendering toolkit), see IMPLEMENTATION.md.

---

## 1. Paradigm: Model → View → Renderer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ MODEL         │────▶│ VIEW ENGINE   │────▶│ RENDERER          │
│ (Relational   │     │ (filter,      │     │ (Canvas — flat    │
│  DB + graph)  │     │  project,     │     │  interactive, or  │
│               │     │  layout)      │     │  spatial 3D)      │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 1.1 Model Layer

A relational database is the persistent store (§2). On application load, the model is read into an **in-memory directed multigraph** for fast traversal, neighbour queries, and relationship highlighting. All writes go to the database first, then update the in-memory graph.

The model uses a two-level type system (§3) and supports three notation families (§4).

### 1.2 View Engine (R-VIEW-01 – R-VIEW-08)

A view is a named projection stored in the database. The view engine:

1. Queries elements matching the view's filter criteria (by domain, layer, archetype, specialisation)
2. Looks up each element's notation shape via the shape registry (keyed by element type)
3. Applies sublayer ordering from the configuration (§5)
4. Computes layout positions — hierarchical layout for flat views, spatial assignment for 3D (§6)
5. Merges saved positions from the view_elements table (manual overrides)
6. Outputs positioned shape descriptors for the renderer

### 1.3 Renderer

Two rendering backends share the same model and view infrastructure:

**Interactive Canvas** (primary): The default rendering mode for all notations — ArchiMate, UML, and wireframe diagrams. Provides multi-select, box select, minimap, keyboard shortcuts, connection handles, pan-zoom, and notation-specific shape renderers. Layout is computed by the layout engine and applied as node positions.

**Spatial 3D Renderer** (experimental): Perspective projection of layer planes onto a 2D surface. Entities are depth-sorted. Rotation via Y-axis turntable + X-axis tilt. Uses a pure-math `project3D` function — no GPU required. Retained for large-scale architecture visualisation experiments. Not used for interactive editing.

The view definition specifies which renderer to use.

---

## 2. Data Model / Persistence Schema

The persistence layer uses a relational database. The schema is SQL-standard and portable to any SQL engine. Key design decisions:

- **Single elements table** for all notation types (ArchiMate, UML, wireframe). Notation is discriminated by type prefix (§4.1).
- **JSON columns** for type-specific properties (class attributes/methods, wireframe options, etc.).
- **Composite primary keys** on junction tables (view_elements, view_relationships, valid_relationships).
- **Cascading deletes** from elements to relationships and from views to view_elements/view_relationships.

### 2.1 Core Tables

```
domains
├── id (TEXT PK)
├── name (TEXT NOT NULL)
├── description (TEXT)
├── priority (INTEGER)
├── maturity (TEXT: initial | defined | managed | optimised)
├── autonomy_ceiling (TEXT: L0–L5)
├── track_default (TEXT: Track1 | Track2)
├── owner_role (TEXT)
├── created_at, updated_at (TIMESTAMP)

elements
├── id (TEXT PK)
├── name (TEXT NOT NULL)
├── archimate_type (TEXT NOT NULL)         — element type (ArchiMate, UML, or wireframe)
├── specialisation (TEXT)                  — AI/Knowledge subtype, NULL for standard
├── layer (TEXT NOT NULL)                  — ArchiMate layer assignment
├── sublayer (TEXT)                        — from config, overridable per view
├── domain_id (TEXT FK → domains)
├── status (TEXT: active | draft | superseded | deprecated | retired)
├── description (TEXT)
├── properties (JSON)                     — notation-specific structured properties
├── confidence (REAL 0.0–1.0)             — extraction confidence score
├── source_session_id (TEXT)              — provenance tracking
├── parent_id (TEXT FK → elements)        — hierarchy (nesting, containment)
├── created_by (TEXT)                     — creator identity
├── source (TEXT)                          — creation pathway: manual | archimate-xml | csv | api | pfc
├── created_at, updated_at (TIMESTAMP)

    Indexes: layer, domain_id, archimate_type, specialisation

relationships
├── id (TEXT PK)
├── archimate_type (TEXT NOT NULL)         — relationship type (constrained to valid values)
├── specialisation (TEXT)                  — e.g. 'grounded_in', NULL for standard
├── source_id (TEXT FK → elements, CASCADE)
├── target_id (TEXT FK → elements, CASCADE)
├── label (TEXT)
├── description (TEXT)
├── properties (JSON)
├── confidence (REAL)
├── created_by (TEXT)
├── source (TEXT)
├── created_at, updated_at (TIMESTAMP)

    Indexes: source_id, target_id
```

### 2.2 View Tables

```
views
├── id (TEXT PK)
├── name (TEXT NOT NULL)
├── viewpoint_type (TEXT NOT NULL)         — layered | uml_class | wireframe | etc.
├── description (TEXT)
├── render_mode (TEXT: flat | spatial)
├── filter_domain (TEXT)                  — scope to one domain (NULL = all)
├── filter_layers (JSON ARRAY)            — layer names (NULL = all)
├── filter_specialisations (JSON ARRAY)
├── rotation_default (JSON: {y, x})       — for spatial renderer
├── is_preset (BOOLEAN)
├── created_at, updated_at (TIMESTAMP)

view_elements
├── view_id + element_id (COMPOSITE PK)
├── x, y (REAL NOT NULL)
├── width, height (REAL)                  — NULL = use shape registry default
├── sublayer_override (TEXT)
├── style_overrides (JSON)

view_relationships
├── view_id + relationship_id (COMPOSITE PK)
├── route_points (JSON ARRAY of {x, y})
├── style_overrides (JSON)
```

### 2.3 Metamodel and Configuration Tables

```
valid_relationships
├── source_archimate_type (TEXT NOT NULL)
├── target_archimate_type (TEXT NOT NULL)
├── relationship_type (TEXT NOT NULL)
├── PRIMARY KEY (source_archimate_type, target_archimate_type, relationship_type)

reasoning_summaries
├── id (TEXT PK)
├── element_id (TEXT FK → elements, CASCADE)
├── session_id (TEXT NOT NULL)
├── session_summary (TEXT)
├── decisions_relevant (JSON)
├── confidence_at_time (REAL)
├── session_url (TEXT)
├── created_at (TIMESTAMP)

process_steps
├── id (TEXT PK)
├── process_id (TEXT FK → elements, CASCADE)
├── sequence (INTEGER NOT NULL)
├── name (TEXT NOT NULL)
├── step_type (TEXT: human | agent | system | decision | gateway)
├── role_id, agent_id (TEXT FK → elements)
├── agent_autonomy (TEXT)
├── description (TEXT)
├── input_objects, output_objects (JSON)
├── approval_required, track_crossing (BOOLEAN)

preferences
├── key (TEXT PK)
├── value (TEXT NOT NULL)
```

### 2.4 Sequence Diagram Tables (R-UML-06, R-UML-07)

```
sequence_messages
├── id (TEXT PK)
├── view_id (TEXT FK → views)
├── source_lifeline_id (TEXT FK → elements)
├── target_lifeline_id (TEXT FK → elements)
├── message_type (TEXT: synchronous | asynchronous | return | create | destroy | self | found | lost)
├── label (TEXT)
├── sequence_order (INTEGER NOT NULL)
├── fragment_id (TEXT FK → sequence_fragments)
├── created_at (TIMESTAMP)

sequence_fragments
├── id (TEXT PK)
├── view_id (TEXT FK → views)
├── operator (TEXT: alt | opt | loop | break | par | critical | ref)
├── guard (TEXT)
├── parent_fragment_id (TEXT FK → sequence_fragments)
├── spanning_lifelines (JSON ARRAY)
├── vertical_extent (JSON: {start_order, end_order})
├── created_at (TIMESTAMP)
```

---

## 3. Two-Level Type System (R-MOD-03)

Every element in the model has:

```
Element {
  archimate_type: string     // base type: 'application-component', 'data-object', etc.
  specialisation: string?    // AI/Knowledge subtype: 'domain-agent', 'knowledge-store', etc.
}
```

**Rendering rule:** The shape registry maps `archimate_type` to shape geometry. If `specialisation` is non-null, a badge is overlaid. This means the shape registry has ~30 entries (one per base ArchiMate type), not 85+ entries.

Examples:

| archimate_type | specialisation | Renders As |
|---------------|---------------|------------|
| `application-component` | `null` | Application Component rect, no badge |
| `application-component` | `domain-agent` | Same rect shape + "A1" badge in top-right |
| `data-object` | `knowledge-store` | Folded-corner rect + "DA1" badge |

The model defines 55 specialisations across all ArchiMate layers:

- **Motivation (13):** AI guardrails, autonomy levels, quality metrics
- **Strategy (3):** Knowledge capability, domain boundary, AI use case
- **Business (8):** Authority rules, vocabularies, scoring profiles
- **Application (11):** Agents, orchestration, retrieval services, reasoning traces
- **Technology (8):** Search engines, LLM gateways, embedding services
- **Data (12):** Knowledge stores, ontologies, vector indices, prompt libraries

---

## 4. Multi-Notation Architecture

### 4.1 Notation Discrimination by Type Prefix

Three notations coexist in a single model, discriminated by element type prefix:

| Prefix | Notation | Example Types |
|--------|----------|---------------|
| *(bare)* | ArchiMate | `application-component`, `business-process`, `data-object` |
| `uml-` | UML | `uml-class`, `uml-component`, `uml-actor`, `uml-activity` |
| `wf-` | Wireframe | `wf-page`, `wf-section`, `wf-button`, `wf-table` |

The notation is derived from the type string — no separate `notation` column is needed:

```
function getNotation(type):
  if type starts with "uml-" → "uml"
  if type starts with "wf-"  → "wireframe"
  otherwise                  → "archimate"
```

### 4.2 Shape Registry Pattern (R-RND-03)

A lookup table maps element type strings to shape definitions:

```
ShapeDefinition {
  shapeType: rect | rounded-rect | pill | folded-corner | box-3d | event | rect-with-icon | dashed-rect
  defaultWidth: number (px)
  defaultHeight: number (px)
  iconType?: person | component | lollipop | artifact | header-bar | stepped
}
```

The registry contains one entry per base ArchiMate type (~30 entries). UML and wireframe types are handled by their own shape renderers (dispatched by notation). A fallback shape (plain rect, 80x22px) is returned for unrecognised types.

Shape families by ArchiMate aspect:

| Aspect | Shape Types |
|--------|------------|
| Active structure (actors, components, nodes) | rect, rect-with-icon, box-3d |
| Behaviour (processes, functions, services) | pill, event |
| Passive structure (objects, artefacts) | folded-corner |
| Motivation (goals, requirements) | rounded-rect, rect |

### 4.3 Edge Style Registry Pattern

A lookup table maps relationship type strings to visual edge styles:

```
EdgeStyle {
  strokeStyle: solid | dashed
  dashArray: string             — SVG dash pattern
  width: number                 — stroke width
  sourceMarker: MarkerType?     — arrowhead at source end
  targetMarker: MarkerType?     — arrowhead at target end
}
```

Marker types include: `filled-diamond`, `open-diamond`, `filled-circle`, `filled-arrow`, `open-arrow`, `open-triangle`, and UML-specific variants (`uml-hollow-triangle`, `uml-filled-diamond`, `uml-hollow-diamond`).

The registry covers all three notations:

- **ArchiMate (11 types):** composition, aggregation, assignment, realisation, serving, access, influence, triggering, flow, specialisation, association
- **UML structural (7):** inheritance, realisation, composition, aggregation, association, dependency, assembly
- **UML behavioural (2):** control-flow, object-flow
- **UML sequence (6):** sync/async/return/create/destroy/self messages
- **Wireframe (3):** navigates-to, binds-to, contains

### 4.4 Unified Edge Rendering

All notations use a **single edge rendering component**. The component:

1. Looks up the edge style from the registry by relationship type
2. Renders the path using the computed route (from the edge routing system, §7)
3. Draws source/target markers from SVG marker definitions
4. Renders labels at the midpoint

This eliminates per-notation edge components and ensures consistent behaviour.

### 4.5 Notation-Specific Palettes (R-PAL-01)

The element palette filters available types by the current view's notation:

```
NOTATION_RELATIONSHIP_TYPES = {
  archimate: [association, serving, assignment, realisation, composition, ...]
  uml:       [inheritance, realisation, composition, aggregation, association, dependency, ...]
  wireframe: [contains, navigates-to, binds-to]
}
```

When creating a relationship, only types valid for the view's notation are offered. Element creation is similarly filtered — a UML class diagram palette only shows UML element types.

---

## 5. Sublayer Configuration (R-SUB-01 – R-SUB-05)

Layer and sublayer structure is defined in a configuration file (YAML or equivalent). The configuration is the **single source of truth** — the renderer never hardcodes layer structure.

### 5.1 Configuration Structure

```
layers:
  motivation:
    label: "Motivation"
    colour_key: "motivation"
    sublayers:
      - name: stakeholders
        element_types: [stakeholder]
      - name: drivers_goals
        element_types: [driver, goal, outcome, meaning, value]
      - name: principles
        element_types: [principle]
      - name: constraints_requirements
        element_types: [assessment, requirement, constraint]
  strategy:
    ...
```

### 5.2 Layer Ordering

A canonical sort order assigns each layer a numeric position. Lower number = higher in the visual stack:

| Order | Layer |
|-------|-------|
| 0 | Motivation |
| 1 | Strategy |
| 2 | Business |
| 4 | Application |
| 5 | Data |
| 6 | Technology |
| 7 | Implementation |

Within each layer, elements are further sorted by sublayer (each sublayer has an assigned sort order per element type). This ordering drives both the auto-layout vertical banding and the palette/tree display order.

### 5.3 Design Principle

If the configuration defines 7 layers, the renderer shows 7 bands. If someone adds an 8th layer, the renderer picks it up automatically. No code changes required.

---

## 6. Layout System (R-VIEW-07)

### 6.1 Hierarchical Layout

The primary layout algorithm uses a hierarchical (layered) graph layout engine. Elements are grouped by their ArchiMate layer, and the engine computes positions respecting:

- Layer grouping (elements in the same layer are placed together)
- Edge minimisation (fewer edge crossings)
- Configurable spacing (30px node-to-node, 60px between layers)
- Direction: top-to-bottom (motivation at top, technology at bottom)

Configuration:

```
algorithm: layered
direction: DOWN
node-node spacing: 30px
layer spacing: 60px
hierarchy handling: INCLUDE_CHILDREN
```

### 6.2 Grid Fallback

If the hierarchical layout fails (disconnected graphs, layout engine errors), a simple grid fallback is used:

- Elements grouped by layer in canonical order
- Within each layer: 6 elements per row, 120px column width, 40px row height
- 80px gap between layer groups

### 6.3 Batch Import Layout

When elements are created via batch import with a view, a grid layout is applied:

- 8 columns, 210px column width, 80px row height, 30px padding
- Elements grouped by layer in canonical order
- 60px gap between layer groups

### 6.4 Layer Band System

ArchiMate views group elements into **layer bands** — visual containers that envelope all elements belonging to a layer. This is a key visual concept that distinguishes an architecture modelling tool from a general-purpose diagramming tool.

**Band computation:**

1. For each ArchiMate layer represented in the current view, compute the bounding box of all child elements
2. Expand the bounding box by padding (top: 35px for label, left/right/bottom: 20px)
3. Create a visual band node positioned at the bounding box origin with the computed width/height
4. Parent all elements in that layer to the band node

**Band properties:**
- Bands are labelled with the layer name (e.g. "Application", "Technology")
- Bands are styled with the layer's theme colour at low opacity (background fill)
- Bands are selectable and draggable — moving a band moves all its children
- Bands auto-resize when children are moved (recomputed after every drag-stop)

**Coordinate systems:**

Two coordinate systems coexist:
- **Absolute positions:** stored in view_elements (x, y). Used for persistence and cross-view consistency.
- **Band-relative positions:** used at render time. When an element is parented to a layer band, its render position is relative to the band's origin.

On view load, absolute positions are converted to band-relative. On drag-stop, band-relative positions are resolved back to absolute for persistence.

**Non-ArchiMate elements** (UML, wireframe) are NOT parented to layer bands — they float freely on the canvas. Only ArchiMate elements participate in the banding system.

### 6.5 Auto-Layout Triggers

Auto-layout runs when:
- A new view is created
- Elements are added to a view via batch import
- The user explicitly requests "Re-layout" (positions that have been manually adjusted are preserved unless overridden)

### 6.6 Diagram-Type Layout Dispatch

The auto-layout system selects its algorithm based on the current view's viewpoint type:

| Viewpoint | Algorithm | Direction | Key Constraint |
|-----------|-----------|-----------|----------------|
| `layered`, `domain_slice`, `infrastructure`, `information` | Hierarchical | Down | Layer band grouping, sublayer ordering |
| `uml_class` | Hierarchical | Up | Inheritance edges drive hierarchy |
| `uml_component` | Hierarchical | Right | Provider→consumer dependency flow |
| `uml_usecase` | Custom UCD layout | N/A | Actors outside system boundary, use cases inside |
| `uml_activity` | Hierarchical | Down | Fork/join create parallel tracks |
| `uml_sequence` | Custom sequential | N/A | X = participant order, Y = message sequence |
| `uml_state` | Hierarchical | Right | Composite states as containers |
| `wireframe` | Manual containment | N/A | parent_id nesting, no graph layout |
| `custom` | Hierarchical | Down | Default fallback |

#### Hierarchical Layout Parameters by Type

The hierarchical layout engine accepts per-diagram-type configuration:

| Parameter | Class | Component | Activity | State | ArchiMate |
|-----------|-------|-----------|----------|-------|-----------|
| Direction | UP | RIGHT | DOWN | RIGHT | DOWN |
| Node spacing | 40px | 60px | 30px | 40px | 30px |
| Layer spacing | 80px | 80px | 50px | 60px | 60px |
| Edge priority | Inheritance high | Dependency high | Control flow high | Transition high | All equal |

#### Use Case Diagram Layout

A dedicated algorithm partitions elements into actors and use cases:

1. Separate actors (outside boundary) from use cases (inside boundary)
2. Compute boundary dimensions from use case count (1 or 2 columns)
3. Place use cases vertically inside the boundary with even spacing
4. Assign actors to left or right based on connectivity patterns (fewer edge crossings)
5. Centre actors vertically relative to the boundary
6. Generate a system boundary background node

#### Sequence Diagram Layout

A time-ordered slot algorithm (not a graph layout):

1. Order lifelines left-to-right by participant sequence
2. Space lifelines evenly (160–200px apart)
3. For each message in sequence order: Y = messageIndex × messageSpacing
4. Size activation bars from first incoming message to last outgoing
5. Size fragments from bounding box of enclosed messages

---

## 7. Edge Routing (R-RND-11, R-RND-12)

### 7.1 Connection Port System

Elements expose discrete **connection ports** — anchor points evenly spaced (~10px apart) around the element perimeter. Each face (top, right, bottom, left) generates ports proportional to its length.

**Port assignment algorithm:**

1. Pre-generate ports for every element in the view
2. Sort edges by effective distance (axis-dominant edges get priority — they are more constrained in port selection)
3. For each edge, determine the preferred face based on relative direction (edge going right prefers right-face source ports, left-face target ports)
4. Pick the best available port: nearest unclaimed port on the preferred face, with a directional bonus (40px score reduction) for ports on the correct face
5. Mark assigned ports as claimed — no two edges share the same port

**Direction awareness:** An edge primarily going rightward gets its source port from the right face and target port from the left face. This prevents the common failure where a long horizontal edge gets a bottom port because shorter vertical edges claimed the right-side ports first.

### 7.2 A* Orthogonal Routing

Edges route around node bounding boxes using A* search on a sparse orthogonal grid.

**Grid construction:**

1. Expand every element bounding box by a 12px margin
2. Collect all boundary x and y coordinates + all edge endpoint coordinates
3. Sort into a sparse grid (only coordinates where corridors exist)

**A* search:**

- **Nodes:** grid intersection points (indexed by integer keys: `xi * stride + yi`)
- **Neighbours:** four cardinal directions (up, down, left, right)
- **Cost function:** segment length + bend penalty (120 per direction change) + sharing penalty (60 per step through an already-routed corridor)
- **Heuristic:** Manhattan distance to target
- **Constraint:** first step must leave the source port's face; last step must enter the target port's face
- **Open set:** binary min-heap for O(log N) operations
- **Obstacle check:** spatial hash (100px cells) for O(1) average segment-clear tests

**Performance optimisations:**

- Integer node keys eliminate string allocation per grid node
- Index maps (coordinate → grid index) built once per routing pass, shared across all edges
- Pair-specific spatial hash caches (source+target excluded from obstacles) reused for edges between the same pair
- Tube index: previously routed corridors stored as `Map<corridorKey, ranges[]>` for O(corridorEdges) sharing-cost lookup

**Post-processing:**

1. **Collinear simplification:** remove redundant waypoints where three consecutive points are on the same line
2. **Rounded corners:** quadratic Bezier curves (4px radius) at each bend for visual polish
3. **Parallel nudging:** edges sharing the same corridor are offset by 5px so they remain visually distinct

### 7.3 Routing Order

Edges are routed shortest-first with deterministic tie-breaking by ID. Shorter edges have fewer routing alternatives and should claim clean corridors first. Longer edges find paths around them. The sharing penalty discourages subsequent edges from piling into the same corridor.

---

## 8. Command Pattern — Undo/Redo (R-INT-01)

### 8.1 Command Interface

```
Command {
  description: string
  execute(): async
  undo(): async
}
```

Every undoable operation is wrapped in a Command with paired execute/undo methods. Commands are async because they involve API calls to persist changes.

### 8.2 Stack Behaviour

- **Past stack:** commands that have been executed (most recent at end)
- **Future stack:** commands that have been undone (most recent at start)
- **Run(command):** execute the command, push onto past, clear future
- **Undo:** pop from past, call undo(), push onto future
- **Redo:** pop from future, call execute(), push onto past

### 8.3 Covered Operations

| Operation | Execute | Undo |
|-----------|---------|------|
| Create element | POST element to API, add to view | DELETE element via API |
| Delete element | DELETE via API | Re-create with same ID and data |
| Move element | Save new position to view_elements | Restore previous position |
| Rename element | PUT new name | PUT old name |
| Create relationship | POST relationship to API | DELETE relationship |
| Delete relationship | DELETE via API | Re-create with same data |

### 8.4 Move Coalescing

Continuous drag operations (many small position updates) should coalesce into a single undo step. The implementation captures the starting position on drag-start and the final position on drag-end, producing one move command per drag gesture.

---

## 9. View Engine (R-VIEW-01 – R-VIEW-08)

### 9.1 View Switching

1. User selects a view from the view list
2. Load the view definition (filter criteria, viewpoint type, render mode)
3. Load associated view_elements (positions) and view_relationships (route points)
4. Merge with the model data to produce positioned shape descriptors
5. Pass to the renderer

### 9.2 Filtering and Projection

Views filter the model by:
- **Domain:** scope to a single organisational domain
- **Layers:** include only specific ArchiMate layers (JSON array)
- **Specialisations:** include only specific specialisation subtypes

Elements not matching the filter are excluded from the view entirely.

### 9.3 Position Persistence

Positions are stored per-element-per-view in the view_elements table. When an element is dragged to a new position, the new coordinates are saved. Views are independent — moving an element in one view does not affect its position in another.

### 9.4 Error Resilience in Position Saving

Position saves use a retry strategy: if the first save fails (network error, database lock), retry once after 1 second. If the retry also fails, surface the error to the user but do not lose the local position state.

### 9.5 Viewpoint Types

| Viewpoint | Notation | Description |
|-----------|----------|-------------|
| layered | ArchiMate | All elements by layer with sublayer ordering |
| knowledge_cognition | ArchiMate | AI/Knowledge specialised elements, domain-grouped |
| domain_slice | ArchiMate | One domain's complete vertical stack |
| governance_matrix | ArchiMate | Agents x grounding x governance x quality (table/grid) |
| process_detail | ArchiMate | Drill-down of a business-process into steps |
| infrastructure | ArchiMate | Technology + Data layers |
| information | ArchiMate | Data Objects and Artefacts with relationships |
| application_landscape | ArchiMate | Applications in grid/matrix by domain and tier |
| uml_class | UML | Class diagram |
| uml_component | UML | Component diagram |
| uml_activity | UML | Activity diagram |
| uml_usecase | UML | Use case diagram |
| uml_sequence | UML | Sequence diagram |
| wireframe | Wireframe | Lo-fi UI wireframe with page flow |
| custom | Any | User-defined filter |

---

## 10. Data Overlays (R-DATA-01 – R-DATA-04)

Data overlays modify element rendering based on model properties without changing the underlying data.

### 10.1 Colour-by-Property

Assigns element fill/border colour based on a categorical property. Supported properties:
- **status:** active (default), draft, superseded, deprecated, retired
- **domain:** each domain gets a distinct colour
- **maturity:** initial → defined → managed → optimised

Only one colour-by-property can be active at a time. Activating colour-by-property clears heatmap mode, and vice versa.

### 10.2 Heatmap Mode

Maps a numeric property (0.0–1.0) to a continuous colour gradient:
- 0.0 = blue (cool)
- 0.5 = green (mid)
- 1.0 = red (hot)

Applicable to: `confidence`, `priority`, or any numeric custom property.

The interpolation function:
```
heatmapColour(t):
  if t < 0.5:  blue(30,100,200) → green(34,197,94)
  if t >= 0.5: green(34,197,94) → red(220,60,50)
```

### 10.3 Status Badges

Optional small text/icon badges showing lifecycle state (draft, active, deprecated, retired). Toggled independently of colour-by-property.

### 10.4 Selective Field Display

Up to 2 property values displayed as small text below the element name on the canvas. This is NOT full field lists — it is for at-a-glance context (e.g. domain name, status). Maximum of 2 fields to maintain compact shapes.

---

## 11. Relationship Validation — Metamodel (R-MOD-05, R-META-01 – R-META-04)

### 11.1 Valid Relationships Matrix

The `valid_relationships` table contains ~3000 source_type → target_type → relationship_type rules, populated from the ArchiMate specification. This is the authoritative validation source.

### 11.2 Magic Connector Pattern (R-INT-05)

When a user drags to create a connection:

1. Query `valid_relationships` for all valid relationship types given source and target element types
2. If no valid types: show "Not Allowed" cursor, prevent connection
3. If exactly one valid type: create the relationship directly
4. If multiple valid types: show popup menu with valid options

For UML and wireframe notations, validation rules are stored alongside ArchiMate rules, discriminated by notation where necessary.

### 11.3 Junction Support (R-META-03)

AND/OR junctions enforce type consistency:
1. Check existing relationships on the junction
2. If the junction already has relationships: the new relationship must match the existing type
3. If the junction is empty: any valid relationship type is allowed

---

## 12. Error Resilience

### 12.1 Error Boundary Pattern

The application wraps major subsystems in error boundaries that catch rendering failures and display fallback UI rather than crashing the entire application. Subsystems isolated:
- Canvas/renderer
- Detail panel
- Model tree
- Import/export operations

### 12.2 Optimistic Updates with Rollback

For CRUD operations, the UI updates optimistically (immediate visual feedback) and rolls back if the server request fails. The pattern:

1. Capture previous state
2. Apply optimistic update to local state and in-memory graph
3. Send API request
4. On success: apply server response (may differ slightly from optimistic state)
5. On failure: restore previous state, surface error

### 12.3 Position Save Retry

Position saves retry once after a 1-second delay. If both attempts fail, the error is logged and surfaced to the user, but the local position state is preserved so work is not lost.

---

## 13. API Design

HTTP server serving JSON. All routes accept and return JSON unless otherwise noted.

### 13.1 Model CRUD

```
GET    /api/domains                                — list all domains
POST   /api/domains                                — create domain

GET    /api/elements?layer=&domain=&specialisation= — list elements with optional filters
POST   /api/elements                               — create element
PUT    /api/elements/:id                           — update element
DELETE /api/elements/:id                           — delete element (cascades to relationships)

GET    /api/relationships?source=&target=           — list relationships with optional filters
POST   /api/relationships                          — create relationship
PUT    /api/relationships/:id                      — update relationship
DELETE /api/relationships/:id                      — delete relationship
```

### 13.2 View Management

```
GET    /api/views                                  — list all views
POST   /api/views                                  — create view
GET    /api/views/:id                              — get view with elements and relationships
PUT    /api/views/:id/elements                     — batch upsert element positions
```

### 13.3 Configuration and Metadata

```
GET    /api/sublayer-config                        — sublayer configuration (from YAML file)
GET    /api/valid-relationships                    — metamodel validation rules
```

### 13.4 Import/Export

```
POST   /api/import/archimate-xml                   — ArchiMate Open Exchange Format import (R-IO-01)
GET    /api/export/archimate-xml                   — ArchiMate XML export (R-IO-01)

POST   /api/import/csv                             — 3-file CSV import: elements, relations, properties (R-IO-02)
GET    /api/export/csv                             — CSV export in Archi-compatible format (R-IO-02)

POST   /api/import/model-batch                     — Batch JSON import — primary agent pathway (R-IO-07)
GET    /api/export/model-batch?view=:id            — Batch JSON export for round-trip (R-IO-08)

GET    /api/export/json                            — Full model JSON backup (R-IO-03)
```

---

## 14. Import/Export Pipelines

### 14.1 ArchiMate XML (R-IO-01)

**Import:** Parse ArchiMate Open Exchange Format XML (3.2). Extract `<element>` and `<relationship>` nodes. Map `xsi:type` values (e.g. `ApplicationComponent`) to internal type strings (e.g. `application-component`) via a bidirectional type map. Derive layer from type. Upsert into database within a transaction.

**Export:** Query all elements and relationships. Map internal types back to ArchiMate XML types. Generate compliant XML with `<model>`, `<elements>`, and `<relationships>` sections. Return as `application/xml`.

### 14.2 CSV (R-IO-02)

Three-file format compatible with Archi's CSV export:

- **elements.csv:** ID, Type, Name, Documentation, Specialization
- **relations.csv:** ID, Type, Name, Documentation, Source, Target
- **properties.csv:** ID, Key, Value

Import parses CSV, maps Archi-style PascalCase type names to internal kebab-case types, and upserts into the database. Properties CSV entries are grouped by element ID and stored as JSON in the `properties` column.

### 14.3 Batch JSON — Agent Pathway (R-BATCH-01 – R-BATCH-08)

The primary pathway for programmatic model creation. Accepts a single JSON payload:

```
BatchImportPayload {
  notation?: string                    — archimate | uml | wireframe
  elements?: BatchElement[]
  relationships?: BatchRelationship[]
  view?: { name, viewpoint, render_mode }
}

BatchElement {
  id?: string                          — auto-generated if omitted
  name: string
  archimate_type: string               — notation-specific type
  layer: string
  specialisation?: string
  children?: BatchElement[]            — nested containment
}

BatchRelationship {
  id?: string
  archimate_type: string
  source_id?: string                   — by ID
  source_name?: string                 — or by name (resolved to ID)
  target_id?: string
  target_name?: string
  label?: string
}
```

**Processing pipeline:**

1. Validate payload against schema
2. Process elements recursively (children get `parent_id` set to enclosing element)
3. Resolve name references to IDs via a name→ID map built during element insertion
4. Validate relationships against metamodel — invalid relationships produce warnings but do not block the batch
5. If a view is provided, create view and assign grid-layout positions to all elements
6. Return counts and view ID

**Round-trip:** `GET /api/export/model-batch?view=:id` returns elements, relationships, and view data in the same JSON format, enabling agent workflows: generate → user tweaks → agent reads back → agent iterates.

**Upsert semantics:** If an element/relationship/view with the same ID already exists, it is updated. This enables idempotent batch operations.

### 14.4 PFC Integration

PFC (Process Flow Canvas) data enters via a YAML ingestion pipeline:

1. Parse YAML from PFC export
2. Map PFC concern tables to elements with appropriate ArchiMate types
3. Set `source_session_id` for provenance tracking
4. Preserve `confidence` scores
5. Upsert into database, rebuild in-memory graph

---

## 15. State Management

The application maintains 7 logical state domains. Each domain manages a distinct concern and is independently addressable.

| Domain | Manages | Key State |
|--------|---------|-----------|
| **Model** | Elements, relationships, domains, sublayer config, valid relationships, in-memory graph | Loaded from API on startup. Optimistic updates with rollback. |
| **View** | Current view, view element positions, view relationships, view list | Position saves with retry. View switching loads new data. |
| **Interaction** | Selected element, highlighted nodes/edges, context menu | Selection is single-element. Highlight mode is opt-in. |
| **Theme** | Dark/light mode | Toggle with persistence to preferences table. |
| **Panel Layout** | Left/right/bottom panel open/closed state, panel heights | UI layout state, not persisted to database. |
| **Layer Visibility** | Hidden layers, locked layers, per-layer opacity, relationship visibility | Sets of layer identifiers. Opacity as 0.0–1.0 per layer. |
| **Data Overlays** | Colour-by-property, heatmap property, status badges, display fields | Mutually exclusive: colour-by-property clears heatmap and vice versa. Display fields capped at 2. |

### 15.1 Model State Load Deduplication

On startup, model loading is deduplicated — if multiple components request data simultaneously, only one API call set is made. The loading promise is shared and reused.

### 15.2 Graph Consistency

The in-memory graph and the element/relationship arrays are kept in sync:
- **Create:** add node/edge to graph, append to array
- **Update:** replace node attributes in graph, replace in array
- **Delete:** drop node from graph (also drops attached edges), filter from arrays

---

## 16. Relationship Highlighting

Highlighting is **opt-in via context menu**, not triggered on regular click (R-RND-07, R-RND-08).

### 16.1 Flow

1. Right-click element → context menu → "Show Incoming" or "Show Outgoing"
2. Compute directed neighbours via in-memory graph traversal
3. Collect connected element IDs into `highlightedNodes` set
4. Collect edge IDs into `highlightedEdges` set
5. Render highlighted elements at full opacity + highlight stroke + glow
6. Render highlighted edges at 80–90% opacity + highlight colour + label
7. Dim everything else (elements 7–12% opacity, edges 2–4%)
8. Click background to exit highlight mode

### 16.2 Selection vs Highlighting

- **Click:** selects element, opens detail panel. No dimming.
- **Right-click → Show Incoming/Outgoing:** enters highlight mode with dimming.
- These are independent — selection and highlighting can coexist.

---

## 17. Zoom Tiers (R-RND-05)

Progressive disclosure based on zoom level:

| Tier | Zoom Range | Canvas Shows |
|------|-----------|-------------|
| Birds Eye | 15–32% | Coloured dots. No labels. |
| Context | 32–55% | Element labels. Shape outlines. |
| Structure | 55–90% | Archetype icons inside shapes. Specialisation badges. |
| Detail | 90–150% | Full notation. All edge labels. |
| Full | 150%+ | Maximum detail. |

Fields/schema NEVER appear on canvas at any zoom level. That is the detail panel's responsibility.

---

## 18. Model Tree (R-TREE-01 – R-TREE-08)

The model tree provides a navigable hierarchy mirroring Archi's folder structure:

```
Model
├── Motivation/
├── Strategy/
├── Business/
├── Application/
├── Technology/
├── Implementation/
├── Other/
├── Relations/
└── Views/
```

### 18.1 Tree–Canvas Interaction

- **Drag from tree to canvas:** adds existing element to current view (creates view_elements record at drop position)
- **Drag from canvas to tree folder:** updates element's folder classification
- **Click in tree:** selects on canvas (if element is in current view) and vice versa
- **Orphan detection:** elements not in any view are rendered in italic
- **Search/filter:** by name, type, or property value

---

## 19. Spatial 3D Projection (Experimental)

### 19.1 Coordinate System

Elements have world-space positions:
- `wx`: left-right (assigned by layout within sublayer)
- `wy`: vertical (layer index x layer spacing)
- `wz`: depth (sublayer offset + jitter for visual separation)

### 19.2 Projection Function

```
project3D(wx, wy, wz, rotY, rotX, centreX, centreY) → {sx, sy, scale, z}
  // Y rotation (turntable)
  x1 = wx * cos(rotY) - wz * sin(rotY)
  z1 = wx * sin(rotY) + wz * cos(rotY)
  // X tilt
  y2 = wy * cos(rotX) - z1 * sin(rotX)
  z2 = wy * sin(rotX) + z1 * cos(rotX)
  // Perspective division
  P = 1200
  s = P / (P + z2)
  return {sx: centreX + x1 * s, sy: centreY + y2 * s, scale: s, z: z2}
```

### 19.3 Interaction

| Input | Action |
|-------|--------|
| Left-drag | Pan |
| Shift+drag horizontal | Rotate Y (360°) |
| Shift+drag vertical | Tilt X (clamped ±18°) |
| Scroll | Zoom (multiplicative) |
| Click entity | Select → open detail panel |
| Right-click entity | Context menu → highlight mode |
| Click background | Deselect, exit highlight mode |

---

## 20. Wireframe Rendering (R-WF-01 – R-WF-11)

Wireframes use a **nested containment** layout rather than graph-based layout:

- **Container elements** (page, section, card, modal, form) have children positioned spatially inside their bounds
- **Nesting** is via `parent_id` on the elements table
- **Layout** is constraint-based: children flow top-to-bottom within their parent, respecting padding and spacing
- **Style** is intentionally lo-fi: greyscale palette, thin borders, no colour fills. Wireframes should look unfinished
- **Page flow** arrows (`wf-navigates-to`) connect pages/buttons to target pages, rendered as dashed arrows

---

## 21. Notation Boundary Enforcement

Views are scoped to a single notation. A UML class diagram view should not contain ArchiMate elements, and an ArchiMate layered view should not contain wireframe widgets.

### 21.1 Design Principle

The viewpoint type determines the notation:
- `layered`, `knowledge_cognition`, `domain_slice`, `governance_matrix`, `process_detail`, `infrastructure`, `information`, `application_landscape` → ArchiMate
- `uml_class`, `uml_component`, `uml_activity`, `uml_usecase`, `uml_sequence` → UML
- `wireframe` → Wireframe
- `custom` → Any (no restriction)

### 21.2 Enforcement Points

1. **Palette filtering:** Only types matching the view's notation appear in the element palette
2. **Relationship type picker:** Only relationship types for the view's notation are offered
3. **Drag-to-add validation:** When an element is dragged from the model tree to the canvas, its notation must match the view's notation (or be rejected with a user-visible message)
4. **Batch import:** The `notation` field in the batch payload must match the target view's viewpoint type

### 21.3 Cross-Notation References

Elements from different notations can reference each other through the model (e.g. an ArchiMate `application-component` links to a UML class diagram view for detailed design). This is a view-level navigation, not a same-canvas mixing of notations.

---

## 22. Canvas Alignment and Snap System (R-INT-06, R-INT-07, R-INT-08)

### 22.1 Snap to Grid

Elements snap to a configurable grid (default 10×10px). The grid is visible as a dot pattern on the canvas background.

### 22.2 Alignment Guides

During drag, orange alignment guides appear when the dragged element's edges or centre aligns with other elements:
- **Vertical guides:** left edge, right edge, or centre X aligns with another element's corresponding edge/centre
- **Horizontal guides:** top edge, bottom edge, or centre Y aligns
- **Threshold:** 5px proximity triggers the guide

Guides are rendered as full-canvas-width dashed lines in the viewport coordinate space.

### 22.3 Alignment Tools

When 2+ elements are selected, an alignment toolbar appears:
- Align left edges, centres horizontally, right edges
- Align top edges, centres vertically, bottom edges
- Distribute evenly horizontally (3+ elements)
- Distribute evenly vertically (3+ elements)

All alignment operations save the resulting positions to the database.

---

## 23. Layer Visibility and Filtering (R-LAY-01 – R-LAY-04)

### 23.1 State

Three independent controls per layer:
- **Visibility:** show/hide (binary toggle). Hidden elements and their connected edges are removed from the render.
- **Lock:** prevent editing (selection, dragging). Locked elements are visible but non-interactive.
- **Opacity:** 0.0–1.0 continuous slider. Faded layers provide visual context without drawing focus.

### 23.2 Relationship Layer

Edges (relationships) can be toggled independently of element visibility. This allows viewing element layout without the visual noise of connections.

### 23.3 Filtering Pipeline

Applied after node/edge construction but before render:
1. Hide nodes in hidden layers (set `hidden: true`)
2. Hide layer band nodes for hidden layers
3. Disable drag/select on nodes in locked layers
4. Apply opacity to nodes in dimmed layers
5. Hide edges where either source or target node is hidden
6. Hide all edges if relationship visibility is off

---

## 24. Notation-Specific Property Schemas

Each notation defines structured property schemas for its element types. Properties are stored as JSON and validated against type-specific schemas.

| Element Type | Properties |
|-------------|------------|
| `uml-class`, `uml-abstract-class`, `uml-interface` | `{ attributes: [{name, type, visibility}], methods: [{name, type, visibility}], isAbstract? }` |
| `uml-enum` | `{ literals: [string] }` |
| `uml-fragment` | `{ operator: alt|opt|loop|..., guard? }` |
| `wf-page` | `{ url?, pageWidth? }` |
| `wf-table` | `{ columns: [string], rows?, sampleData? }` |
| `wf-input`, `wf-textarea` | `{ placeholder?, inputType? }` |
| `wf-select` | `{ options?: [string], multiple? }` |

A validation function checks properties against the type-specific schema. If no typed schema exists for a given type, any JSON object is accepted.

---

## 25. Element-to-Visual Transform Pipeline

The transformation from model data to rendered visuals follows a deterministic pipeline:

```
1. Model Load
   elements[] + relationships[] from API
   ↓
2. View Filtering
   Filter elements by view membership (view_elements table)
   Filter relationships where both endpoints are in the view
   ↓
3. Node Construction
   For each element:
     a. Look up notation (archimate/uml/wireframe) from type prefix
     b. Look up shape definition from registry
     c. Determine node type (dispatches to correct shape renderer)
     d. Compute dimensions (notation-aware defaults, or saved width/height)
     e. Determine position (saved, or grid-layout if no saved position)
     f. Build notation-specific data payload (ArchiMate: layer/colours/badge;
        UML: attributes/methods/stereotype; Wireframe: control type/options)
     g. Apply data overlay transforms (colour override, status badge, display fields)
   ↓
4. Layer Band Construction (ArchiMate only)
   Group ArchiMate elements by layer → compute bounding boxes → create band nodes
   Convert element positions from absolute to band-relative
   ↓
5. Edge Construction
   For each relationship:
     a. Look up edge type from relationship type
     b. Compute handle sides (angle-based quadrant selection using source/target positions)
     c. Distribute handles across face ports (middle first, then spread outward)
     d. Build edge data with relationship type, label, theme
   ↓
6. Orthogonal Route Computation (memoised)
   A* routing for edges without manual waypoints
   Results cached by node positions + edge topology
   ↓
7. Display Filtering
   Apply layer visibility (hide/lock/opacity)
   Apply relationship visibility toggle
   Apply connected-edge highlighting for selected nodes
   ↓
8. Render
   Canvas receives final node[] and edge[] arrays
```

This pipeline re-runs partially on different triggers:
- **View switch:** full pipeline (steps 1–8)
- **Element create/delete/rename:** steps 3–8 (position-preserving rebuild)
- **Theme/overlay change:** steps 3, 5, 7–8 (re-colour, don't re-layout)
- **Drag/move:** only step 7–8 (nodes already positioned, just re-filter)
- **Selection change:** only step 7–8 (edge highlighting update)

---

## 26. Self-Documentation Pattern

The tool models its own architecture using its own UML diagramming capabilities. The seed data includes:

- **System Use Cases** (UML use case diagram): Architect and Viewer actors interacting with arch-vis capabilities
- **System Components** (UML component diagram): Frontend modules, state stores, server, persistence layer
- **Request Processing Flow** (UML activity diagram): Request validation, fork/join, error handling

This self-referential modelling serves three purposes:
1. **Validation:** exercising the UML notation system with a non-trivial real model
2. **Documentation:** the running application is its own architecture documentation
3. **Regression detection:** changes that break UML rendering are immediately visible in the seed data views

---

## 27. Planned Capability Extensions (from Parity Audit §21)

The following architectural decisions apply to features identified in the functional parity audit (REQUIREMENTS.md §21) that are not yet implemented.

### 27.1 Data Modelling Notation (§21.8)

A fourth notation family alongside ArchiMate, UML, and Wireframe. Element types prefixed `dm-` (e.g. `dm-entity`, `dm-table`, `dm-column`). Three viewpoint levels:

- **Conceptual:** entities + named relationships (no attributes)
- **Logical:** entities with typed attributes, relationships with cardinality (ERD)
- **Physical:** tables, columns, keys, indexes, data types

Node renderers: `DmEntityNode` (logical), `DmTableNode` (physical — column list with PK/FK icons). Edge markers: crow's foot notation for cardinality. DDL generation is a server-side export route.

### 27.2 Per-Element Appearance Override (§21.4 #4.5)

`view_elements.style_overrides` JSON column already exists. Schema: `{ fill?: string, stroke?: string, fontSize?: number, fontWeight?: string, borderStyle?: string }`. Node renderers merge style_overrides on top of theme defaults. No new tables needed — just UI to edit and renderers to consume.

### 27.3 Copy/Paste on Canvas (§21.3 #3.10)

Clipboard holds serialised node data (element IDs + relative positions). Paste duplicates elements in the model (new UUIDs) and adds them to the current view with offset positions. Relationships between copied elements are also duplicated. Uses the undo/redo command pattern.

### 27.4 Notes, Groups, and Legends (§21.4 #4.7–4.9)

- **Notes:** `annotation` element type with a sticky-note renderer. No relationships — purely visual. Stored as elements with `archimate_type: 'annotation'`.
- **Groups:** `visual-group` element type with a transparent container renderer. Children nested via `parent_id`. Not an ArchiMate Grouping element — purely visual.
- **Legend:** auto-generated from current view's element types and colours. Rendered as a fixed-position overlay, not a model element.

### 27.5 Delete from View vs Delete from Model (§21.3 #3.11)

Two distinct actions in the context menu and keyboard shortcuts:
- **Remove from view** (default Delete key): removes `view_elements` row only. Element stays in model.
- **Delete from model** (Shift+Delete or context menu): deletes element from `elements` table (cascading to relationships and all view_elements).
Both are undoable via the command pattern.

### 27.6 Z-Order (§21.3 #3.12)

Add `z_index INTEGER DEFAULT 0` to `view_elements`. Context menu actions: Bring to Front, Send to Back, Bring Forward, Send Backward. xyflow renders nodes in z_index order.

---

## 28. Embeddable Library Architecture (R-LIB-01 – R-2WAY-03)

### 28.1 Package Structure

arch-vis is library-first: designed to be embedded into host applications, with standalone mode as one consumer of the library.

```
arch-vis/
  packages/
    core/          # Model, schema, CRUD operations (pure TS, no React)
                   #   - SQLite operations (or pluggable backend)
                   #   - Zod schemas, type definitions
                   #   - Programmatic API (direct function calls)
                   #   - Graph model (Graphology)
    canvas/        # XYFlowCanvas, notation renderers, layout (React)
                   #   - Shape registry, edge styles, colours
                   #   - Node/edge components
                   #   - Layout engines (ELK, dagre)
                   #   - Edge routing
    shell/         # Shell variants (React)
                   #   - FullShell: menu bar, model tree, detail panel, all toolbars
                   #   - WorkbenchShell: compact palette, minimal chrome
                   #   - Shared components: palette, minimap, controls
    standalone/    # Entry point: Express + FullShell + core
                   #   - Express routes (thin wrappers over core functions)
                   #   - Vite dev server
                   #   - SQLite database management
```

### 28.2 Dependency Direction

```
standalone → shell → canvas → core
                              ↑
                    host-app ──┘  (imports core + canvas directly)
```

- `core` has zero React dependencies. Pure TypeScript.
- `canvas` depends on `core` (types, notation data) and React/xyflow.
- `shell` depends on `canvas` (composes the canvas with panels/menus).
- `standalone` depends on everything — it's the default composition.
- Host applications import `core` and `canvas` directly, optionally `shell` components.

### 28.3 Programmatic API (R-LIB-04)

The `core` package exposes functions directly — no HTTP required:

```typescript
// Host app or agent calls these directly
import {
  createElement, updateElement, deleteElement,
  createRelationship, fetchElements,
  importModelBatch, exportModelBatch,
} from '@arch-vis/core';

// Same functions, wrapped in Express routes for standalone mode
app.post('/api/elements', (req, res) => {
  const el = await createElement(req.body);
  res.json(el);
});
```

The Express API in standalone mode is a ~50-line routing file that delegates to `core` functions. Agents and host apps bypass HTTP entirely.

### 28.4 Canvas Mode Switching (R-MODE-01 – R-MODE-06)

The `XYFlowCanvas` component is mode-agnostic — it renders nodes, edges, handles interaction. The shell controls what surrounds it.

```
CanvasMode = 'full' | 'workbench'
```

**WorkbenchShell** layout (embedded in host chat workbench):

```
┌──────────────────────────────────────┐
│ XYFlowCanvas (fills available space) │
│  ┌────────┐                          │
│  │Compact │    [fit] [zoom] [minimap]│
│  │Palette │                          │
│  └────────┘                          │
└──────────────────────────────────────┘
```

**FullShell** layout (expanded or standalone):

```
┌────────────────────────────────────────────────┐
│ Menu Bar                                        │
├──────┬──────────────────────────┬──────────────┤
│Model │ XYFlowCanvas             │ Detail Panel │
│Tree  │                          │              │
│      │                          │              │
├──────┴──────────────────────────┴──────────────┤
│ Palette │ Alignment │ Layer Visibility │ Status │
└────────────────────────────────────────────────┘
```

**Shell expansion** is a layout swap — same React app, same state, same store:

1. User clicks "Full Modeller" in workbench shell
2. `WorkbenchShell` unmounts, `FullShell` mounts
3. Canvas component is preserved (or reconstructed from same store state)
4. Host chat panel collapses to a floating overlay or sidebar
5. "Back to Workbench" reverses the transition

No window change. No context loss. The AI agent session is still alive because the host app never navigated away.

### 28.5 Provenance Provider Interface (R-HOST-03, R-PROV-08)

arch-vis defines a contract; the host application supplies the implementation.

```typescript
interface ProvenanceProvider {
  /** Resolve sessions that created or modified this element. */
  getElementProvenance(elementId: string): Promise<ProvenanceEntry[]>;

  /** Build a URL to view the full session in the host application. */
  getSessionUrl(sessionId: string): string;

  /** Build a URL to open the host chat with this element as context (interrogate). */
  getInterrogateUrl(sessionId: string, elementId: string): string;
}

interface ProvenanceEntry {
  session_id: string;
  agent_id: string | null;
  agent_name: string | null;
  summary: string;
  created_at: string;
  confidence: number | null;
  decisions: string[];   // key decisions from this session
}
```

The provider is passed as a prop to the shell or canvas. When null (standalone mode), the provenance tab shows only the local fields (`created_by`, `source_session_id`, `confidence`) without session drill-through.

### 28.6 Provenance Popover Design (R-PPOV-01 – R-PPOV-06)

**Trigger:** A small provenance indicator (chain-link icon or AI badge) renders on nodes that have `source_session_id` set. Position: bottom-left corner of the node shape, outside the main label area.

**Popover content** (fetched lazily on click via `ProvenanceProvider.getElementProvenance`):

```
┌─────────────────────────────────────────┐
│ Created by: Agent Helix                  │
│ Date: 2026-03-12  Confidence: 0.85       │
│ Status: Provisional ⚠                    │
├─────────────────────────────────────────┤
│ Related Sessions:                        │
│                                          │
│ 📋 Payment Service Requirements          │
│    "Identified 3 application components  │
│     for payment processing..."           │
│    [View Session] [Interrogate]          │
│                                          │
│ 📋 Security Review — PCI Scope           │
│    "Confirmed payment-gateway needs      │
│     PCI DSS compliance boundary..."      │
│    [View Session] [Interrogate]          │
└─────────────────────────────────────────┘
```

- "View Session" → `ProvenanceProvider.getSessionUrl(sessionId)` → opens in host app
- "Interrogate" → `ProvenanceProvider.getInterrogateUrl(sessionId, elementId)` → opens host chat with element context pre-loaded, so the user can ask "why does this element exist?" or "what requirements drove this?"

### 28.7 Provisional Element Rendering (R-AGENT-03)

Elements with `status: 'provisional'` render with:

- A dashed outer border (instead of solid) on the node shape
- A small "PROV" badge in the status badge position (bottom-left, below the specialisation badge area)
- Slightly reduced fill opacity (80% vs 100%) to visually distinguish from approved elements

This is a notation-level rendering concern — all node renderers check `element.status` and apply the provisional style. No special element type needed.

### 28.8 Agent as Peer — Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│ Human User   │     │ arch-vis      │     │ AI Agent  │
│ (canvas UI)  │────▶│ core API      │◀────│ (chat)    │
│              │     │ (SQLite)      │     │           │
│              │◀────│               │────▶│           │
└─────────────┘     └──────────────┘     └──────────┘
         ↕                                      ↕
    Canvas interaction                   Chat session
    (drag, rename, connect)              (natural language → API calls)
```

Both human and agent call the same functions. Both provide `created_by`. The model doesn't distinguish between them architecturally — the difference is in provenance metadata and governance workflow (provisional → approved).

### 28.9 Read-Only Mode (R-2WAY-02)

The canvas accepts a `readOnly: boolean` prop. When true:

- Palette is hidden
- Inline label editing is disabled
- Delete key is ignored
- Connection handles are hidden
- Drag-to-move is disabled (or allowed for pan-only, no position save)
- Selection and navigation still work (click to select, detail panel opens)
- Provenance popovers still work

This supports the use case of an agent loading an approved model into the chat workbench for discussion without risk of accidental modification.
