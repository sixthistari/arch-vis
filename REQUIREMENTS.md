# arch-vis — Requirements

**Version:** 1.1 | March 2026

---

## 1. Product Definition

An ArchiMate-aligned modelling and visualisation tool that:
- Models traditional full-stack enterprise architectures
- Extends ArchiMate with AI/Knowledge specialisation subtypes (55 specialisations across all layers)
- Renders interactive architecture diagrams as projections of a relational model
- Supports spatial 3D layer-plane views with rotation and relationship highlighting
- Persists to SQLite with full CRUD
- **Library-first architecture**: designed to be embedded into host applications (EA workbenches, AI chat tools) as an importable library, while also functioning as a standalone tool

Three foundational principles:
1. **Diagrams are views of a model, not the model itself.** Every element on the canvas is a record in the database. Views are projections.
2. **No deviation from ArchiMate.** Every entity type traces to a base ArchiMate element. AI/Knowledge specialisations are subtypes with additional properties — not a parallel notation.
3. **Agents are peers, not owners.** AI agents that create or modify architecture elements use the same API as human users. The model (SQLite) is always the source of truth — agents are co-workers with provenance trails, not data sources.

---

## 2. Notation Concerns

The tool supports four notation concerns, in priority order:

| # | Concern | Notation | Status |
|---|---------|----------|--------|
| 1 | **Architecture** | ArchiMate 3.2 (with specialisation profile) | Implemented |
| 2 | **UML** | Class, Component, Sequence, Activity, Use-Case, State diagrams | Implemented |
| 3 | **Wireframe** | Lo-fi UI wireframes with page flow | Implemented |
| 4 | **Data** | Conceptual/Logical/Physical data modelling | Future (separate viewpoint) |
| 5 | **Process Detail** | Simplified process flow (drill-down from ArchiMate processes) | Implemented |

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
| R-RND-01 | Interactive canvas for all diagramming — ArchiMate flat views, UML, wireframes. Custom node/edge components for notation-accurate shapes. |
| R-RND-02 | Spatial 3D renderer with layer planes, perspective projection, and rotation *(experimental — retained for large-scale visualisation, not interactive editing)* |
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

### 3.9 Notation Boundary Enforcement

| ID | Requirement |
|----|-------------|
| R-NOTB-01 | Views must not mix notations. Each view belongs to a single notation family (ArchiMate, UML, or Wireframe). |
| R-NOTB-02 | The element palette shows only types appropriate for the current view's notation. |
| R-NOTB-03 | Relationship type options offered on connection creation are filtered by notation family. |

### 3.10 Shared Configuration

| ID | Requirement |
|----|-------------|
| R-CFG-01 | Layer ordering is defined in a single canonical source; all modules that sort or label layers reference this shared definition rather than maintaining independent copies. |
| R-CFG-02 | Sublayer ordering within layers is defined once and shared across layout computation, palette grouping, and model tree display. |
| R-CFG-03 | Notation-specific relationship type lists are maintained centrally and consumed by connection creation, validation, and the relationship type picker. |

### 3.11 Export

| ID | Requirement |
|----|-------------|
| R-EXP-01 | Export to SVG (vector, print-quality) |
| R-EXP-02 | Export to PNG (rasterised) |
| R-EXP-03 | Export to PDF |
| R-EXP-04 | Export to ArchiMate Model Exchange Format XML 3.2 |
| R-EXP-05 | Export to JSON (full model backup) |

### 3.12 Project Management

| ID | Requirement |
|----|-------------|
| R-PROJ-01 | The tool supports multiple projects. Each project is an independent container for elements, relationships, and views. |
| R-PROJ-02 | Create, rename, and delete projects. Deleting a project cascades to all its elements, relationships, and views. |
| R-PROJ-03 | A project selector in the toolbar allows switching between projects. Switching reloads all model and view data. |
| R-PROJ-04 | On first run (or migration), a "Default Project" is created and all existing data is assigned to it. |
| R-PROJ-05 | Model file save/load (.archvis) operates per-project — exports only the current project's data, imports into the current project. |
| R-PROJ-06 | Batch import/export operates within the current project scope. |

### 3.13 Working and Governed Areas

| ID | Requirement |
|----|-------------|
| R-AREA-01 | Within a project, every element, relationship, and view belongs to an **area**: either `working` (draft/scratchpad) or `governed` (human-reviewed, approved). |
| R-AREA-02 | New elements, relationships, and views default to the `working` area. |
| R-AREA-03 | A **promote** action moves an entity from working to governed. Promotion requires the entity to have a non-empty name and description (validation gate). |
| R-AREA-04 | A **demote** action moves an entity from governed back to working (for rework). |
| R-AREA-05 | The model tree displays area tabs (All / Working / Governed) to filter elements by area. |
| R-AREA-06 | Working-area elements render on canvas with a visual indicator (dashed border, "W" badge) to distinguish from governed elements. |
| R-AREA-07 | The view switcher shows an area badge ("W" or "G") on each view. |
| R-AREA-08 | Bulk promote/demote is supported via multi-select. |

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

The reasoning log lives in PFC (sessions table). The visualiser consumes summaries. Provenance is managed in the PFC schema — arch-vis stores only the `source_session_id` as an opaque foreign key that the host application resolves.

### What the visualiser shows:

| ID | Requirement |
|----|-------------|
| R-PROV-01 | **Detail panel → Provenance tab:** List of sessions where this element was discussed or modified |
| R-PROV-02 | Per session: `summary`, `decisions_made` relevant to this element, `confidence` from the element record |
| R-PROV-03 | "View full session" link: opens `{PFC_BASE_URL}/session/{session_id}` in new tab (host provides URL template) |
| R-PROV-04 | **On-canvas provenance popover:** Click or hover an element's provenance indicator to see a popover showing: which chat sessions created/modified it, a one-line summary of each session, and a "drill in" link to each session in the host application |
| R-PROV-05 | Provenance popover shows agent identity (who created it), creation date, confidence score, and provisional/approved status |
| R-PROV-06 | Popover "interrogate" action: link back to the host chat session with the element pre-loaded as context, allowing the user to ask the agent why this element exists or is structured as it is |
| R-PROV-07 | Elements created by AI agents default to `status: 'provisional'`. Promotion to `'active'` is an explicit governance action |
| R-PROV-08 | Provenance data is fetched via a pluggable provider interface — the host application supplies the resolver, arch-vis defines the contract |

