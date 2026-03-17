# arch-vis Human UAT Test Plan

**Version:** 2.0
**Date:** 2026-03-17
**Tester:** JT
**Server:** http://192.168.10.150:5173 (Vite) + http://192.168.10.150:3001 (API)
**Pre-requisite:** Start API with `UAT_VERIFY=true npx tsx server/index.ts` to enable verification logging.

---

## How to Use This Plan

- Work through each section in order. Sections are grouped by functional area.
- After each mutation action, **check for a toast notification** (bottom-right) confirming the operation.
- Mark each step: **P** (pass), **F** (fail), **S** (skip), **B** (bug found).
- Record bugs in the **Bug Log** at the end with section/step reference.
- At the end, check `data/uat-log.jsonl` and `GET /api/uat/report` for server-side verification.
- Estimated time: 2–3 hours for a thorough pass.

---

## 1. Projects

### 1.1 Project Lifecycle

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 1.1.1 | Open app — note toolbar shows project name | Default project shown (e.g. "Default Project") | |
| 1.1.2 | Click project dropdown | List of projects appears with current project ticked | |
| 1.1.3 | Click "+ New Project" | Inline text input appears | |
| 1.1.4 | Type "UAT Test Project" and press Enter | Project created, toast "Project created", dropdown stays open | |
| 1.1.5 | Click "UAT Test Project" in the list | Switches project, toast "Switched to project", canvas clears (new project is empty) | |
| 1.1.6 | Click pencil icon on "UAT Test Project" | Rename input appears with current name | |
| 1.1.7 | Change name to "My UAT Project", press Enter | Toast "Project updated", name updated in dropdown | |
| 1.1.8 | Switch back to default project | Seed data reappears on canvas | |
| 1.1.9 | Click X icon on "My UAT Project" | Confirm dialog appears | |
| 1.1.10 | Confirm deletion | Toast "Project deleted", project removed from list | |
| 1.1.11 | Try to delete the last remaining project | Delete button should not appear (or action prevented) | |
| 1.1.12 | Press Escape while creating a project | Input closes, no project created | |

### 1.2 Working / Governed Areas

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 1.2.1 | Open a view with seed data elements | Elements visible, no amber dashed borders (all governed) | |
| 1.2.2 | Create a new element via palette | New element appears with dashed amber border + "W" badge (working area) | |
| 1.2.3 | Check Model Tree | New element shows "W" badge in tree | |
| 1.2.4 | Right-click working element → "Promote to Governed" (without description) | Toast error: name and description required | |
| 1.2.5 | Add a description to the element in detail panel, then promote again | Toast "Promoted", border becomes solid, badge removed | |
| 1.2.6 | Right-click the now-governed element → "Demote to Working" | Toast confirms, element gets dashed amber border + "W" badge | |
| 1.2.7 | In Model Tree, click area tabs: All / Working / Governed | Tree filters correctly — Working shows only "W" items, Governed shows only solid items | |
| 1.2.8 | Check ViewSwitcher | Views show "W" or "G" badge next to each view name | |
| 1.2.9 | Create a new view | New view defaults to Working area | |
| 1.2.10 | Create a new relationship between two elements | New relationship defaults to Working area | |

### 1.3 Per-Project Isolation

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 1.3.1 | Create a second project "Isolation Test" | Toast confirms | |
| 1.3.2 | Switch to "Isolation Test" | Canvas empty, Model Tree empty, View Switcher empty | |
| 1.3.3 | Create an element in "Isolation Test" | Element appears, only in this project | |
| 1.3.4 | Switch back to default project | Original seed data shown, "Isolation Test" element NOT visible | |
| 1.3.5 | Delete "Isolation Test" project | All its data gone | |

---

## 2. Element CRUD

### 2.1 Create Elements

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.1.1 | Open an ArchiMate view (e.g. "Full Model (Flat)") | View loads with elements positioned in layer bands | |
| 2.1.2 | Click a palette item (e.g. "Business Actor") | Element appears on canvas, toast "Element created" | |
| 2.1.3 | Click the new element | Detail panel opens showing Properties tab | |
| 2.1.4 | Check element has correct archimate_type | Shows "business-actor" in Properties | |
| 2.1.5 | Check element appears in Model Tree under Business layer | Listed in correct folder | |
| 2.1.6 | Double-click the element name on canvas | Inline text editor appears | |
| 2.1.7 | Type a new name, press Enter | Name updates on canvas and in detail panel, toast "Element updated" | |
| 2.1.8 | Press Escape during inline edit | Edit cancelled, original name restored | |

### 2.2 Edit Elements

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.2.1 | Select an element, change its name in detail panel, click Save | Toast "Element updated", name updates on canvas | |
| 2.2.2 | Change element description to a paragraph of text | Toast confirms, description persisted | |
| 2.2.3 | Change element status: active → deprecated | Toast confirms | |
| 2.2.4 | Change element status: deprecated → retired | Toast confirms | |
| 2.2.5 | Change element layer (if editable) | Toast confirms, element moves to new layer band | |
| 2.2.6 | Change element sublayer | Toast confirms | |
| 2.2.7 | Change element domain | Toast confirms | |
| 2.2.8 | Set a specialisation on the element | Toast confirms, specialisation badge appears on element | |
| 2.2.9 | Clear the specialisation | Badge disappears | |
| 2.2.10 | Ctrl+Z to undo the last change | Change reverts | |
| 2.2.11 | Ctrl+Y to redo | Change reapplied | |
| 2.2.12 | Edit element appearance: change fill colour in detail panel | Element colour changes on canvas | |
| 2.2.13 | Edit element appearance: change stroke colour | Border colour changes | |
| 2.2.14 | Switch to a different view and back | Appearance overrides persist (per-view styling) | |

