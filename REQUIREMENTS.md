# arch-vis — Requirements

**Version:** 1.0 | March 2026

---

## 1. Product Definition

An ArchiMate-aligned modelling and visualisation tool that:
- Models traditional full-stack enterprise architectures
- Extends ArchiMate with AI/Knowledge specialisation subtypes (55 specialisations across all layers)
- Renders interactive architecture diagrams as projections of a relational model
- Supports spatial 3D layer-plane views with rotation and relationship highlighting
- Persists to SQLite with full CRUD

Two foundational principles:
1. **Diagrams are views of a model, not the model itself.** Every element on the canvas is a record in the database. Views are projections.
2. **No deviation from ArchiMate.** Every entity type traces to a base ArchiMate element. AI/Knowledge specialisations are subtypes with additional properties — not a parallel notation.

---

## 2. Notation Concerns

The tool supports four notation concerns, in priority order:

| # | Concern | Notation | Status |
|---|---------|----------|--------|
| 1 | **Architecture** | ArchiMate 3.2 (with specialisation profile) | Phase 1 |
| 2 | **UML** | Class, Component, Sequence diagrams | Phase 3 |
| 3 | **Wireframe** | Lo-fi UI wireframes with page flow | Phase 3 |
| 4 | **Data** | Conceptual/Logical/Physical data modelling | Phase 4+ (separate viewpoint) |
| 5 | **Process Detail** | Simplified process flow (drill-down from ArchiMate processes) | Phase 4 |

Process detail is NOT full BPMN. The PFC backend already captures process_steps with step_type (human/agent/system/decision/gateway), sequence, role assignments, agent assignments, and approval gates. The visualiser renders these as a simple swimlane/sequence flow — a viewpoint that drills down from a business-process element.

---

## 3. Core Functional Requirements

### 3.1 Model Management

| ID | Requirement |
|----|-------------|
| R-MOD-01 | Create, read, update, delete elements in the SQLite database |
| R-MOD-02 | Create, read, update, delete relationships between elements |
| R-MOD-03 | Every element has `archimate_type` (base ArchiMate) and `specialisation` (nullable) |
| R-MOD-04 | Elements belong to a domain (bounded context with autonomy ceiling and track default) |
| R-MOD-05 | Relationships are validated against the ArchiMate metamodel (valid source→target→type combinations) |
| R-MOD-06 | Import elements from PFC YAML export |
| R-MOD-07 | Import/export ArchiMate Model Exchange Format XML (3.2) |
| R-MOD-08 | Bulk import from CSV |

### 3.2 View Management

| ID | Requirement |
|----|-------------|
| R-VIEW-01 | Create, save, and load named views |
| R-VIEW-02 | Each view has a viewpoint type (layered, knowledge_cognition, domain_slice, governance_matrix, process_detail, infrastructure, information) |
| R-VIEW-03 | Views store per-element positions (x, y, width, height) with sublayer overrides |
| R-VIEW-04 | Views store per-relationship route points and style overrides |
| R-VIEW-05 | Preset views ship with the application |
| R-VIEW-06 | User-defined views via a view builder (filter by domain, layer, archetype, specialisation) |
| R-VIEW-07 | Auto-layout computes initial positions respecting sublayer ordering |
| R-VIEW-08 | Manual drag-to-reposition updates saved positions |

### 3.3 Rendering

| ID | Requirement |
|----|-------------|
| R-RND-01 | xyflow (React Flow) canvas for all interactive diagramming — ArchiMate flat views, UML, wireframes. Custom node/edge components for notation-accurate shapes. |
| R-RND-02 | Spatial 3D renderer (D3.js SVG) with layer planes, perspective projection, and rotation *(experimental — retained for large-scale visualisation, not interactive editing)* |
| R-RND-03 | Elements render as compact ArchiMate notation shapes (≤110px wide at 100% zoom) |
| R-RND-04 | Specialisation badge renders in top-right corner when `specialisation` is non-null |
| R-RND-05 | Five zoom tiers with progressive disclosure (dots → labels → icons → badges → full notation) |
| R-RND-06 | Smooth tier transitions (no jarring redraws) |
| R-RND-07 | Click selects element and opens detail panel. Highlight mode (dim + illuminate relationship graph) available via right-click context menu → "Show Incoming" / "Show Outgoing" |
| R-RND-08 | Dimming (highlight mode only): non-highlighted elements at 7–12% opacity, non-highlighted edges at 2–4%. Not triggered on regular click |
| R-RND-09 | Layer planes dim when no highlighted entities are on them (highlight mode only) |
| R-RND-10 | Dark and light themes with per-archetype and per-layer colour tokens |
| R-RND-11 | Orthogonal edge routing with connection ports — edges start from boundary ports, same-layer routes use 2–3 segments, cross-layer routes use 4 segments |
| R-RND-12 | Connection port system: elements expose discrete anchor points (~10px spacing around perimeter), edges assigned to unique ports so no two edges share an attachment point |