### What the visualiser does NOT do:

- Does not render chat transcripts — it shows summaries and links
- Does not store reasoning/session data — it reads from the host via the provenance provider
- Does not duplicate the sessions table — `source_session_id` is a foreign key into the host's schema

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

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| R-INT-01 | Undo/redo via command pattern. Ctrl+Z / Ctrl+Y. Covers element create/delete/rename, relationship create/delete, and element move. | draw.io, Excalidraw | Implemented |
| R-INT-02 | Multi-select: Shift+click toggle. All selected elements move/delete together. | draw.io | Implemented |
| R-INT-03 | Box select (rubberband): Shift+drag on empty canvas to select enclosed elements. | draw.io | Implemented |
| R-INT-04 | Keyboard shortcuts: Delete/Backspace = delete selected, Escape = deselect, Ctrl+A = select all, arrow keys = nudge 1px, Shift+arrow = nudge 10px. | draw.io | Implemented |
| R-INT-05 | On-canvas relationship creation: drag from element handle to target element, pick relationship type from popup filtered by notation. | draw.io Magic Connector pattern | Implemented |
| R-INT-06 | Snap to grid (10px grid). Visual grid overlay (dot pattern). | draw.io | Implemented |
| R-INT-07 | Alignment guides: snapline overlays visible during node drag showing alignment with other elements. | draw.io | Implemented |

### Tier 2 — Expected by Any User

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| R-INT-08 | Alignment tools: align left/right/centre horizontal, top/bottom/centre vertical. Distribute evenly horizontal/vertical. | draw.io | Implemented |
| R-INT-09 | On-canvas label editing: double-click element name to edit inline. Enter to confirm, Escape to cancel. | draw.io, Excalidraw | Implemented |
| R-INT-10 | Minimap: small overview in corner showing viewport position within full diagram. Click to navigate. | draw.io | Implemented |
| R-INT-11 | Search/filter on canvas: Ctrl+F to find elements by name. Results highlight on canvas. | draw.io | Not implemented |
| R-INT-12 | Connector waypoints: drag handles on edges to reshape path. Right-click context menu for edge options. | draw.io | Implemented |
| R-INT-13 | Consistent modifier keys: Shift = add-to-selection/box-select. | draw.io | Partially implemented |
| R-INT-14 | Context menus: right-click on nodes for highlight mode (Show Incoming/Outgoing), add to view, navigate. Right-click on edges for line style and delete. | draw.io | Implemented |

### Tier 3 — Polish

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| R-INT-15 | Clipboard: Ctrl+C/V/X for cut/copy/paste elements (with offset positioning on paste). | draw.io | Not implemented |
| R-INT-16 | Tab/Shift+Tab to cycle selection through elements sequentially. | draw.io | Not implemented |
| R-INT-17 | Select edges only (Ctrl+Shift+E) / select vertices only (Ctrl+Shift+I). | draw.io | Not implemented |
| R-INT-18 | Style copy/paste: Ctrl+Shift+C copies visual style, Ctrl+Shift+V applies it. | draw.io | Not implemented |
| R-INT-19 | Zoom to selection: zoom/pan to fit selected elements in viewport. | draw.io | Not implemented |
| R-INT-20 | Clone-and-connect: click directional arrow → creates a clone of the element with connector already attached. | draw.io | Not implemented |

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
| R-UML-02 | UML element types: `uml-class`, `uml-abstract-class`, `uml-interface`, `uml-enum`, `uml-component`, `uml-actor`, `uml-use-case`, `uml-state`, `uml-activity`, `uml-action`, `uml-decision`, `uml-merge`, `uml-initial-node`, `uml-final-node`, `uml-flow-final`, `uml-fork`, `uml-join`, `uml-lifeline`, `uml-activation`, `uml-fragment`, `uml-note`, `uml-package`. | UML 2.5 |
| R-UML-03 | UML relationship types: `uml-inheritance`, `uml-realisation`, `uml-composition`, `uml-aggregation`, `uml-association`, `uml-dependency`, `uml-assembly`, `uml-control-flow`, `uml-object-flow`. Sequence message types: `sync-message`, `async-message`, `return-message`, `create-message`, `destroy-message`, `self-message`. | UML 2.5 |
| R-UML-04 | Class properties stored in JSON: `{ stereotype, isAbstract, attributes: [{name, type, visibility, isStatic, isDerived, multiplicity, defaultValue, ordering}], methods: [{name, returnType, visibility, isStatic, isAbstract, parameters: [{name, type, direction}], ordering}] }` | — |
| R-UML-05 | UML relationship properties: `{ sourceMultiplicity, targetMultiplicity, sourceRole, targetRole, sourceNavigable, targetNavigable, stereotype }` | — |
| R-UML-06 | `sequence_messages` table for sequence diagrams (source/target lifeline, message type, sequence_order, fragment_id). | — |
| R-UML-07 | `sequence_fragments` table (operator, guard, parent_fragment, spanning_lifelines, vertical_extent). | — |
| R-UML-08 | Wireframe element types: `wf-page`, `wf-section`, `wf-header`, `wf-nav`, `wf-button`, `wf-input`, `wf-textarea`, `wf-select`, `wf-checkbox`, `wf-radio`, `wf-table`, `wf-image`, `wf-icon`, `wf-text`, `wf-link`, `wf-modal`, `wf-card`, `wf-list`, `wf-tab-group`, `wf-form`, `wf-placeholder`. | — |
| R-UML-09 | Wireframe relationship types: `wf-contains` (parent–child nesting), `wf-navigates-to` (page flow), `wf-binds-to` (data binding). | — |
| R-UML-10 | Wireframe properties stored in JSON: `{ placeholder, label, disabled, variant, columns (for tables), items (for lists/selects), src (for images) }` | — |
| R-UML-11 | Notation discriminator extended: `'archimate'` \| `'uml'` \| `'wireframe'`. | — |

### 16.2 Class Diagram (Implemented)

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

### 16.3 Component Diagram (Implemented)