### 2.3 Delete Elements

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.3.1 | Select an element that has relationships to other elements | Detail panel Relationships tab shows connections | |
| 2.3.2 | Note the connected elements' names | For verification after delete | |
| 2.3.3 | Click Delete in detail panel (or press Delete key) | Element removed from canvas, toast "Element deleted" | |
| 2.3.4 | Check Model Tree | Element no longer listed | |
| 2.3.5 | Select a previously-connected element, check Relationships tab | Relationship to deleted element is gone | |
| 2.3.6 | Ctrl+Z to undo delete | Element reappears with its relationships | |

### 2.4 Drag, Position & Selection

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.4.1 | Drag an element to a new position | Element moves smoothly, snaps to 10px grid | |
| 2.4.2 | While dragging, check for alignment snaplines | Orange dashed guides appear when aligned with other elements | |
| 2.4.3 | Switch away from the view and back | Element is in the new position (persisted) | |
| 2.4.4 | Shift+click two elements | Both selected (blue selection border) | |
| 2.4.5 | Shift+drag on empty canvas | Box selection rectangle appears | |
| 2.4.6 | Release — enclosed elements are selected | Multiple elements highlighted | |
| 2.4.7 | Drag the group | All selected elements move together | |
| 2.4.8 | Press Delete | All selected elements deleted, toasts for each | |
| 2.4.9 | Ctrl+Z multiple times | Elements restored one by one | |
| 2.4.10 | Ctrl+A | All elements on canvas selected | |
| 2.4.11 | Arrow keys nudge selected elements | 1px per press | |
| 2.4.12 | Shift+arrow keys | 10px per press | |

### 2.5 Alignment Tools

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.5.1 | Select 3+ elements | Alignment toolbar appears (or is always visible) | |
| 2.5.2 | Click "Align Left" | All selected elements' left edges align | |
| 2.5.3 | Click "Align Centre (horizontal)" | Elements centred horizontally | |
| 2.5.4 | Click "Distribute Horizontal" | Equal spacing between elements | |
| 2.5.5 | Click "Distribute Vertical" | Equal vertical spacing | |

### 2.6 Z-Order

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 2.6.1 | Drag one element to overlap another | One element visually on top | |
| 2.6.2 | Right-click the bottom element → "Bring to Front" | It now renders on top | |
| 2.6.3 | Right-click → "Send to Back" | It goes behind | |

---

## 3. Relationships

### 3.1 Create Relationships

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 3.1.1 | Hover over an element — connection handles appear | Small circles on element boundary (5 per side) | |
| 3.1.2 | Drag from a handle toward another element | Line follows cursor | |
| 3.1.3 | Drop on target element's handle | Relationship type picker dialog appears | |
| 3.1.4 | Picker shows only valid relationship types for this source→target pair | Invalid types not listed | |
| 3.1.5 | Select a valid type and confirm | Edge drawn between elements, toast "Relationship created" | |
| 3.1.6 | Check the edge arrowhead matches the relationship type | Correct marker (diamond, triangle, arrow, etc.) | |
| 3.1.7 | Try connecting two elements with no valid relationship types | Picker shows empty or connection prevented | |

### 3.2 Edit Relationships

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 3.2.1 | Click an edge on canvas | Edge highlights, detail panel shows relationship properties | |
| 3.2.2 | Edit the relationship label | Toast "Relationship updated" | |
| 3.2.3 | Check edge on canvas | Label appears on the edge | |
| 3.2.4 | Edit the relationship description | Toast confirms | |
| 3.2.5 | Right-click edge → change line style (straight/step/bezier) | Edge reroutes in the selected style | |

### 3.3 Edge Waypoints

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 3.3.1 | Ctrl+click on an edge to add a waypoint | New control point appears | |
| 3.3.2 | Drag the waypoint | Edge bends through the new point | |
| 3.3.3 | Switch views and return | Waypoint position persisted | |

### 3.4 Relationship Tooltip

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 3.4.1 | Hover over an edge for ~300ms | Tooltip appears showing type, source→target, label | |
| 3.4.2 | Move mouse away | Tooltip disappears | |

### 3.5 Delete Relationships

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 3.5.1 | Select an edge, press Delete | Edge removed, toast "Relationship deleted" | |
| 3.5.2 | Check source and target elements still exist | Elements remain on canvas | |
| 3.5.3 | Ctrl+Z to undo | Edge reappears | |

---

## 4. Views

### 4.1 Create & Switch Views

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 4.1.1 | In View Switcher, click "+" to create a new view | Name input and viewpoint type selector appear | |
| 4.1.2 | Enter name "Test Layered", select viewpoint "am_layered", confirm | Toast "View created", new tab opens | |
| 4.1.3 | Canvas shows empty view with "Open a view..." or empty state | Correct — no elements yet | |
| 4.1.4 | Add elements via palette | Elements appear in the new view | |
| 4.1.5 | Click a different view tab | Canvas switches to other view's content | |
| 4.1.6 | Click back to "Test Layered" tab | Elements are where you left them | |
| 4.1.7 | Close a tab (X button on tab) | Tab closes, switches to adjacent tab | |
| 4.1.8 | Close all tabs | Empty state shown in canvas | |