### 3.4 Spatial Interaction

| ID | Requirement |
|----|-------------|
| R-SPA-01 | Y-axis rotation: full 360° via shift+drag horizontal |
| R-SPA-02 | X-axis tilt: ±18° via shift+drag vertical |
| R-SPA-03 | Pan via left-drag |
| R-SPA-04 | Zoom via scroll wheel (multiplicative) |
| R-SPA-05 | Reset button returns to default rotation + tilt |
| R-SPA-06 | Perspective projection with depth-based entity scaling |
| R-SPA-07 | Depth sorting (painter's algorithm) for correct overlap |

### 3.5 Element Palette and Properties

| ID | Requirement |
|----|-------------|
| R-PAL-01 | Element palette organised by ArchiMate layer, with mini SVG previews of ArchiMate notation shapes (pill, event, folded-corner, box-3d, etc.) alongside type names |
| R-PAL-02 | Palette shows both standard ArchiMate types and specialisation subtypes |
| R-PAL-03 | Drag from palette to canvas prompts for element name, then creates element in database and view |
| R-PAL-04 | Properties panel shows base ArchiMate properties plus specialisation-specific properties |
| R-PAL-05 | Properties panel edits save directly to SQLite |
| R-PAL-06 | Relationship creation by drag between elements on canvas |

### 3.6 Detail Panel

| ID | Requirement |
|----|-------------|
| R-DET-01 | Opens on single click (selects element and opens right drawer) |
| R-DET-02 | Shows: element name, archimate_type, specialisation, domain, status |
| R-DET-03 | Properties tab: all type-specific fields |
| R-DET-04 | Relationships tab: clickable list grouped by direction |
| R-DET-05 | Reasoning tab: session summaries where this element was discussed, decisions that affected it, confidence score |
| R-DET-06 | Reasoning tab: "View full session" link launches PFC web UI (external URL) |
| R-DET-07 | Clicking a related entity in the relationships tab navigates the canvas |
| R-DET-08 | Edit mode: inline form for name, status, layer, sublayer, description with save/cancel |
| R-DET-09 | Save persists changes to SQLite via API (`PUT /api/elements/:id`) |
| R-DET-10 | Delete with confirmation removes element and its relationships from model |

### 3.7 Sublayer Configuration

| ID | Requirement |
|----|-------------|
| R-SUB-01 | Layer and sublayer structure defined in YAML config file |
| R-SUB-02 | Each element type has a default sublayer assignment |
| R-SUB-03 | Auto-layout respects sublayer ordering for vertical positioning within a layer |
| R-SUB-04 | Sublayer assignment overridable per element per view |
| R-SUB-05 | Config file is the default — renderer never hardcodes layer structure |

### 3.8 Governance Matrix

| ID | Requirement |
|----|-------------|
| R-GOV-01 | Governance matrix viewpoint: agents × (grounding + governance + quality) |
| R-GOV-02 | Renders as a table/grid, not a diagram |
| R-GOV-03 | Rows: Domain Agents (from solution_architecture where is_agent=1) |
| R-GOV-04 | Columns: knowledge store refs, autonomy level, track, quality scores |
| R-GOV-05 | Can sit as a side panel alongside a layered view |

### 3.9 Export

| ID | Requirement |
|----|-------------|
| R-EXP-01 | Export to SVG (vector, print-quality) |
| R-EXP-02 | Export to PNG (rasterised) |
| R-EXP-03 | Export to PDF |
| R-EXP-04 | Export to ArchiMate Model Exchange Format XML 3.2 |
| R-EXP-05 | Export to JSON (full model backup) |

---

## 4. Sublayer Model

ArchiMate layers have implicit internal structure. The tool formalises this with a config-driven sublayer system. See `reference/sublayer-config.yaml` for the full default configuration.

Summary:

| Layer | Sublayers (top to bottom) |
|-------|--------------------------|
| Motivation | drivers_goals → principles → constraints_requirements |
| Strategy | value_streams → capabilities → courses_of_action |
| Business (Upper) | actors_roles → processes_functions |
| Business (Lower) | services → objects_rules |
| Application | services_interfaces → components → functions_processes |
| Technology | services → system_software → nodes |
| Data/Artifact | objects → artifacts |
| Implementation | work_packages → plateaus |

---

## 5. ArchiMate Shape Registry

Each base ArchiMate type maps to a compact shape. Shape geometry is defined by `archimate_type`, NOT by `specialisation`.

| ArchiMate Type | Shape | Size (w×h) | Notes |
|----------------|-------|------------|-------|
| Stakeholder | Rect with person icon | 80×24 | Motivation |
| Driver | Rect | 80×22 | Motivation |
| Goal | Rounded rect (elliptical) | 85×24 | Motivation |
| Constraint | Rect | 80×22 | Motivation |
| Requirement | Rect | 80×22 | Motivation |
| Assessment | Rect | 80×22 | Motivation |
| Capability | Rounded rect | 90×24 | Strategy |
| Value Stream | Wide pill | 110×26 | Strategy — with chevron stages |
| Course of Action | Rounded rect | 90×24 | Strategy |
| Business Actor | Rect + person icon | 70×22 | Business |
| Business Role | Rect | 70×22 | Business |
| Business Process | Rounded pill | 80×22 | Business |
| Business Function | Rect + header bar | 95×26 | Business |
| Business Service | Small pill | 90×20 | Business |
| Business Object | Folded-corner rect | 80×20 | Business |
| Business Event | Rounded rect with notch | 75×20 | Business |
| Application Component | Rect with component icon | 85×24 | Application |
| Application Service | Small pill | 80×18 | Application |
| Application Interface | Rect + lollipop | 80×18 | Application |
| Application Function | Rounded pill | 80×22 | Application |
| Application Process | Rounded pill | 80×22 | Application |
| Node | 3D box (depth faces) | 80×22 | Technology |
| Technology Service | Small pill | 85×18 | Technology |
| System Software | Rect | 80×22 | Technology |
| Device | 3D box | 80×22 | Technology |
| Data Object | Folded-corner rect | 80×20 | Data |
| Artifact | Rect with artifact icon | 80×18 | Data |
| Work Package | Rounded rect | 85×22 | Implementation |
| Deliverable | Folded-corner rect | 80×20 | Implementation |
| Plateau | Rect | 90×22 | Implementation |
| Gap | Dashed rect | 80×22 | Implementation |

Specialisation badge: 12×8px rounded rect in top-right corner with 2–3 character code at 5px font. Renders only when `specialisation` is non-null.

---

## 6. Relationship Types

Standard ArchiMate relationships:

| Type | Visual | Arrowhead |
|------|--------|-----------|
| Composition | Solid line | Filled diamond (source) |
| Aggregation | Solid line | Open diamond (source) |
| Assignment | Solid line | Filled circle (source) + arrow (target) |
| Realisation | Dashed line | Open triangle (target) |
| Serving | Solid line | Open arrow (target) |
| Access | Dashed line | Arrow(s) based on access type |
| Influence | Dashed line | Open arrow + influence modifier |
| Triggering | Solid line | Filled arrow (target) |
| Flow | Dashed line | Filled arrow (target) |
| Specialisation | Solid line | Open triangle (target) |
| Association | Solid line | None (or small arrows if directed) |

Specialised associations (AI/Knowledge):

| Name | Renders As | Badge on Edge |
|------|-----------|---------------|
| grounded_in | Association + "grounded" label | GR |
| governed_by | Association + "governed" label | GV |
| measured_by | Association + "measured" label | MS |
| feeds | Flow | — |
| populates | Flow | — |
| falls_back_to | Association, dashed | FB |

---

## 7. Viewpoint Types

| Viewpoint | What It Shows | Render Mode |
|-----------|---------------|-------------|
| **Layered** | All elements by layer with sublayer ordering | Flat SVG or Spatial 3D |
| **Knowledge & Cognition** | AI/Knowledge specialised elements across layers, domain-grouped | Flat (poster layout) |
| **Domain Slice** | One domain's complete vertical stack | Flat |
| **Governance Matrix** | Agents × grounding × governance × quality | Table/grid |
| **Process Detail** | Drill-down of a business-process into steps | Simplified flow |
| **Infrastructure** | Technology + Data layers | Flat |
| **Information** | Data Objects and Artifacts with relationships | Flat |
| **Application Landscape** | Applications in grid/matrix by domain and tier | Grid |

---

## 8. Reasoning/Provenance Display

The reasoning log lives in PFC (sessions table). The visualiser consumes summaries.

### What the visualiser shows:

- **Detail panel → Reasoning tab:** List of sessions where this element was discussed
- Per session: `summary`, `decisions_made` relevant to this element, `confidence` from the element record
- "View full session" link: opens `{PFC_BASE_URL}/session/{session_id}` in new tab
- **Reasoning path on canvas:** NOT shown by default. A future viewpoint could render a decision trail (sequence of decisions that created/modified an element), but this is not Phase 1.

### What the visualiser does NOT do:

- Does not render chat transcripts
- Does not store reasoning data — it reads from PFC
- Does not duplicate the sessions table

---

## 9. Theme Tokens

Two themes: dark (default), light.

### Per-layer colours (dark theme):

| Layer | Stroke | Fill (12% opacity) |
|-------|--------|-------------------|
| Motivation | `#C084D8` | `#C084D812` |
| Strategy | `#D4A843` | `#D4A84312` |
| Business | `#E8C840` | `#E8C84012` |
| Application | `#4AADE8` | `#4AADE80E` |
| Technology | `#5BBD72` | `#5BBD720E` |
| Data/Artifact | `#E07848` | `#E0784810` |
| Implementation | `#A0A0A0` | `#A0A0A010` |

### Highlight system:

| Token | Dark | Light |
|-------|------|-------|
| highlight | `#F59E0B` | `#D97706` |
| highlightEdge | `#F59E0B` | `#D97706` |
| dimNode opacity | 0.07–0.12 | 0.07–0.12 |
| dimEdge opacity | 0.02–0.04 | 0.02–0.04 |

---

## 10. Canvas Interaction Requirements

These are table-stakes features every modelling tool needs, derived from draw.io, Excalidraw, and Lucidchart analysis. Organised by priority tier.

### Tier 1 — Blocking Basic Usability

| ID | Requirement | Source |
|----|-------------|--------|
| R-INT-01 | Undo/redo via command pattern. Ctrl+Z / Ctrl+Y. Continuous drags coalesce to one undo step. Group operations (delete element + its edges) = one step. | draw.io, Excalidraw |
| R-INT-02 | Multi-select: Shift+click toggle, Ctrl+click toggle. All selected elements move/delete together. | draw.io |
| R-INT-03 | Box select (rubberband): drag on empty canvas to select enclosed elements. Alt+drag to include partially enclosed. | draw.io |
| R-INT-04 | Keyboard shortcuts: Delete/Backspace = delete selected, Escape = deselect, Ctrl+A = select all, arrow keys = nudge 1px, Shift+arrow = nudge by grid size. | draw.io |
| R-INT-05 | On-canvas relationship creation: hover element → directional arrows appear → drag from arrow to target element → pick relationship type from popup. | draw.io Magic Connector pattern |
| R-INT-06 | Snap to grid (toggleable, configurable size). Hold Alt to bypass snap. Visual grid overlay. | draw.io |
| R-INT-07 | Alignment guides: orange centre lines when aligning with other elements. Blue spacing guides when equidistant. Visible WHILE dragging. | draw.io |

### Tier 2 — Expected by Any User

| ID | Requirement | Source |
|----|-------------|--------|
| R-INT-08 | Alignment tools: align left/right/centre horizontal, top/bottom/centre vertical. Distribute evenly horizontal/vertical. | draw.io |
| R-INT-09 | On-canvas label editing: double-click element name to edit inline. Enter to confirm, Escape to cancel. | draw.io, Excalidraw |
| R-INT-10 | Minimap: small overview in corner showing viewport position within full diagram. Click to navigate. | draw.io |
| R-INT-11 | Search/filter on canvas: Ctrl+F to find elements by name. Results highlight on canvas. | draw.io |
| R-INT-12 | Connector waypoints: drag blue handles on edges to reshape path. Right-click to add/remove waypoints. | draw.io |
| R-INT-13 | Consistent modifier keys: Alt = bypass constraints, Shift = constrain/add-to-selection, Ctrl = clone/copy semantics (Ctrl+drag = duplicate). | draw.io |
| R-INT-14 | Context-sensitive cursors: move, resize, connect, pan cursors based on hover target. | draw.io |

### Tier 3 — Polish

| ID | Requirement | Source |
|----|-------------|--------|
| R-INT-15 | Clipboard: Ctrl+C/V/X for cut/copy/paste elements (with offset positioning on paste). | draw.io |
| R-INT-16 | Tab/Shift+Tab to cycle selection through elements sequentially. | draw.io |
| R-INT-17 | Select edges only (Ctrl+Shift+E) / select vertices only (Ctrl+Shift+I). | draw.io |
| R-INT-18 | Style copy/paste: Ctrl+Shift+C copies visual style, Ctrl+Shift+V applies it. | draw.io |
| R-INT-19 | Zoom to selection: zoom/pan to fit selected elements in viewport. | draw.io |
| R-INT-20 | Clone-and-connect: click directional arrow → creates a clone of the element with connector already attached. | draw.io |

---

## 11. Model Tree / Navigator Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R-TREE-01 | Model tree panel: elements organised by ArchiMate layer folders (Strategy, Business, Application, Technology, Motivation, Implementation, Other) + Relations folder + Views folder. | Archi |
| R-TREE-02 | User sub-folders within layer folders for manual organisation. | Archi |
| R-TREE-03 | Drag from model tree to canvas to add existing element to current view. | Archi |
| R-TREE-04 | Drag from canvas to model tree folder to reclassify. | Archi |
| R-TREE-05 | Orphan detection: elements not appearing in any view shown in italic. | Archi |
| R-TREE-06 | Search/filter in model tree by name, type, property value. | Archi |
| R-TREE-07 | Navigator panel: select element → see all relationships (incoming/outgoing) with clickable navigation. | Archi |
| R-TREE-08 | Sync selection: clicking in tree selects on canvas and vice versa (if element is in current view). | Archi |

---

## 12. ArchiMate Metamodel Enforcement

| ID | Requirement | Source |
|----|-------------|--------|
| R-META-01 | Populate `valid_relationships` table from Archi's `relationships.xml` matrix (~3000 source→target→type rules). | Archi |
| R-META-02 | Real-time validation on connector creation: invalid connections show "Not Allowed" cursor. Only valid relationship types offered in popup. | Archi Magic Connector |
| R-META-03 | Junction element support: AND/OR junctions that enforce all connected relationships are the same type. | Archi |
| R-META-04 | Dynamic viewpoint filtering: non-permitted elements for a viewpoint are ghosted (greyed, not hidden). | Archi |

---

## 13. Data Overlays / Conditional Formatting

| ID | Requirement | Source |
|----|-------------|--------|
| R-DATA-01 | Colour-by-property: colour element fill/border by status, domain, maturity, risk, or any custom property. Rule-based, priority cascade. | Lucidchart |
| R-DATA-02 | Status badge overlays: small icon/text badge showing lifecycle state (draft, active, deprecated, retired). | Lucidchart |
| R-DATA-03 | Selective field display: toggle 1–2 key properties as small text below element name on canvas (e.g. status, domain). NOT full field lists. | Lucidchart |
| R-DATA-04 | Heatmap mode: colour intensity mapped to a numeric property (confidence, maturity score, cost). | Lucidchart |

---

## 14. Layer Visibility

| ID | Requirement | Source |
|----|-------------|--------|
| R-LAY-01 | Layer visibility toggle: show/hide ArchiMate layers independently (eye icon per layer). | draw.io, Lucidchart |
| R-LAY-02 | Layer lock: prevent editing elements in locked layers (padlock icon). | draw.io, Lucidchart |
| R-LAY-03 | Layer opacity control: fade layers to keep context visible (not just binary show/hide). | Lucidchart |
| R-LAY-04 | Relationship layer: edges on a separate visual layer that can be toggled independently. | draw.io |

---

## 15. Import/Export

| ID | Requirement | Source |
|----|-------------|--------|
| R-IO-01 | ArchiMate Open Exchange Format XML 3.2 import/export (the interoperability standard). | Archi |
| R-IO-02 | CSV import/export: 3-file format (elements.csv, relations.csv, properties.csv) matching Archi's format for interop. | Archi CSV |
| R-IO-03 | JSON model backup/restore (full model dump). | — |
| R-IO-04 | SVG export (vector, print-quality). | draw.io |
| R-IO-05 | PNG export (rasterised, 2× retina). | draw.io |
| R-IO-06 | PDF export. | draw.io |
| R-IO-07 | Batch model import: `POST /api/import/model-batch` accepts JSON payload with notation, elements (with optional children for nesting), relationships, and optional view definition. Validates against Zod schemas and metamodel, upserts into SQLite, triggers auto-layout. Primary agent creation pathway. | — |
| R-IO-08 | Batch model export: `GET /api/export/model-batch?view=:id` returns the same JSON batch format for round-trip agent workflows. | — |

---

## 16. UML Diagramming Requirements

### 16.1 Schema Extensions

| ID | Requirement | Source |
|----|-------------|--------|
| R-UML-01 | Add `notation` discriminator to elements/relationships: `'archimate'` \| `'uml'`. Widen type constraints. | — |
| R-UML-02 | UML element types: `uml-class`, `uml-abstract-class`, `uml-interface`, `uml-enum`, `uml-component`, `uml-actor`, `uml-use-case`, `uml-state`, `uml-activity`, `uml-note`, `uml-package`. | UML 2.5 |
| R-UML-03 | UML relationship types: `uml-inheritance`, `uml-realisation`, `uml-composition`, `uml-aggregation`, `uml-association`, `uml-dependency`, `uml-assembly`. | UML 2.5 |
| R-UML-04 | Class properties stored in JSON: `{ stereotype, isAbstract, attributes: [{name, type, visibility, isStatic, isDerived, multiplicity, defaultValue, ordering}], methods: [{name, returnType, visibility, isStatic, isAbstract, parameters: [{name, type, direction}], ordering}] }` | — |
| R-UML-05 | UML relationship properties: `{ sourceMultiplicity, targetMultiplicity, sourceRole, targetRole, sourceNavigable, targetNavigable, stereotype }` | — |
| R-UML-06 | `sequence_messages` table for sequence diagrams (source/target lifeline, message type, sequence_order, fragment_id). | — |
| R-UML-07 | `sequence_fragments` table (operator, guard, parent_fragment, spanning_lifelines, vertical_extent). | — |
| R-UML-08 | Wireframe element types: `wf-page`, `wf-section`, `wf-header`, `wf-nav`, `wf-button`, `wf-input`, `wf-textarea`, `wf-select`, `wf-checkbox`, `wf-radio`, `wf-table`, `wf-image`, `wf-icon`, `wf-text`, `wf-link`, `wf-modal`, `wf-card`, `wf-list`, `wf-tab-group`, `wf-form`, `wf-placeholder`. | — |
| R-UML-09 | Wireframe relationship types: `wf-contains` (parent–child nesting), `wf-navigates-to` (page flow), `wf-binds-to` (data binding). | — |
| R-UML-10 | Wireframe properties stored in JSON: `{ placeholder, label, disabled, variant, columns (for tables), items (for lists/selects), src (for images) }` | — |
| R-UML-11 | Notation discriminator extended: `'archimate'` \| `'uml'` \| `'wireframe'`. | — |

### 16.2 Class Diagram (Phase 2a — Priority 1)

| ID | Requirement | Source |
|----|-------------|--------|
| R-CLASS-01 | Class shape: 3 compartments (name, attributes, methods). Auto-resize as members added. | UML 2.5 |
| R-CLASS-02 | Visibility markers rendered: `+` public, `-` private, `#` protected, `~` package. Static underlined, abstract italic. | UML 2.5 |
| R-CLASS-03 | Interface shape: `<<interface>>` stereotype in name compartment. | UML 2.5 |
| R-CLASS-04 | Enum shape: `<<enumeration>>` stereotype, values listed in third compartment. | UML 2.5 |
| R-CLASS-05 | Package as container: tab-rectangle, elements nest inside. | UML 2.5 |
| R-CLASS-06 | Six relationship types with correct arrowheads: inheritance (hollow triangle), realisation (dashed + hollow triangle), composition (filled diamond), aggregation (hollow diamond), association (open arrow), dependency (dashed + open arrow). | UML 2.5 |
| R-CLASS-07 | Multiplicity labels on association ends. Draggable along edge. | UML 2.5 |
| R-CLASS-08 | Role name labels on association ends. | UML 2.5 |
| R-CLASS-09 | In-place attribute/method editing: click compartment to add/edit members. | draw.io pattern |

### 16.3 Component Diagram (Phase 2a — Priority 1)

| ID | Requirement | Source |
|----|-------------|--------|
| R-COMP-01 | Component shape: rectangle with component icon or `<<component>>` stereotype. | UML 2.5 |
| R-COMP-02 | Provided interface: lollipop (circle on stick) attached to component. | UML 2.5 |
| R-COMP-03 | Required interface: socket (half-circle) attached to component. | UML 2.5 |
| R-COMP-04 | Assembly connector: ball-and-socket rendering when provided meets required. | UML 2.5 |
| R-COMP-05 | Ports: small squares on component boundary as connection points. | UML 2.5 |
| R-COMP-06 | ArchiMate bridge: `application-component` can render in both ArchiMate and UML notation depending on viewpoint. | — |

### 16.4 Sequence Diagram (Phase 2b — Priority 2)

| ID | Requirement | Source |
|----|-------------|--------|
| R-SEQ-01 | Time-based renderer: Y-axis = time (down), X-axis = participant ordering. Not freely spatial. | UML 2.5 |
| R-SEQ-02 | Lifelines: rectangle header + dashed vertical line. Format `name : Type`. | UML 2.5 |
| R-SEQ-03 | Seven message types: synchronous (filled arrow), asynchronous (open arrow), return (dashed), create (dashed to new header), destroy (X), self-message (loop-back), found/lost. | UML 2.5 |
| R-SEQ-04 | Activation bars: thin rectangles on lifelines showing active processing. | UML 2.5 |
| R-SEQ-05 | Combined fragments: `alt`, `opt`, `loop`, `break`, `par`, `critical`. Pentagon tab with operator, guard in brackets, operands separated by dashed lines. | UML 2.5 |
| R-SEQ-06 | Interaction references: `ref` frame referencing another sequence diagram. | UML 2.5 |

### 16.5 Wireframe Diagrams (Phase 3)

| ID | Requirement | Source |
|----|-------------|--------|
| R-WF-01 | Page shape: full-width rectangle with browser chrome header (title bar, URL placeholder). Top-level container. | draw.io mockup |
| R-WF-02 | Section/card shapes: rounded rectangles with optional header bar. Nestable containers. | draw.io mockup |
| R-WF-03 | Form controls: button (rounded rect, filled), input (rect with placeholder text), textarea (multi-line rect), select (rect with dropdown chevron), checkbox, radio. Rendered as lo-fi wireframe style (no colour fills, grey borders). | draw.io mockup |
| R-WF-04 | Table shape: grid with header row. Column names from properties. | draw.io mockup |
| R-WF-05 | Navigation shape: horizontal or vertical bar with link items. | draw.io mockup |
| R-WF-06 | Image/icon placeholders: crossed rectangle (image) or icon glyph. | draw.io mockup |
| R-WF-07 | Deep nesting via `parent_id`: page → section → form → input. Rendered as spatial containment (children positioned inside parent bounds). | — |
| R-WF-08 | Page flow: `wf-navigates-to` relationships rendered as arrows between pages. Clicking a button/link highlights its navigation target. | — |
| R-WF-09 | Wireframe palette: organised by category (layout, controls, data, navigation). Drag to canvas creates element inside the hovered container. | — |
| R-WF-10 | Lo-fi rendering style: greyscale palette, sketch-style borders (optional), no colour fills. Intentionally unfinished appearance to signal "this is a wireframe, not a design." | — |
| R-WF-11 | Inline text editing: double-click any text element (button label, input placeholder, heading) to edit. | — |

### 16.6 Batch Model Import (Agent Pathway)

| ID | Requirement | Source |
|----|-------------|--------|
| R-BATCH-01 | `POST /api/import/model-batch` accepts a JSON payload containing `notation`, `elements[]`, `relationships[]`, and optional `view` definition. | — |
| R-BATCH-02 | Elements in the batch may reference each other by `name` (resolved to IDs on import) or provide explicit `id` values. | — |
| R-BATCH-03 | Elements may contain a `children[]` array for nesting (wireframe containment, UML package contents). Children are created with `parent_id` set to the enclosing element. | — |
| R-BATCH-04 | Batch import validates all elements against the notation's type constraints and all relationships against `valid_relationships` before committing. Returns validation errors without partial writes. | — |
| R-BATCH-05 | If a `view` is provided, all imported elements are added to the view and auto-layout is triggered. | — |
| R-BATCH-06 | `GET /api/export/model-batch?view=:id` exports the same JSON batch format for round-trip agent workflows. | — |
| R-BATCH-07 | Batch import supports upsert semantics: if an element with the same `id` exists, it is updated. New elements are inserted. | — |
| R-BATCH-08 | Batch payloads are validated against Zod schemas. Schema definitions serve as the contract for agent prompt engineering. | — |

---

## 17. Build Phases

### Phase 1 — Core Model + Renderers (Weeks 1–3)

1. [x] SQLite schema creation + seed data loading
2. [x] Express API for CRUD (elements, relationships, views, domains)
3. [x] Graphology in-memory graph built from SQLite on load
4. [x] Sublayer config parser
5. [x] ArchiMate shape registry (all base types)
6. [x] Specialisation badge rendering
7. [x] Spatial 3D renderer with layer planes, rotation, zoom *(experimental)*
8. [x] Five zoom tiers with compact shape LOD
9. [x] Relationship highlighting (opt-in via context menu, not click)
10. [x] Detail panel (properties + relationships tabs + edit mode with CRUD)
11. [x] Dark + light themes
12. [x] Three preset views (Full Spatial, Layered Flat, Strategy)
13. [ ] Export to SVG + PNG
14. [x] Flat SVG renderer with ELK layout + orthogonal edge routing + connection ports
15. [x] Element palette with shape icons, drag-to-create with name prompt
16. [x] Detail panel edit mode (name, status, layer, sublayer, description) with save/delete

### Phase 2 — Canvas Interaction + Model Tree (Weeks 4–6)

1. Undo/redo (command pattern)
2. Multi-select + box select
3. Keyboard shortcuts (Delete, Ctrl+Z/Y, arrows, Escape, Ctrl+A)
4. On-canvas relationship creation (hover-to-connect)
5. Snap to grid + alignment guides + distribution tools
6. On-canvas label editing
7. Model tree panel (layer folders, drag to/from canvas, search)
8. Connector waypoints
9. Minimap
10. Populate valid_relationships from Archi's matrix + enforce on create

### Phase 3 — Multi-Notation + Data Overlays (Weeks 7–10)

1. Schema extensions (notation discriminator, UML + wireframe types)
2. Batch model import/export API (agent creation pathway)
3. UML Class diagram shapes + relationships
4. UML Component diagram shapes
5. Class editing panel (attributes, methods, visibility)
6. Wireframe shapes (page, section, controls, table, nav)
7. Wireframe nesting renderer (spatial containment)
8. Wireframe palette + inline text editing
9. Colour-by-property / conditional formatting
10. Layer visibility toggle + lock
11. ArchiMate XML import/export
12. CSV import/export (Archi-compatible 3-file format)

### Phase 4 — Sequence Diagrams + Advanced (Weeks 10–12)

1. Sequence diagram renderer (time-based, not spatial)
2. Lifelines, messages, activation bars, combined fragments
3. Activity diagram viewpoint
4. Use Case diagram
5. Heatmap overlays
6. PDF export

---

## 18. Acceptance Criteria

### Core

- [x] SQLite database with full schema, seed data auto-loads on first run
- [x] CRUD API for elements, relationships, views, domains
- [x] All base ArchiMate element types render as compact notation shapes
- [x] Specialisation badges render correctly for all 55 specialisations
- [x] Five TOGAF-aligned layer planes in spatial 3D view *(experimental)*
- [x] Y-axis rotation (360°) and X-axis tilt (±18°) *(spatial, experimental)*
- [x] Highlight mode via context menu (Show Incoming/Outgoing) illuminates relationship graph
- [x] Click selects element and opens detail panel (no dimming)
- [x] Five zoom tiers with smooth progressive disclosure
- [x] Detail panel with properties, relationships tabs + edit mode (CRUD)
- [x] Dark and light themes
- [ ] SVG and PNG export
- [x] Flat renderer with ELK layout, orthogonal edge routing, connection ports
- [x] Element palette with ArchiMate shape icons and drag-to-create

### Canvas Interaction

- [ ] Undo/redo with coalesced drag operations
- [ ] Multi-select and box select
- [ ] Keyboard shortcuts (Delete, Escape, Ctrl+A, arrows)
- [ ] On-canvas relationship creation via hover arrows
- [ ] Snap to grid with visual overlay
- [ ] Alignment guides visible during drag
- [ ] Model tree panel with layer folders
- [ ] ArchiMate metamodel validation on relationship creation

### UML

- [ ] Class diagram with 3-compartment shapes and visibility markers
- [ ] Component diagram with lollipop/socket interfaces
- [ ] Six UML relationship types with correct arrowheads
- [ ] Sequence diagram with lifelines, messages, and combined fragments

### Wireframes

- [ ] Page, section, and form control shapes in lo-fi wireframe style
- [ ] Deep nesting with spatial containment rendering
- [ ] Page flow via wf-navigates-to relationships
- [ ] Wireframe palette with drag-to-create inside containers

### Agent Model Creation

- [ ] Batch model import via JSON (POST /api/import/model-batch)
- [ ] Batch model export for round-trip (GET /api/export/model-batch)
- [ ] Upsert semantics with full validation before commit
- [ ] Children array support for nested wireframe/UML package structures

### Quality

- [ ] TypeScript strict, no `any` in model/notation/renderer layers
- [ ] Dev server accessible from LAN (0.0.0.0 binding)
- [ ] 200+ elements render without lag at Context zoom tier
- [ ] Unit tests for: projection math, highlight graph, shape registry, schema validation
- [ ] All dependencies open-source (MIT/Apache/BSD/MPL-2.0)