| ID | Requirement | Source |
|----|-------------|--------|
| R-COMP-01 | Component shape: rectangle with component icon or `<<component>>` stereotype. | UML 2.5 |
| R-COMP-02 | Provided interface: lollipop (circle on stick) attached to component. | UML 2.5 |
| R-COMP-03 | Required interface: socket (half-circle) attached to component. | UML 2.5 |
| R-COMP-04 | Assembly connector: ball-and-socket rendering when provided meets required. | UML 2.5 |
| R-COMP-05 | Ports: small squares on component boundary as connection points. | UML 2.5 |
| R-COMP-06 | ArchiMate bridge: `application-component` can render in both ArchiMate and UML notation depending on viewpoint. | — |

### 16.4 Sequence Diagram (Implemented)

| ID | Requirement | Source |
|----|-------------|--------|
| R-SEQ-01 | Time-based renderer: Y-axis = time (down), X-axis = participant ordering. Not freely spatial. | UML 2.5 |
| R-SEQ-02 | Lifelines: rectangle header + dashed vertical line. Format `name : Type`. | UML 2.5 |
| R-SEQ-03 | Seven message types: synchronous (filled arrow), asynchronous (open arrow), return (dashed), create (dashed to new header), destroy (X), self-message (loop-back), found/lost. | UML 2.5 |
| R-SEQ-04 | Activation bars: thin rectangles on lifelines showing active processing. | UML 2.5 |
| R-SEQ-05 | Combined fragments: `alt`, `opt`, `loop`, `break`, `par`, `critical`. Pentagon tab with operator, guard in brackets, operands separated by dashed lines. | UML 2.5 |
| R-SEQ-06 | Interaction references: `ref` frame referencing another sequence diagram. | UML 2.5 |

### 16.5 Activity Diagram (Implemented)

| ID | Requirement | Source |
|----|-------------|--------|
| R-ACT-01 | Action node shape: rounded rectangle. | UML 2.5 |
| R-ACT-02 | Decision/merge node shape: diamond. | UML 2.5 |
| R-ACT-03 | Initial node: filled circle. Final node: double circle with filled inner. Flow final: circle with X. | UML 2.5 |
| R-ACT-04 | Fork/join bars: thick horizontal bar for concurrent flow split/merge. | UML 2.5 |
| R-ACT-05 | Control flow edges (solid with open arrow) and object flow edges (dashed with open arrow). | UML 2.5 |
| R-ACT-06 | Dedicated activity palette with action nodes and control nodes grouped separately. | — |

### 16.6 Use-Case Diagram (Implemented)

| ID | Requirement | Source |
|----|-------------|--------|
| R-UC-01 | Actor shape: stick figure. | UML 2.5 |
| R-UC-02 | Use-case shape: ellipse with centred name. | UML 2.5 |
| R-UC-03 | Dedicated use-case palette with actors and use cases. | — |

### 16.7 State Diagram (Shapes Implemented)

| ID | Requirement | Source |
|----|-------------|--------|
| R-STATE-01 | State shape: rounded rectangle with name. | UML 2.5 |
| R-STATE-02 | Dedicated state node component for rendering. | UML 2.5 |

### 16.8 Wireframe Diagrams (Implemented)

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

### 16.9 Batch Model Import (Agent Pathway)

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
13. [x] Export to SVG + PNG
14. [x] Flat SVG renderer with ELK layout + orthogonal edge routing + connection ports
15. [x] Element palette with shape icons, drag-to-create with name prompt
16. [x] Detail panel edit mode (name, status, layer, sublayer, description) with save/delete

### Phase 2 — Canvas Interaction + Model Tree (Weeks 4–6)

1. [x] Undo/redo (command pattern — create, delete, rename, move, relationship create/delete)
2. [x] Multi-select (Shift+click) + box select (Shift+drag)
3. [x] Keyboard shortcuts (Delete/Backspace, Ctrl+Z/Y, arrows, Shift+arrows, Escape, Ctrl+A)
4. [x] On-canvas relationship creation (drag from handle to target, notation-filtered type picker)
5. [x] Snap to grid (10px) + alignment snaplines + alignment toolbar + distribution tools
6. [x] On-canvas label editing (double-click to rename)
7. [x] Model tree panel (notation-grouped folders, search, orphan detection, drag to canvas)
8. [x] Connector waypoints (drag handles on edges, edge context menu)
9. [x] Minimap
10. [x] Populate valid_relationships table + enforce on create

### Phase 3 — Multi-Notation + Data Overlays (Weeks 7–10)

1. [x] Schema extensions (notation discriminator, UML + wireframe types)
2. [x] Batch model import/export API (agent creation pathway)
3. [x] UML Class diagram shapes + relationships
4. [x] UML Component diagram shapes
5. [ ] Class editing panel (attributes, methods, visibility)
6. [x] Wireframe shapes (page, section, controls, table, nav, list, form, modal, card, feedback)
7. [x] Wireframe nesting renderer (spatial containment via parent_id)
8. [x] Wireframe palette + inline text editing
9. [x] Colour-by-property / conditional formatting
10. [x] Layer visibility toggle + lock + opacity slider + relationship layer toggle
11. [x] ArchiMate XML import/export
12. [x] CSV import/export (Archi-compatible 3-file format)

### Phase 4 — Sequence Diagrams + Advanced (Weeks 10–12)

1. [x] Sequence diagram renderer (lifeline, activation, fragment nodes; message edges)
2. [x] Lifelines, messages (sync/async/return/create/destroy/self), activation bars, combined fragments
3. [x] Activity diagram viewpoint (action, decision/merge, initial/final/flow-final, fork/join)
4. [x] Use-case diagram (actor, use-case shapes, dedicated palette)
5. [x] Heatmap overlays (colour intensity mapped to numeric properties)
6. [ ] PDF export

### Phase 5 — Projects + Governance (UAT Prep)

1. [ ] Projects table, CRUD API, project-scoped data routes
2. [ ] Project selector UI in toolbar
3. [ ] Working/governed area column on elements, relationships, views
4. [ ] Promote/demote API with basic validation (name + description required)
5. [ ] ModelTree area tabs (All / Working / Governed)
6. [ ] Canvas visual indicator for working-area elements
7. [ ] Per-project model file save/load

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
- [x] SVG and PNG export
- [x] Flat renderer with ELK layout, orthogonal edge routing, connection ports
- [x] Element palette with ArchiMate shape icons and drag-to-create

### Canvas Interaction