### 4.2 View Operations

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 4.2.1 | Right-click a view in View Switcher → Duplicate | Toast "View duplicated", new "Copy of..." view appears | |
| 4.2.2 | Open the duplicated view | Same elements in same positions as original | |
| 4.2.3 | Move an element in the duplicate | Original view unaffected (positions are per-view) | |
| 4.2.4 | Right-click a non-preset view → Delete | View removed from list and tabs | |
| 4.2.5 | Right-click element on canvas → "Remove from View" | Element removed from canvas but still in Model Tree | |
| 4.2.6 | Drag element from Model Tree to canvas | Element added to current view at drop position | |

### 4.3 Notation Filtering

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 4.3.1 | Open a UML class view (e.g. "Core Domain Model") | Palette shows only UML types (Class, Interface, etc.) | |
| 4.3.2 | Try to drag an ArchiMate element from Model Tree onto UML canvas | Warning toast — notation mismatch, element NOT added | |
| 4.3.3 | Open an ArchiMate view (e.g. "Strategy") | Palette shows only ArchiMate types | |
| 4.3.4 | Try to drag a UML element from Model Tree onto ArchiMate canvas | Warning toast — notation mismatch | |
| 4.3.5 | Open a wireframe view ("Sample Wireframe") | Palette shows only wireframe types | |

### 4.4 Preset Views

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 4.4.1 | Check preset views in View Switcher | Preset views visible (e.g. "Full Model (Flat)", "Strategy", etc.) | |
| 4.4.2 | Open "Full Model (Flat)" | All seed elements visible across layer bands | |
| 4.4.3 | Open "Strategy" | Only Strategy-layer elements visible | |
| 4.4.4 | Open "Knowledge & Cognition" | K&C specialised elements shown | |
| 4.4.5 | Open "Safety Domain Slice" | Only Safety domain elements visible | |

---

## 5. ArchiMate Notation

### 5.1 Shapes & Visual Compliance

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 5.1.1 | Open "Full Model (Flat)" | Layer bands visible: Motivation, Strategy, Business, Application, Technology, Data, Implementation | |
| 5.1.2 | Check Motivation layer elements | Rounded shapes for goals, rect for drivers/constraints | |
| 5.1.3 | Check Strategy layer | Capability (rounded rect), Value Stream (wide pill with chevrons) | |
| 5.1.4 | Check Business layer actors | Person icon in element shape | |
| 5.1.5 | Check Business Process shapes | Rounded pill with process glyph (⇣) | |
| 5.1.6 | Check Business Function shapes | Rect with header bar, function glyph (→) | |
| 5.1.7 | Check Business Service shapes | Small pill with service glyph (⌒) | |
| 5.1.8 | Check Application Component shapes | Rect with component icon | |
| 5.1.9 | Check Technology Node shapes | 3D box with depth faces | |
| 5.1.10 | Check Data Object shapes | Folded-corner rectangle | |
| 5.1.11 | Check Artifact shapes | Rect with artifact icon | |

### 5.2 ArchiMate Edge Types

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 5.2.1 | Find a Composition relationship | Solid line, filled diamond at source | |
| 5.2.2 | Find an Aggregation relationship | Solid line, hollow diamond at source | |
| 5.2.3 | Find a Realisation relationship | Dashed line, hollow triangle at target | |
| 5.2.4 | Find a Serving relationship | Solid line, open arrow at target | |
| 5.2.5 | Find a Triggering relationship | Solid line, filled arrow at target | |
| 5.2.6 | Find a Flow relationship | Dashed line, filled arrow at target | |
| 5.2.7 | Find an Association relationship | Solid line, no arrowheads (or small if directed) | |

### 5.3 Layer Bands & Sublayers

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 5.3.1 | Check layer band ordering | Top-to-bottom: Motivation → Strategy → Business → Application → Technology → Data → Implementation | |
| 5.3.2 | Check elements are in their correct layer band | Business actors in Business band, App components in Application band, etc. | |
| 5.3.3 | Check sublayer ordering within a layer | E.g. Business: actors_roles above processes_functions above services above objects_rules | |

### 5.4 Specialisation Badges

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 5.4.1 | Find an element with a specialisation | Small amber pill badge in top-right corner | |
| 5.4.2 | Badge shows 2–3 character code | Readable at current zoom | |
| 5.4.3 | Element without specialisation | No badge | |

---

## 6. UML Class Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 6.1 | Open "Core Domain Model" or "arch-vis Class Model" | Class diagram with multiple classes visible | |
| 6.2 | Check class shape: 3 compartments | Name compartment (top), attributes (middle), methods (bottom) | |
| 6.3 | Check visibility markers on attributes | `+` public, `-` private, `#` protected, `~` package | |
| 6.4 | Check static members | Underlined text | |
| 6.5 | Check abstract class rendering | `<<abstract>>` stereotype or italic class name | |
| 6.6 | Check interface rendering | `<<interface>>` stereotype in name compartment | |
| 6.7 | Check enum rendering | `<<enumeration>>` stereotype, values listed | |
| 6.8 | Check inheritance edges | Solid line with hollow triangle pointing to superclass | |
| 6.9 | Check realisation edges | Dashed line with hollow triangle | |
| 6.10 | Check composition edges | Solid line with filled diamond at source | |
| 6.11 | Check aggregation edges | Solid line with hollow diamond at source | |
| 6.12 | Check association edges | Solid line with open arrow | |
| 6.13 | Check dependency edges | Dashed line with open arrow | |
| 6.14 | Check multiplicity labels on associations | "1", "0..*", "1..*" etc. near edge endpoints | |
| 6.15 | Check role name labels on associations | Role names near edge endpoints (if set) | |
| 6.16 | Long attribute/method names | Truncated with ellipsis, hover shows full text in tooltip | |
| 6.17 | Check package shapes | Tab-rectangle containers grouping classes | |
| 6.18 | Create a new UML Class from palette | 3-compartment node appears, toast confirms | |
| 6.19 | Edit class attributes in detail panel | Add/edit attributes with name, type, visibility | |
| 6.20 | Edit class methods in detail panel | Add/edit methods with name, return type, visibility | |