- [x] Undo/redo (command pattern covering create, delete, rename, move, relationship create/delete)
- [x] Multi-select (Shift+click) and box select (Shift+drag)
- [x] Keyboard shortcuts (Delete/Backspace, Escape, Ctrl+A, arrows, Shift+arrows)
- [x] On-canvas relationship creation via drag-from-handle with notation-filtered type picker
- [x] Snap to grid (10px) with dot-pattern visual overlay
- [x] Alignment snaplines visible during drag
- [x] Alignment toolbar (align left/right/centre, distribute horizontal/vertical)
- [x] Model tree panel with notation-grouped folders, search, orphan detection, drag to canvas
- [x] ArchiMate metamodel validation on relationship creation (valid_relationships table populated)
- [x] Edge context menus (line style selection, delete)
- [x] Node context menus (highlight mode, add to view, navigate)

### UML

- [x] Class diagram with 3-compartment shapes and visibility markers
- [x] Component diagram with component icon
- [x] Seven UML relationship types with correct arrowheads (inheritance, realisation, composition, aggregation, association, dependency, assembly)
- [x] Sequence diagram with lifelines, messages (sync/async/return/create/destroy/self), activation bars, combined fragments
- [x] Activity diagram with action, decision/merge, initial/final/flow-final, fork/join nodes
- [x] Use-case diagram with actor and use-case shapes
- [x] State diagram shapes (rounded rectangle)
- [x] Note and package shapes with fallback rendering
- [x] Notation-specific palettes for class/component, sequence, activity, and use-case views

### Wireframes

- [x] Page, section, card, modal, header, and form control shapes in lo-fi wireframe style
- [x] Deep nesting with spatial containment rendering (parent_id)
- [x] Page flow via wf-navigates-to relationships
- [x] Wireframe palette with categories (layout, controls, data, navigation, content)
- [x] Table, list, form, nav, tab-group, and feedback shapes

### Agent Model Creation

- [x] Batch model import via JSON (POST /api/import/model-batch)
- [x] Batch model export for round-trip (GET /api/export/model-batch)
- [x] Upsert semantics with validation before commit
- [x] Children array support for nested wireframe/UML package structures

### Import / Export

- [x] ArchiMate Open Exchange Format XML import and export
- [x] CSV import/export (Archi-compatible multi-file format)
- [x] SVG export (vector)
- [x] PNG export (2x retina)
- [ ] PDF export

### Quality

- [x] TypeScript strict mode
- [x] Dev server accessible from LAN (0.0.0.0 binding)
- [ ] 200+ elements render without lag at Context zoom tier
- [x] Unit tests for: shape registry, edge styles, notation routing, layout computation, schema validation
- [x] All dependencies open-source (MIT/Apache/BSD/MPL-2.0)
- [x] Error boundaries prevent single component failure from crashing the application
- [x] Position save retries once on failure with user notification in status bar

### Projects & Governance

- [ ] Multiple projects with create/rename/delete
- [ ] Project selector in toolbar with instant switching
- [ ] Elements, relationships, views scoped to current project
- [ ] Working/governed areas with promote/demote
- [ ] Promotion validation: name and description required
- [ ] Visual indicator for working-area elements on canvas
- [ ] Model tree area filtering (All / Working / Governed)
- [ ] Per-project .archvis save/load

---

## 19. Quality / Resilience Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| R-QUAL-01 | Error boundaries prevent a single component failure from crashing the application. Each major panel (canvas, detail panel) is wrapped independently so failures are isolated and recoverable. | Implemented |
| R-QUAL-02 | Position save retries once on failure. If the retry also fails, a warning is shown to the user in the status bar. No silent data loss. | Implemented |
| R-QUAL-03 | Unit test coverage for notation registries (shape definitions, edge styles), type routing (notation family detection, node/edge type mapping), layout computation (order maps, band recomputation), and schema validation (Zod schemas for batch import). | Implemented |
| R-QUAL-04 | Metamodel enforcement prevents creation of invalid relationships. The valid_relationships table is populated from the ArchiMate metamodel, and only valid relationship types are offered during on-canvas connection creation. Invalid connections are hard-disabled, not merely dimmed. | Implemented |

---

## 20. Diagram-Type Layout Requirements

Each diagram type has distinct layout conventions that auto-layout must respect. These are derived from UML 2.5 specification conventions and reference tool behaviour (Archi, Sparx EA).

### 20.1 ArchiMate Layered View

| ID | Requirement |
|----|-------------|
| R-LAY-10 | Elements grouped into layer bands (Motivation at top, Implementation at bottom) |
| R-LAY-11 | Within layers, elements sorted by sublayer ordering from configuration |
| R-LAY-12 | Orthogonal edge routing with connection ports |
| R-LAY-13 | Layer bands auto-resize to fit their children |

### 20.2 UML Class Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-20 | Inheritance hierarchies flow UPWARD (subclass at bottom, superclass at top) |
| R-LAY-21 | Associated classes placed horizontally adjacent where possible |
| R-LAY-22 | Packages render as container rectangles grouping related classes |
| R-LAY-23 | Class box width auto-sizes based on longest attribute/method text (180–400px) |

### 20.3 UML Component Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-30 | Dependency chains flow LEFT-TO-RIGHT (provider left, consumer right) |
| R-LAY-31 | Provided interfaces (lollipop) on the right side of components |
| R-LAY-32 | Required interfaces (socket) on the left side of components |
| R-LAY-33 | Subsystem boundaries as container rectangles |

### 20.4 UML Use Case Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-40 | System boundary rectangle containing all use cases, labelled with system name |
| R-LAY-41 | Sub-system boundaries as nested rectangles within the main boundary |
| R-LAY-42 | Actors placed OUTSIDE the boundary — primary actors left, secondary right |
| R-LAY-43 | Use cases arranged in 1–2 vertical columns inside the boundary |
| R-LAY-44 | Association lines from actors cross the boundary cleanly (straight lines preferred) |

### 20.5 UML Activity Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-50 | TOP-TO-BOTTOM flow: initial node at top, actions flow downward, final node at bottom |
| R-LAY-51 | Decision diamonds create horizontal branches that continue downward |
| R-LAY-52 | Fork/join bars create parallel vertical tracks flowing side-by-side |
| R-LAY-53 | Swimlanes (optional) as vertical partitions grouping actions by actor/role |
| R-LAY-54 | Guards on decision branches as labels near outgoing edges |

### 20.6 UML Sequence Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-60 | X-axis = participant ordering (lifelines left-to-right, evenly spaced) |
| R-LAY-61 | Y-axis = time (messages flow downward, earlier messages higher) |
| R-LAY-62 | All messages strictly horizontal (no diagonal routing) |
| R-LAY-63 | Activation bars auto-sized from first incoming to last outgoing message |
| R-LAY-64 | Combined fragments span the width of involved lifelines |

### 20.7 UML State Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-70 | LEFT-TO-RIGHT flow for linear state machines, TOP-TO-BOTTOM for branching |
| R-LAY-71 | Initial state at the top-left or far-left |
| R-LAY-72 | Final state(s) at the bottom-right or far-right |
| R-LAY-73 | Composite states as container rectangles with sub-states inside |

### 20.8 Wireframe Diagram

| ID | Requirement |
|----|-------------|
| R-LAY-80 | Nested containment layout (page → section → controls via parent_id) |
| R-LAY-81 | No graph layout — positional/manual placement with grid snap |
| R-LAY-82 | Page flow shown as navigation arrows between page containers |

### 20.9 Layout Algorithm Selection

| Diagram Type | Algorithm | Direction | Custom |
|-------------|-----------|-----------|--------|
| ArchiMate Layered | Hierarchical (ELK) | Down | Layer band grouping |
| Class Diagram | Hierarchical (ELK) | Up | Package grouping |
| Component Diagram | Hierarchical (ELK) | Right | Port-aware placement |
| Use Case Diagram | Custom | N/A | System boundary partitioning |
| Activity Diagram | Hierarchical (ELK) | Down | Swimlane partitioning |
| Sequence Diagram | Custom | N/A | Time-ordered slot layout |
| State Diagram | Hierarchical (ELK) | Right/Down | Composite state nesting |
| Wireframe | Manual | N/A | Nested containment |

---

## 21. Functional Parity Audit

Benchmarked against **Archi** (ArchiMate, 172pp manual) and **Sparx EA** (UML/data/wireframes, scoped subset of 3300pp manual). Each row is a trackable requirement with a status lifecycle.

### Status Lifecycle

| Status | Meaning |
|--------|---------|
| Not started | No code exists |
| In progress | Partial implementation |
| Implemented | Code exists, untested |
| Verified | Tested, confirmed working |
| Working | Verified and fit for purpose |
| N/A | Not applicable to arch-vis |

### 21.1 Model Management

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 1.1 | Create new model/project | Y | Y | Implemented | SQLite DB + seed data on first run |
| 1.2 | Open / save / close model file | Y | Y | Not started | Auto-persists to SQLite; no file-based save/open/close workflow |
| 1.3 | Model tree (elements by type/layer) | Y | Y | Implemented | Panel with layer folders, expand/collapse |
| 1.4 | User sub-folders in model tree | Y | Y | Not started | Domains exist but no arbitrary folder organisation |
| 1.5 | Search/filter model tree | Y | Y | Implemented | Filter by name, type, domain |
| 1.6 | Find and replace (element names) | Y | Y | Implemented | Ctrl+H; search + individual/bulk replace |
| 1.7 | Drag elements between tree and canvas | Y | Y | Implemented | Tree → canvas adds existing element to view |
| 1.8 | Tree ↔ canvas selection sync | Y | Y | Implemented | Click tree → selects on canvas and vice versa |
| 1.9 | Orphan detection (unused elements) | Y | N | Implemented | Italic font in tree for elements not in any view |
| 1.10 | Duplicate element / view | Y | Y | Not started | |
| 1.11 | Change element type | Y | Y | Implemented | Via PUT API; unclear if UI exposes this |

### 21.2 Views / Diagrams

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 2.1 | Create / open / rename / delete views | Y | Y | Implemented | Via view menu and API |
| 2.2 | Multiple views open as tabs | Y | Y | Not started | Single active view only |
| 2.3 | Viewpoints (restrict palette to relevant types) | Y | Y | Implemented | Notation-family filtering (ArchiMate, UML, wireframe) |
| 2.4 | View reference (link to another view on canvas) | Y | Y | Not started | |
| 2.5 | Generate view from selected elements | Y | N | Not started | |
| 2.6 | Diagram slideshow | N | Y | Not started | Low priority |

### 21.3 Canvas Interaction

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 3.1 | Pan (scroll/drag) | Y | Y | Implemented | |
| 3.2 | Zoom (scroll wheel) | Y | Y | Implemented | |
| 3.3 | Minimap / outline | Y | Y | Implemented | xyflow minimap component |
| 3.4 | Select / multi-select (Shift+click, box select) | Y | Y | Implemented | Shift+click toggle, Shift+drag box |
| 3.5 | Select all (Ctrl+A) | Y | Y | Implemented | |
| 3.6 | Alignment tools (left, centre, right, distribute) | Y | Y | Implemented | Toolbar visible when 2+ nodes selected |
| 3.7 | Snap to grid | Y | Y | Implemented | 10px grid with dot-pattern overlay |
| 3.8 | Alignment snaplines / guides | Y | Y | Implemented | Orange dashed lines at 5px threshold |
| 3.9 | Undo / redo (Ctrl+Z / Ctrl+Y) | Y | Y | Implemented | Command pattern with past/future stacks |
| 3.10 | Copy / paste elements on canvas (Ctrl+C/V) | Y | Y | Implemented | Ctrl+C/V/X with clipboard store + offset paste |
| 3.11 | Delete from view (keep in model) vs delete from model | Y | Y | Implemented | Delete = remove from view; Shift+Delete = delete from model; context menu has both |
| 3.12 | Z-order (bring to front / send to back) | Y | Y | Implemented | z_index on view_elements; context menu Bring to Front / Send to Back |
| 3.13 | Full screen mode | Y | N | Implemented | F11 toggle; hides all panels + status bar |
| 3.14 | Keyboard nudge (arrow keys) | Y | Y | Implemented | 1px normal, 10px with Shift |
| 3.15 | Inline label editing (double-click) | Y | Y | Implemented | Enter to commit, Escape to cancel |
| 3.16 | Resize elements (drag handles) | Y | Y | Implemented | |
| 3.17 | Format painter (copy appearance) | Y | N | Not started | |