---

## 7. UML Component Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 7.1 | Open "System Components" or "arch-vis Component Architecture" | Component diagram with component shapes | |
| 7.2 | Check component shape | Rectangle with component icon (two small rectangles on left) or `<<component>>` stereotype | |
| 7.3 | Check interface rendering (if present) | Lollipop (provided) or socket (required) shapes | |
| 7.4 | Check dependency edges between components | Dashed arrow from consumer to provider | |
| 7.5 | Check package/subsystem boundaries | Container rectangles grouping related components | |
| 7.6 | Create a new UML Component from palette | Component node appears with correct icon, toast confirms | |
| 7.7 | Create a dependency relationship between two components | Dashed arrow, toast confirms | |

---

## 8. UML Use Case Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 8.1 | Open "System Use Cases" or "arch-vis Use Cases" | Actor stickmen, use case ovals, system boundary box | |
| 8.2 | Check actor shape | Stick figure with name below | |
| 8.3 | Check use case shape | Ellipse/oval with centred name | |
| 8.4 | Check system boundary | Large rectangle containing use cases, labelled with system name | |
| 8.5 | Check actors positioned outside boundary | Primary actors left, secondary right (if applicable) | |
| 8.6 | Check association lines from actors to use cases | Solid lines crossing boundary cleanly | |
| 8.7 | Check «include» relationships | Dashed arrow with «include» label | |
| 8.8 | Check «extend» relationships | Dashed arrow with «extend» label | |
| 8.9 | Create a new actor from palette | Stick figure appears, toast confirms | |
| 8.10 | Create a new use case from palette | Oval appears, toast confirms | |
| 8.11 | Connect actor to use case | Association line drawn | |

---

## 9. UML Sequence Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 9.1 | Open "Login Sequence" | Sequence diagram with lifelines and messages | |
| 9.2 | Check lifeline rendering | Rectangle header with "name : Type" + vertical dashed line | |
| 9.3 | Check activation bars | Thin rectangles on lifelines showing active processing | |
| 9.4 | Check synchronous message | Solid line with filled arrowhead | |
| 9.5 | Check return message | Dashed line with open arrowhead | |
| 9.6 | Check message Y-staggering | Messages staggered vertically — earlier messages higher, later lower | |
| 9.7 | Check message labels | Message name text on each arrow | |
| 9.8 | Check combined fragment (if present) | Rectangle with operator tab (alt/loop/par) | |
| 9.9 | Check X-axis ordering | Lifelines arranged left-to-right | |

---

## 10. UML Activity Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 10.1 | Open "Request Processing Flow" or "Order State Machine" | Activity diagram with action nodes and control flow | |
| 10.2 | Check action node shape | Rounded rectangle | |
| 10.3 | Check decision node shape | Diamond | |
| 10.4 | Check initial node | Filled black circle | |
| 10.5 | Check final node | Double circle with filled inner (bullseye) | |
| 10.6 | Check fork/join bars (if present) | Thick horizontal bar | |
| 10.7 | Check control flow edges | Solid line with open arrow | |
| 10.8 | Check guard conditions on edges (if present) | Text labels near decision outgoing edges (e.g. [yes], [no]) | |
| 10.9 | Check swimlanes (if present) | Vertical partitions grouping actions | |
| 10.10 | Check top-to-bottom flow direction | Initial node at top, final at bottom | |
| 10.11 | Create a new action from palette | Rounded rect appears, toast confirms | |
| 10.12 | Create control flow between two actions | Arrow drawn, toast confirms | |

---

## 11. UML State Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 11.1 | Check if any state diagram seed view exists | "Order State Machine" may contain state nodes | |
| 11.2 | Identify state nodes | Rounded rectangle shape | |
| 11.3 | Check initial state | Filled circle | |
| 11.4 | Check final state | Double circle with filled inner | |
| 11.5 | Check transition edges | Arrows between states | |
| 11.6 | Check transition labels (if present) | Event/guard/action text on edges | |

---

## 12. Process Flow Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 12.1 | Open "Document Review & Approval" | Process flow with pf-* elements | |
| 12.2 | Check start node | Green circle or rounded rect marked "Start" | |
| 12.3 | Check end node | Red circle or rounded rect marked "End" | |
| 12.4 | Check human task nodes | Rect with person icon or "Human Task" label | |
| 12.5 | Check agent task nodes | Rect with agent icon or "Agent Task" label | |
| 12.6 | Check system call nodes | Rect with system icon | |
| 12.7 | Check decision node | Diamond shape | |
| 12.8 | Check approval gate (if present) | Distinct shape or badge indicating approval checkpoint | |
| 12.9 | Check swimlanes | Vertical or horizontal partitions with headers (role/actor names) | |
| 12.10 | Check flow arrows between steps | Directed edges connecting steps in sequence order | |
| 12.11 | Select a process step element | Detail panel shows step metadata: step_type, role_id, agent_id | |
| 12.12 | Edit step name in detail panel | Toast "Process step updated" | |
| 12.13 | Edit step_type (human → agent) | Toast confirms | |

---