### 21.4 Element Creation & Properties

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 4.1 | Create from palette (drag to canvas) | Y | Y | Implemented | Prompts for name, creates in DB + view |
| 4.2 | Create from tree (right-click → new) | Y | Y | Implemented | |
| 4.3 | Properties panel (name, type, description) | Y | Y | Implemented | 3-tab: Properties, Relationships, Provenance |
| 4.4 | Custom properties (key-value pairs) | Y | Y | Implemented | JSON properties blob in DB |
| 4.5 | Per-element appearance override (fill, font, border) | Y | Y | Implemented | style_overrides JSON in view_elements; colour pickers in detail panel |
| 4.6 | Specializations (sub-types with badges) | Y | Y | Implemented | 55 specialisations with amber pill badges |
| 4.7 | Notes (annotation boxes on canvas) | Y | Y | Implemented | AnnotationNode with sticky-note style; available in all palettes |
| 4.8 | Groups (visual container, no semantic meaning) | Y | Y | Implemented | GroupNode with dashed border + label tab; uses ArchiMate grouping type |
| 4.9 | Legend (colour/shape key on canvas) | Y | Y | Implemented | Auto-generated from visible elements; toggleable overlay |
| 4.10 | Container elements (visual nesting) | Y | Y | Implemented | parent_id hierarchy for nesting |

### 21.5 Relationships / Connectors

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 5.1 | Create by dragging between elements | Y | Y | Implemented | Handle drag → target element |
| 5.2 | Relationship type picker (valid types only) | Y | Y | Implemented | Filtered by metamodel valid_relationships |
| 5.3 | Magic connector (create element + relationship in one step) | Y | Y | Not started | |
| 5.4 | Waypoint / bend point editing | Y | Y | Implemented | Ctrl+click to insert, drag handles, segment slides |
| 5.5 | Connection routing modes (direct, orthogonal, bezier) | Y | Y | Implemented | Straight, step, bezier via edge context menu |
| 5.6 | Connector labels (name, multiplicity, role) | N | Y | In progress | Multiplicity + role on UML associations only |
| 5.7 | Change connector type after creation | N | Y | Not started | Must delete and recreate |
| 5.8 | Reverse connector direction | N | Y | Not started | |
| 5.9 | Relationship tooltip on hover | Y | N | Implemented | Shows type, source→target, label on 300ms hover |
| 5.10 | Show/hide relationships by type | Y | Y | In progress | Layer visibility toggle; not per-relationship-type |
| 5.11 | Self-referencing relationships | Y | Y | Implemented | Self-message in sequence diagrams |

### 21.6 ArchiMate-Specific

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 6.1 | All ArchiMate 3.2 element types | Y | Y | Implemented | 48+ types in shape registry |
| 6.2 | All ArchiMate 3.2 relationship types | Y | Y | Implemented | 11 types with correct marker rendering |
| 6.3 | Notation shapes (icon + box views) | Y | N | Implemented | Shape registry with aspect-specific geometries |
| 6.4 | Layer-coloured elements | Y | N | Implemented | 7 layer colour palettes |
| 6.5 | Junction element (And/Or) | Y | N | Implemented | In schema and types |
| 6.6 | Named ArchiMate viewpoints (23 spec viewpoints) | Y | N | Not started | Custom viewpoint types only; no ArchiMate-named viewpoints |
| 6.7 | Model validation UI (ArchiMate rules) | Y | N | Not started | Metamodel validation in API; no validator panel |
| 6.8 | Specializations manager UI | Y | N | Not started | Data exists; no management interface |

### 21.7 UML Diagrams

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 7.1 | Class diagram (classes, attributes, methods, visibility) | N | Y | Implemented | 3-compartment, visibility markers (+/-/#/~) |
| 7.2 | Inheritance / generalization | N | Y | Implemented | Hollow-triangle target marker |
| 7.3 | Association with multiplicity + role names | N | Y | Implemented | Labels on UML associations |
| 7.4 | Abstract classes, interfaces, enums | N | Y | Implemented | Distinct shapes for each |
| 7.5 | Use case diagram (actors, use cases, boundary) | N | Y | Implemented | Stick figure, ellipse, system boundary |
| 7.6 | Include / extend relationships | N | Y | In progress | Dependency exists; no dedicated <<include>>/<<extend>> stereotypes |
| 7.7 | Activity diagram (actions, decisions, forks/joins) | N | Y | Implemented | Rounded rects, diamonds, bars |
| 7.8 | Swimlanes / activity partitions | N | Y | Implemented | UmlSwimlaneNode; vertical lane container with header |
| 7.9 | Sequence diagram (lifelines, messages, activation) | N | Y | Implemented | 7 message types |
| 7.10 | Combined fragments (alt, opt, loop, par) | N | Y | Implemented | SequenceFragmentNode |
| 7.11 | State machine diagram (states, transitions) | N | Y | Implemented | UmlStateNode |
| 7.12 | Composite / nested states | N | Y | Implemented | Composite state renders as resizable container; children nest via parent_id |
| 7.13 | Component diagram (components, interfaces, ports) | N | Y | Implemented | Lollipop + socket notation |
| 7.14 | Package diagram | N | Y | Implemented | UmlPackageNode with tab-rectangle; supports child nesting |
| 7.15 | Object diagram (instances) | N | Y | Not started | |

### 21.8 Data Modelling

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 8.1 | Conceptual data model (entities + relationships) | N | Y | Implemented | dm-entity type + DmEntityNode; viewpoint data_conceptual |
| 8.2 | Logical data model (ERD) | N | Y | Implemented | dm-entity with attributes; PK/FK indicators |
| 8.3 | Physical data model (tables, columns, keys, indexes) | N | Y | Implemented | dm-table type with column list, PK/FK/IX markers |
| 8.4 | Data type management | N | Y | In progress | Column types stored in attributes; no dedicated type manager |
| 8.5 | Primary / foreign key definition | N | Y | Implemented | isPK/isFK flags on attributes; visual indicators in node |
| 8.6 | DDL generation (SQL from model) | N | Y | Not started | |
| 8.7 | Database schema import (reverse-engineer) | N | Y | Not started | |
| 8.8 | Data modelling notations (IDEF1X, IE) | N | Y | Not started | Crow's foot cardinality on edges |

### 21.9 Wireframes / UI Modelling

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 9.1 | Page containers | N | Y | Implemented | WfPageNode — untested in UI |
| 9.2 | Form controls (button, input, select, etc.) | N | Y | Implemented | WfControlNode — untested in UI |
| 9.3 | Data display (table, list) | N | Y | Implemented | WfTableNode, WfListNode — untested in UI |
| 9.4 | Navigation elements | N | Y | Implemented | WfNavNode — untested in UI |
| 9.5 | Content placeholders | N | Y | Implemented | In properties — untested in UI |
| 9.6 | Deep nesting (sections within pages) | N | Y | Implemented | parent_id hierarchy — untested in UI |
| 9.7 | Page-to-page navigation flow | N | Y | Implemented | navigates-to relationship — untested in UI |
| 9.8 | Data binding indicators | N | Y | Implemented | binds-to relationship — untested in UI |
| 9.9 | Modal / dialog | N | Y | Implemented | Modal variant — untested in UI |
| 9.10 | Feedback / alert components | N | Y | Implemented | WfFeedbackNode — untested in UI |

### 21.10 Layout

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 10.1 | Auto-layout (hierarchical / tree) | N | Y | Implemented | ELK with per-viewpoint direction |
| 10.2 | Circular layout | N | Y | Not started | |
| 10.3 | Force-directed layout | N | Y | Not started | |
| 10.4 | Manual positioning with saved positions | Y | Y | Implemented | Persisted to view_elements table |
| 10.5 | Auto-route connections (obstacle-avoiding) | N | Y | Implemented | A* orthogonal routing |
| 10.6 | Autosize elements to content | N | Y | Not started | |

### 21.11 Import / Export

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 11.1 | ArchiMate XML import (Open Exchange) | Y | N | Implemented | POST /api/import/archimate-xml |
| 11.2 | ArchiMate XML export | Y | N | Implemented | |
| 11.3 | CSV import | Y | Y | Implemented | Archi-compatible 3-file format |
| 11.4 | CSV export | Y | Y | Implemented | |
| 11.5 | XMI / UML interchange import | N | Y | Not started | |
| 11.6 | XMI export | N | Y | Not started | |
| 11.7 | Export view as PNG | Y | Y | Implemented | 2x retina |
| 11.8 | Export view as SVG | Y | N | Implemented | Filters out minimap/controls |
| 11.9 | Export view as PDF | N | Y | Implemented | jsPDF with auto landscape/portrait |
| 11.10 | Copy image to clipboard | Y | Y | Implemented | Clipboard API with PNG blob |
| 11.11 | Import/merge another model | Y | Y | Not started | |
| 11.12 | Print diagram | Y | Y | Implemented | Ctrl+P; print CSS hides panels; Export menu button |

### 21.12 Reporting

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 12.1 | HTML report (navigable model) | Y | Y | Implemented | Self-contained HTML with sidebar nav, search, dark/light mode |
| 12.2 | Document report (RTF/DOCX) | N | Y | Not started | |
| 12.3 | Custom report templates | Y | Y | Not started | |

### 21.13 Analysis & Navigation

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 13.1 | Relationship navigator (incoming/outgoing) | Y | Y | Implemented | Context menu + Graphology traversal |
| 13.2 | Visual relationship explorer | Y | Y | In progress | Highlight/dim mode; no dedicated explorer window |
| 13.3 | Relationship matrix (source × target grid) | N | Y | Not started | |
| 13.4 | Diagram filters (fade/hide by criteria) | N | Y | In progress | Layer visibility + data overlay; not per-type |
| 13.5 | Impact analysis / traceability | N | Y | Not started | |

### 21.14 Appearance & Theme

| # | Function | Archi | Sparx | Status | Notes |
|---|----------|:-----:|:-----:|--------|-------|
| 14.1 | Dark / light theme | N | N | Implemented | Zustand store + CSS variables |
| 14.2 | Per-element appearance override | Y | Y | Not started | Theme-driven only currently |
| 14.3 | Conditional formatting / colour overlay | N | N | Implemented | Colour-by-property, heatmaps, status badges |
| 14.4 | Progressive zoom tiers | N | N | Implemented | 5 tiers from dots-only to full notation |

### 21.15 Audit Summary

| Category | Items | Not Started | In Progress | Implemented | Verified | Working |
|----------|:-----:|:-----------:|:-----------:|:-----------:|:--------:|:-------:|
| Model Management | 11 | 4 | 0 | 7 | 0 | 0 |
| Views/Diagrams | 6 | 3 | 0 | 3 | 0 | 0 |
| Canvas Interaction | 17 | 3 | 0 | 14 | 0 | 0 |
| Element Creation | 10 | 3 | 0 | 7 | 0 | 0 |
| Relationships | 11 | 4 | 2 | 5 | 0 | 0 |
| ArchiMate | 8 | 3 | 0 | 5 | 0 | 0 |
| UML Diagrams | 15 | 2 | 1 | 12 | 0 | 0 |
| Data Modelling | 8 | 2 | 1 | 5 | 0 | 0 |
| Wireframes | 10 | 0 | 0 | 10 | 0 | 0 |
| Layout | 6 | 3 | 0 | 3 | 0 | 0 |
| Import/Export | 12 | 6 | 0 | 6 | 0 | 0 |
| Reporting | 3 | 3 | 0 | 0 | 0 | 0 |
| Analysis/Navigation | 5 | 2 | 2 | 1 | 0 | 0 |
| Appearance/Theme | 4 | 1 | 0 | 3 | 0 | 0 |
| **TOTAL** | **126** | **32** | **6** | **88** | **0** | **0** |

### 21.15a Performance

| # | Function | Status | Notes |
|---|----------|--------|-------|
| P.1 | Canvas renders 200+ elements without lag | Not verified | Full Model (Flat) view is slow to load and clunky to interact with |
| P.2 | Edge routing doesn't re-run on every render | Implemented | Memoised routedPaths useMemo; needs verification |
| P.3 | Node components properly memoised | In progress | Some nodes use memo(); not all selectors optimised |
| P.4 | Position save debounced | Implemented | Timer ref for nudge saves |
| P.5 | Layout computation cached | In progress | buildOrderMaps memoised; full layout recompute on view switch |

### 21.16 Build Priority (Gaps)

**Tier 1 — Table stakes (must-have for any modelling tool):**
- 3.10 Copy/paste on canvas
- 4.7 Notes (annotation boxes)
- 4.8 Groups (visual container)
- 4.9 Legend (colour/shape key)
- 3.11 Delete from view vs delete from model (clarify in UI)
- 4.5 Per-element appearance override
- 5.9 Relationship tooltip on hover

**Tier 2 — Missing notation families:**
- 8.1–8.8 Data modelling (ERD, physical model) — 8 items, entirely new
- 7.8 Swimlanes for activity diagrams
- 7.14 Package diagram
- 7.12 Composite / nested states

**Tier 3 — Deliverable output:**
- 12.1 HTML report generation
- 11.9 PDF export
- 11.12 Print support

**Tier 4 — Power-user features:**
- 13.3 Relationship matrix
- 1.6 Find and replace
- 2.2 Multiple views as tabs
- 5.3 Magic connector
- 13.5 Impact analysis
- 3.12 Z-order (bring to front / send to back)

---

## 22. Embeddable Library Architecture

arch-vis is **library-first, standalone-second**. It is designed primarily as an embeddable component for host applications (AI chat workbenches, EA governance tools, PFC/Helix), while also functioning as a standalone modelling tool for direct use.

### 22.1 Deployment Modes

| ID | Requirement |
|----|-------------|
| R-LIB-01 | arch-vis is structured as importable packages: `core` (model, schema, CRUD — pure TypeScript, no React), `canvas` (xyflow canvas, notation, layout — React), `shell` (full/workbench shells — React), `standalone` (Express + shell + core — the current app) |
| R-LIB-02 | Host applications import `core` and `canvas` packages directly. They provide their own shell or use `shell` components. The standalone app is all packages wired together with a default Express server. |
| R-LIB-03 | **No code duplication** between modes. Workbench mode and full modeller mode share the same canvas component, same notation renderers, same layout engines, same API layer. Differences are in shell configuration only. |
| R-LIB-04 | The `core` package exposes a **programmatic API** (direct function calls, SDK-style) — not REST-only. The Express routes in the standalone app are thin wrappers over these same functions. Agents and host apps call functions directly without HTTP overhead. |

### 22.2 Canvas Modes

| ID | Requirement |
|----|-------------|
| R-MODE-01 | The canvas supports two shell modes: `full` (current modeller — all panels, menus, detail panel, full palette) and `workbench` (embedded in host application — compact palette, minimal chrome, no menu bar) |
| R-MODE-02 | Both modes use the **identical** `XYFlowCanvas` component. The difference is in the surrounding shell — which panels, toolbars, and menus are shown. |
| R-MODE-03 | Workbench mode includes: compact element palette (notation-filtered), pan/zoom/fit controls, minimap (optional), and basic node interaction (drag, rename, delete, connect). |
| R-MODE-04 | Workbench mode omits: menu bar, model tree panel, full detail panel (or shows a minimal variant), layer visibility panel, data overlay panel. |
| R-MODE-05 | **Shell expansion:** The workbench shell supports a "Full Modeller" toggle that swaps to the full shell layout in-place — no window change, no context loss. The host application's chat panel remains accessible (collapses to a sidebar or overlay). |
| R-MODE-06 | The full modeller shell supports a "Back to Workbench" action that returns to the compact layout, restoring the host chat context. |

### 22.3 Host Integration

| ID | Requirement |
|----|-------------|
| R-HOST-01 | The canvas component accepts model data via props or a store — no assumption about where data comes from. SQLite is one backend; the host may provide its own. |
| R-HOST-02 | All callbacks (element create, update, delete, relationship CRUD) are exposed as props. The host application wires these to its own persistence and governance layer. |
| R-HOST-03 | The provenance provider is a pluggable interface: the host supplies a function that resolves `source_session_id` to session metadata (summary, agent identity, chat link). arch-vis calls this provider to populate the provenance tab and on-canvas popovers. |
| R-HOST-04 | The host application can push model changes into the canvas (e.g. an AI agent creates elements) — the canvas reactively updates from the store. |
| R-HOST-05 | The host application provides a URL template for "drill into session" links. arch-vis substitutes `{session_id}` in the template to generate navigation links. |

### 22.4 Agent Integration

| ID | Requirement |
|----|-------------|
| R-AGENT-01 | AI agents create and modify elements using the same API as human users. There is no separate "agent API" — agents are peers. |
| R-AGENT-02 | Agent-created elements carry provenance metadata: `created_by` (agent identity), `source: 'chat'`, `source_session_id` (links to the chat session), `confidence` (agent's certainty). |
| R-AGENT-03 | Agent-created elements default to `status: 'provisional'`. They appear on the canvas with a visual indicator (e.g. dashed border, provisional badge) distinguishing them from approved elements. |
| R-AGENT-04 | Promotion workflow: a human (or authorised governance agent) explicitly sets `status: 'active'` to approve a provisional element. This is a standard `updateElement` call — no special promotion API. |
| R-AGENT-05 | The batch import API (`POST /api/import/model-batch`) is the primary agent creation pathway. It supports `created_by` and `source_session_id` on each element. |
| R-AGENT-06 | Agents with appropriate roles/permissions can create diagrams. Not any agent can write to the model — permission is managed by the host application, not arch-vis. |

### 22.5 Provenance Popover (On-Canvas)

| ID | Requirement |
|----|-------------|
| R-PPOV-01 | Elements with provenance data show a small indicator icon (e.g. chain-link or AI badge) in a consistent position on the node shape. |
| R-PPOV-02 | Clicking the provenance indicator opens a popover (not a modal) displaying: agent identity, creation date, confidence score, provisional/approved status, and a list of related chat sessions with one-line summaries. |
| R-PPOV-03 | Each session entry in the popover is a clickable link that navigates to the full session in the host application (using the URL template from R-HOST-05). |
| R-PPOV-04 | The popover includes an "Interrogate" action — a link that opens the host chat with this element pre-loaded as context, allowing the user to ask the agent why this element exists or how it was derived. |
| R-PPOV-05 | The popover data is fetched lazily (on click, not on render) via the provenance provider (R-HOST-03). |
| R-PPOV-06 | The popover works in both `full` and `workbench` shell modes.  |

### 22.6 Two-Way Model Access

| ID | Requirement |
|----|-------------|
| R-2WAY-01 | The host application can load an existing approved model into the canvas for review and discussion (read-only or read-write depending on permissions). |
| R-2WAY-02 | The canvas supports a read-only mode where navigation, zoom, and selection work but editing controls (palette, inline edit, delete) are disabled. |
| R-2WAY-03 | An agent can query the model (fetch elements by filter) to analyse and discuss architecture in the chat — the model is bidirectionally accessible. |