## 13. Wireframe Diagram

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 13.1 | Open "Sample Wireframe" | Wireframe view with page/section/control shapes | |
| 13.2 | Check page container | Full-width rectangle with browser chrome header (title bar, URL) | |
| 13.3 | Check section/card shapes | Rounded rectangles, some with header bars | |
| 13.4 | Check button shapes | Rounded rect with label, filled style | |
| 13.5 | Check input shape | Rectangle with placeholder text | |
| 13.6 | Check table shape (if present) | Grid with header row | |
| 13.7 | Check nav shape (if present) | Horizontal or vertical bar with link items | |
| 13.8 | Check modal shape (if present) | Overlay rectangle with title bar | |
| 13.9 | Check feedback shape (if present) | Alert/notification component | |
| 13.10 | Check nesting: controls inside section inside page | Visual containment — children rendered within parent bounds | |
| 13.11 | Check lo-fi rendering style | Greyscale palette, no colour fills, sketch-style borders | |
| 13.12 | Create a new wireframe page from palette | Page container appears, toast confirms | |
| 13.13 | Create a button inside the page | Button appears inside page bounds | |
| 13.14 | Create a wf-navigates-to relationship between pages | Navigation arrow drawn | |
| 13.15 | Double-click a button label | Inline text editing for button label | |
| 13.16 | Edit text, press Enter | Label updated, toast confirms | |

---

## 14. Data Modelling

_Note: Data model node types may not have seed data. Test with palette creation._

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 14.1 | Create a new view with viewpoint "data_conceptual" | View created, palette shows data model types | |
| 14.2 | Check palette includes dm-entity type | Entity type available | |
| 14.3 | Add a dm-entity from palette | Entity node appears (box shape), toast confirms | |
| 14.4 | Add a second dm-entity | Second entity appears | |
| 14.5 | Create a dm-references relationship between them | Edge drawn with appropriate notation | |
| 14.6 | Create a dm-one-to-many relationship | Edge with crow's foot cardinality markers (if implemented) | |
| 14.7 | Create a view with viewpoint "data_logical" | Logical data model view created | |
| 14.8 | Add dm-entity with attributes (via detail panel) | Entity shows attribute list | |
| 14.9 | Set PK/FK flags on attributes | PK/FK markers visible in entity node | |
| 14.10 | Create a view with viewpoint "data_physical" | Physical view created | |
| 14.11 | Add dm-table type from palette (if available) | Table node with column list | |
| 14.12 | Check dm-has-attribute relationship | Connects entity to attribute correctly | |

---

## 15. Canvas Interaction

### 15.1 Navigation

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 15.1.1 | Mouse wheel to zoom in | Canvas zooms smoothly toward cursor | |
| 15.1.2 | Mouse wheel to zoom out | Canvas zooms out | |
| 15.1.3 | Right-click + drag to pan | Canvas pans with cursor | |
| 15.1.4 | Check minimap in corner | Small overview shows viewport rectangle | |
| 15.1.5 | Click in minimap | Viewport jumps to clicked position | |
| 15.1.6 | Switch views | View fits to content (fit-to-view on switch) | |

### 15.2 Context Menu

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 15.2.1 | Right-click an element | Context menu appears | |
| 15.2.2 | Menu shows: Edit, Delete, Remove from View | Core actions present | |
| 15.2.3 | Menu shows: Promote/Demote (governance) | Governance actions present | |
| 15.2.4 | Menu shows: Bring to Front / Send to Back | Z-order actions present | |
| 15.2.5 | Menu shows: Show Incoming / Show Outgoing | Highlight mode actions present | |
| 15.2.6 | Click "Show Incoming" | Incoming relationships and their source elements highlight; others dim | |
| 15.2.7 | Click elsewhere to deselect | Dimming clears, all elements return to normal | |

### 15.3 Format Painter

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 15.3.1 | Select an element with custom appearance (e.g. coloured fill) | Element selected | |
| 15.3.2 | Click Format Painter button in toolbar | Crosshair cursor, "Painting..." label in toolbar | |
| 15.3.3 | Click another element | Target element gets source's fill/stroke overrides | |
| 15.3.4 | Click a third element | That one also gets the overrides | |
| 15.3.5 | Press Escape | Format painter deactivates, cursor returns to normal | |

### 15.4 Grid & Snap

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 15.4.1 | Zoom in enough to see dot-pattern grid | 10px grid dots visible | |
| 15.4.2 | Drag an element slowly | Element snaps to grid positions | |

### 15.5 Resize

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 15.5.1 | Select an element, look for resize handles | Small squares at corners/edges | |
| 15.5.2 | Drag a resize handle | Element grows/shrinks | |
| 15.5.3 | Switch views and return | New size persisted | |

---

## 16. File Operations

### 16.1 Save & Load

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 16.1.1 | Ctrl+S or File → Save Model | Browser download dialog for .archvis file, toast "Model saved" | |
| 16.1.2 | Open the downloaded .archvis file in a text editor | Valid JSON with version, exportedAt, elements[], relationships[], views[] | |
| 16.1.3 | Check the file only contains current project's data | Elements from other projects NOT included | |
| 16.1.4 | File → New Model | Confirm dialog: "Create a new model? Unsaved changes will be lost." | |
| 16.1.5 | Accept confirm | Canvas clears, model tree empty | |
| 16.1.6 | Ctrl+O or File → Open Model | File picker opens, accepts .archvis files | |
| 16.1.7 | Select the previously saved .archvis file | Toast with import counts, page reloads with restored data | |
| 16.1.8 | File → Close Model (Reload Seed) | Confirm dialog, seed data reloaded after accept | |

### 16.2 Import

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 16.2.1 | Import → Import ArchiMate XML (use a sample .xml if available) | Toast "ArchiMate XML imported" with counts, page reloads | |
| 16.2.2 | Import → Import CSV (use Archi-format CSV files if available) | Toast "CSV imported" with counts, page reloads | |
| 16.2.3 | Import a malformed file | Error toast with meaningful error message | |

### 16.3 Export

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 16.3.1 | Export → Export SVG | Downloads .svg file of current view | |
| 16.3.2 | Open SVG in browser | Diagram renders correctly, no minimap/controls in export | |
| 16.3.3 | Export → Export PNG | Downloads .png file (2x retina) | |
| 16.3.4 | Open PNG — check quality | Crisp at 2x resolution | |
| 16.3.5 | Export → Export PDF | Downloads .pdf file | |
| 16.3.6 | Open PDF — check layout | Diagram fits page, correct orientation (landscape/portrait auto) | |
| 16.3.7 | Export → Export ArchiMate XML | Downloads .xml file | |
| 16.3.8 | Export → Export CSV | Downloads CSV files (elements, relations, properties) | |
| 16.3.9 | Export → Export Model (.archvis JSON) | Downloads JSON file | |
| 16.3.10 | Export → HTML Report | Downloads architecture-report.html | |
| 16.3.11 | Open HTML report in browser | Multi-section report: element inventory, relationship matrix, view summary, domain index | |
| 16.3.12 | Check report has dark/light toggle | Theme switch works in report | |
| 16.3.13 | Export → Copy Image to Clipboard | Image copied, pasteable into another app | |
| 16.3.14 | Ctrl+P or Export → Print | Print dialog opens with diagram, panels hidden | |

---

## 17. Panels & Tools

### 17.1 Panel Visibility

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.1.1 | View menu → toggle "Model Tree & Views" | Left panel hides/shows | |
| 17.1.2 | View menu → toggle "Palette & Controls" | Right panel hides/shows | |
| 17.1.3 | View menu → toggle "Properties Panel" | Bottom panel hides/shows | |
| 17.1.4 | Check marks in View menu update | Tick appears next to visible panels | |
| 17.1.5 | F11 or View menu → Full Screen | All panels hide, canvas fills screen | |
| 17.1.6 | F11 again | Panels restore to previous state | |

### 17.2 Model Tree

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.2.1 | Check tree sections | Elements grouped by notation: ArchiMate (by layer), UML, Wireframe, Process Flow | |
| 17.2.2 | Expand/collapse tree sections | Smooth expand/collapse | |
| 17.2.3 | Search box: type partial element name | Tree filters to matches instantly | |
| 17.2.4 | Clear search | Full tree restored | |
| 17.2.5 | Click element in tree | Canvas selects and pans to that element (if in current view) | |
| 17.2.6 | Check orphan detection | Elements not in any view shown in italic font | |
| 17.2.7 | Area tabs: All / Working / Governed | Tree filters correctly by area | |
| 17.2.8 | Right-click element in tree → Set Folder | Folder path dialog appears | |
| 17.2.9 | Set folder to "Infrastructure/Network" | Element appears under that folder path in tree | |

### 17.3 Find & Replace

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.3.1 | Ctrl+H | Find & Replace panel opens | |
| 17.3.2 | Type a search term that matches multiple elements | Match count shown (e.g. "3 matches") | |
| 17.3.3 | Click "Replace" (single) | First match replaced, toast "Element updated" | |
| 17.3.4 | Click "Replace All" | Remaining matches replaced, toast for each | |
| 17.3.5 | Ctrl+Z multiple times | Replacements undone | |
| 17.3.6 | Ctrl+H again | Panel closes | |

### 17.4 Validation Panel

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.4.1 | Click "Validate" button in toolbar | Validation panel opens in bottom area | |
| 17.4.2 | Review validation results | Shows categorised issues: errors, warnings, info | |
| 17.4.3 | Check for element name warnings | Elements with empty names flagged | |
| 17.4.4 | Check for relationship validation | Invalid relationship types flagged | |
| 17.4.5 | Check for orphan elements | Elements not in any view listed | |
| 17.4.6 | Click a validation issue | Canvas navigates to and selects the offending element | |

### 17.5 Relationship Matrix

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.5.1 | Click "Matrix" button in toolbar | Relationship matrix opens as overlay/panel | |
| 17.5.2 | Check grid layout | Source elements as rows, target elements as columns | |
| 17.5.3 | Check cell content | Abbreviated relationship types (Cmp, Agg, Srv, etc.) | |
| 17.5.4 | Cells colour-coded by relationship type | Different colours for composition, serving, triggering, etc. | |
| 17.5.5 | Click a cell | Highlights that relationship on canvas (if in current view) | |

### 17.6 Specialisations Manager

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.6.1 | Click "Specs" button in toolbar | Specialisations manager opens | |
| 17.6.2 | View list of specialisation values | Each specialisation shown with element count | |
| 17.6.3 | Click rename on a specialisation | Input field appears with current name | |
| 17.6.4 | Enter new name, confirm | Toast "Specialisations renamed" with count, all elements updated | |
| 17.6.5 | Clear a specialisation | Toast confirms, badges removed from affected elements | |

### 17.7 Help Panel

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.7.1 | Press F1 | Help panel opens | |
| 17.7.2 | Check content | Keyboard shortcuts listed, viewpoint descriptions, quick reference | |
| 17.7.3 | Press F1 again | Help panel closes | |

### 17.8 Legend

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.8.1 | Check if legend overlay is available | Toggle button or auto-generated legend on canvas | |
| 17.8.2 | Enable legend | Colour/shape key appears showing element types in current view | |
| 17.8.3 | Disable legend | Legend disappears | |

### 17.9 Annotations & Groups

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 17.9.1 | Add an Annotation element from palette | Sticky-note style box appears on canvas | |
| 17.9.2 | Double-click to edit annotation text | Text editable inline | |
| 17.9.3 | Add a Group element from palette | Dashed border container with label tab | |
| 17.9.4 | Drag elements inside the group | Elements visually contained within group | |

---

## 18. Keyboard Shortcuts

| # | Shortcut | Expected | Result |
|---|----------|----------|--------|
| 18.1 | Ctrl+Z | Undo last action | |
| 18.2 | Ctrl+Y | Redo last undone action | |
| 18.3 | Ctrl+Shift+Z | Redo (alternative) | |
| 18.4 | Ctrl+S | Save model — browser download dialog | |
| 18.5 | Ctrl+O | Open model — file picker | |
| 18.6 | Ctrl+N | New model — confirm dialog | |
| 18.7 | Ctrl+H | Toggle Find & Replace | |
| 18.8 | Ctrl+P | Print dialog | |
| 18.9 | Ctrl+A | Select all elements on canvas | |
| 18.10 | F1 | Toggle Help panel | |
| 18.11 | F11 | Toggle Full Screen | |
| 18.12 | Delete | Delete selected element from view | |
| 18.13 | Shift+Delete | Delete selected element from model (if implemented) | |
| 18.14 | Escape | Deselect / cancel format painter / close context menu | |
| 18.15 | Arrow keys | Nudge selected 1px | |
| 18.16 | Shift+Arrow keys | Nudge selected 10px | |
| 18.17 | Ctrl+C / Ctrl+V | Copy / paste elements (if implemented) | |
| 18.18 | Ctrl+X | Cut elements (if implemented) | |

---

## 19. Theme & Appearance

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 19.1 | Click theme toggle (sun/moon icon in toolbar) | Switches dark ↔ light | |
| 19.2 | Check canvas in light mode | Elements readable, layer band colours visible, edges clear | |
| 19.3 | Check toast notifications in light mode | Toasts use light colour scheme — still readable | |
| 19.4 | Check detail panel in light mode | Text contrast sufficient, inputs visible | |
| 19.5 | Check Model Tree in light mode | Tree items readable | |
| 19.6 | Switch back to dark mode | Everything renders correctly, no artifacts | |
| 19.7 | Check ArchiMate layer colours in dark mode | Each layer has distinct colour (purple motivation, gold strategy, yellow business, blue app, green tech, orange data, grey impl) | |

---

## 20. Toast Notifications

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 20.1 | Create an element | Green "Element created" toast with element name, auto-dismisses after 4s | |
| 20.2 | Update an element | Green "Element updated" toast, auto-dismisses | |
| 20.3 | Delete an element | Green "Element deleted" toast, auto-dismisses | |
| 20.4 | Create a relationship | Green "Relationship created" toast with type/label | |
| 20.5 | Delete a relationship | Green "Relationship deleted" toast | |
| 20.6 | Create a view | Green "View created" toast | |
| 20.7 | Duplicate a view | Green "View duplicated" toast | |
| 20.8 | Create a project | Green "Project created" toast | |
| 20.9 | Switch project | Green "Switched to project" toast | |
| 20.10 | Save model (Ctrl+S) | Green "Model saved" toast | |
| 20.11 | Manually dismiss a success toast before 4s | Toast closes immediately | |
| 20.12 | Stop the API server, then try to create an element | Red error toast that does NOT auto-dismiss | |
| 20.13 | Click "Details" on the error toast | Error detail popout shows: operation, HTTP status, error message, timestamp | |
| 20.14 | Click "Copy to Clipboard" in detail popout | Error details copied — paste into text editor to verify | |
| 20.15 | Click "Dismiss" on error detail popout | Both popout and toast close | |
| 20.16 | Restart the API server, create element again | Green toast works again | |
| 20.17 | Trigger multiple toasts rapidly (e.g. delete 3 elements quickly) | Toasts stack vertically in bottom-right, all visible | |

---

## 21. Layer & Data Controls

### 21.1 Layer Visibility

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 21.1.1 | Open an ArchiMate layered view with multiple layers | Elements across several layers visible | |
| 21.1.2 | Toggle Technology layer off | Technology elements disappear from canvas | |
| 21.1.3 | Toggle Technology layer back on | Elements reappear in correct positions | |
| 21.1.4 | Toggle Business layer off | Business elements disappear | |
| 21.1.5 | Check that relationships to hidden elements also hide | Edges to/from hidden layer elements not visible | |
| 21.1.6 | Toggle all layers off except one | Only that layer's elements visible | |
| 21.1.7 | Toggle all back on | Full diagram restored | |

### 21.2 Data Overlays

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 21.2.1 | Check Data Overlay Controls in right panel | Toggle switches for overlay types | |
| 21.2.2 | Enable a colour-by-property overlay (e.g. status) | Element fills change based on property value | |
| 21.2.3 | Check legend appears | Legend shows colour mapping | |
| 21.2.4 | Enable heatmap overlay (if available) | Colour intensity varies by numeric property | |
| 21.2.5 | Disable overlays | Elements return to default colours | |
| 21.2.6 | Check status badge overlays | Small icon/text showing lifecycle state on elements | |

---

## 22. Batch Import API (Agent Pathway)

_These tests use curl/API directly — not the UI._

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 22.1 | `POST /api/import/model-batch` with 3 ArchiMate elements + 1 relationship | 201 response, elementsCreated=3, relationshipsCreated=1 | |
| 22.2 | Check elements exist via `GET /api/elements` | New elements present with correct types | |
| 22.3 | `POST /api/import/model-batch` with view definition | View created, elements positioned | |
| 22.4 | Open the created view in UI | Elements visible on canvas | |
| 22.5 | `POST /api/import/model-batch` with invalid relationship type | 400 error — validation prevents commit | |
| 22.6 | `POST /api/import/model-batch` with children[] (nested wireframe) | Parent-child hierarchy created correctly | |
| 22.7 | `GET /api/export/model-batch?view=<id>` | Returns JSON matching import format (round-trip) | |

---

## 23. Performance Spot-Check

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 23.1 | Open "Full Model (Flat)" — note load time | View loads within 2–3 seconds | |
| 23.2 | Pan around the full model | Smooth panning, no stuttering | |
| 23.3 | Zoom in and out on the full model | Smooth zoom transitions | |
| 23.4 | Select an element in a busy view | Selection responds instantly (< 200ms) | |
| 23.5 | Drag an element in a busy view | Element moves smoothly without lag | |
| 23.6 | Open detail panel for an element | Panel renders instantly | |

---

## 24. UAT Verification (Server-Side)

_These steps require the server started with `UAT_VERIFY=true`._

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 24.1 | After completing all sections, check file exists: `data/uat-log.jsonl` | File exists with JSON lines | |
| 24.2 | `curl http://localhost:3001/api/uat/report` | Returns JSON with total, passed, failed, byOperation counts | |
| 24.3 | Check `passed` count matches `total` | All verification checks pass | |
| 24.4 | Check `failed` count is 0 | No integrity failures | |
| 24.5 | Check `parseErrors` is 0 | No corrupted log entries | |
| 24.6 | Review `byOperation` breakdown | All operation types have entries (POST elements, PUT elements, DELETE elements, POST relationships, etc.) | |
| 24.7 | If any failures, check `recentFailures` array | Inspect which checks failed and on which operations | |
| 24.8 | Spot-check a few lines in `data/uat-log.jsonl` | Each line is valid JSON with ts, method, path, status, checks[], passed fields | |

---

## Bug Log

| # | Section | Step | Description | Severity | Screenshot |
|---|---------|------|-------------|----------|------------|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

**Severity scale:** Critical (blocks testing), High (feature broken), Medium (works but wrong), Low (cosmetic/polish)

---

---

# Phase 2 — Polish (Preliminary)

_To be fleshed out after Phase 1 bug fixes are complete. This phase focuses on "would I ship this?" — visual quality, feel, and consistency._

## Areas to Assess

### P2.1 Typography & Readability
- Font sizes across all panels — readable without squinting on 4K and HD
- Label truncation — are ellipses in the right places? Do tooltips cover what's cut?
- Line heights and spacing — cramped or airy?
- Monospace vs proportional — consistent use where appropriate

### P2.2 Colour & Contrast
- Layer colours in both dark and light themes — distinguishable?
- Edge colours vs background — visible without straining?
- Selection highlight vs working-area amber — clearly different?
- Toast colours — accessible contrast ratios?
- Palette icon strokes — visible at small size?

### P2.3 Layout & Spacing
- Panel proportions — left/right/bottom panels well-sized?
- Toolbar density — too many buttons? Grouped logically?
- Palette chip spacing — easy to grab the right one?
- Detail panel form layout — labels aligned, inputs sized well?
- Canvas margins — elements too close to edges?

### P2.4 Interaction Feel
- Drag responsiveness — any stutter or lag?
- Toast timing — 4s auto-dismiss too fast or too slow?
- Context menu positioning — appears near cursor? Off-screen on edges?
- Dialog/confirm prompts — still using window.confirm? Should they be in-app modals?
- Zoom feel — scroll speed, zoom centre, minimap tracking
- View switch animation — too abrupt?

### P2.5 Notation Accuracy
- Compare every ArchiMate shape against spec reference (reference/svg.png)
- UML class compartment proportions
- Sequence diagram message spacing and alignment
- Wireframe lo-fi aesthetic — does it look intentionally sketchy?
- Process flow swimlane header sizing

### P2.6 Consistency
- Button styles — consistent across toolbar, menus, panels?
- Border radii — same rounding on all similar components?
- Scrollbar styling — native or custom? Consistent?
- Empty states — all panels have meaningful empty state messages?
- Error states — all error paths show user-friendly messages?

### P2.7 Responsive / Display
- 4K display scaling (zoom: 1.3 media query) — correct threshold? Right amount?
- HD display (1080p) — nothing too large?
- Browser zoom (Ctrl+/Ctrl-) — layout survives 80%–150% range?
- Narrow browser window — panels collapse gracefully?

### P2.8 CSS Refactor (if warranted)
- Migrate hardcoded px font sizes to CSS custom properties
- Define a type scale: `--ui-font-xs` (9px), `--ui-font-sm` (11px), `--ui-font-base` (13px)
- 4K media query adjusts root variables instead of zoom hack
- Candidate for a dedicated build session, not inline fixes

---

## Phase 2 Bug Log

| # | Area | Description | Fix Priority |
|---|------|-------------|-------------|
| | | | |
| | | | |
| | | | |

---

## Phase 2 Sign-Off

| Item | Status |
|------|--------|
| All Phase 1 bugs fixed | |
| Polish areas assessed | |
| Phase 2 bugs logged | |
| Tester | |
| Date | |

---

---

## Phase 1 Sign-Off

| Item | Status |
|------|--------|
| All sections completed | |
| Total steps tested | /~240 |
| Passed | |
| Failed | |
| Bugs logged | |
| Bug log reviewed | |
| UAT verification report checked (§24) | |
| Screenshots saved to `screenshots/YYYY-MM-DD-HHMM/` | |
| REQUIREMENTS.md §21 audit updated with Verified/Working status | |
| Tester | |
| Date | |
