# Functional Test Plan — arch-vis Parity Audit

Each test case maps to a row in REQUIREMENTS.md §21. Tests are grouped by category and ordered by priority.

---

## 1. Canvas Interaction (§21.3)

### TC-3.1 Pan
- **Steps:** Open a layered view. Click and drag on empty canvas area.
- **Expected:** Canvas scrolls smoothly. Elements stay in position relative to each other.

### TC-3.2 Zoom
- **Steps:** Scroll wheel up/down on canvas.
- **Expected:** Canvas zooms in/out centred on cursor. Zoom level updates in controls.

### TC-3.3 Minimap
- **Steps:** Open any view with multiple elements.
- **Expected:** Minimap visible in bottom-right corner. Current viewport shown as highlighted rectangle. Click minimap to navigate.

### TC-3.4 Select / Multi-select
- **Steps:** Click element → selected (blue border). Shift+click another → both selected. Click empty canvas → deselected.
- **Expected:** Selection badge shows count. Selected elements move together on drag.

### TC-3.5 Select All
- **Steps:** Press Ctrl+A on canvas.
- **Expected:** All visible elements selected. Selection badge shows total count.

### TC-3.6 Alignment Tools
- **Steps:** Select 3+ elements. Alignment toolbar should appear. Click "Align Left".
- **Expected:** All selected elements align to the leftmost element's X position.

### TC-3.7 Snap to Grid
- **Steps:** Drag an element slowly.
- **Expected:** Element snaps to 10px grid positions. Grid dots visible on canvas background.

### TC-3.8 Alignment Snaplines
- **Steps:** Drag an element near another element's edge.
- **Expected:** Orange dashed guide lines appear at 5px threshold showing alignment.

### TC-3.9 Undo / Redo
- **Steps:** Move an element. Press Ctrl+Z. Press Ctrl+Y.
- **Expected:** Element returns to original position on undo. Returns to moved position on redo.

### TC-3.10 Copy / Paste
- **Steps:** Select element(s). Press Ctrl+C. Press Ctrl+V.
- **Expected:** New elements created with " (copy)" suffix, offset 20px from originals. New elements appear in model tree.

### TC-3.11 Delete from View vs Model
- **Steps:** Select element. Press Delete. Check model tree — element should still exist. Select another element. Press Shift+Delete. Check model tree — element should be gone.
- **Expected:** Delete removes from view only. Shift+Delete removes from model (with cascading relationship deletion).

### TC-3.14 Keyboard Nudge
- **Steps:** Select element. Press arrow keys. Press Shift+arrow keys.
- **Expected:** 1px movement per arrow press. 10px movement with Shift held.

### TC-3.15 Inline Label Editing
- **Steps:** Double-click an element name.
- **Expected:** Text becomes editable. Enter commits. Escape cancels. Change persists to DB.

### TC-3.16 Resize Elements
- **Steps:** Select an element. Look for resize handles on corners/edges.
- **Expected:** Drag handles to resize. New size persists.

---

## 2. ArchiMate (§21.6)

### TC-6.1 All Element Types
- **Steps:** Open the Full Model (Flat) view.
- **Expected:** All ArchiMate element types render with correct notation shapes. Check at least one from each layer.

### TC-6.2 All Relationship Types
- **Steps:** Check edges in layered view.
- **Expected:** Composition (filled diamond), Aggregation (open diamond), Assignment (circle+arrow), Realisation (dashed+hollow triangle), Serving (open arrow), Triggering (filled arrow), Flow (dashed+filled arrow), Association (plain line).

### TC-6.3 Notation Shapes
- **Steps:** Compare rendered shapes against ArchiMate 3.2 spec.
- **Expected:** Active structure = flat rect, Behaviour = rounded, Service = pill, Event = notched, Passive = folded corner, Node/Device = 3D box.

### TC-6.4 Layer Colours
- **Steps:** Open layered view.
- **Expected:** Motivation = purple, Strategy = gold, Business = yellow, Application = blue, Technology = green, Data = orange, Implementation = grey.

### TC-6.5 Junction Element
- **Steps:** Check if And/Or junction renders.
- **Expected:** Small filled circle (And) or filled circle with cross (Or).

---

## 3. UML Diagrams (§21.7)

### TC-7.1 Class Diagram
- **Steps:** Open "arch-vis Class Model" view.
- **Expected:** Classes show 3 compartments (name, attributes, methods). Visibility markers (+/-/#/~) rendered.

### TC-7.2 Inheritance
- **Steps:** Check inheritance edges in class diagram.
- **Expected:** Hollow triangle arrowhead at superclass end. Solid line.

### TC-7.3 Associations
- **Steps:** Check association edges.
- **Expected:** Multiplicity labels (e.g. "1..*") visible near ends. Role names shown if present.

### TC-7.4 Abstract / Interface / Enum
- **Steps:** Check class diagram for abstract classes, interfaces, enums.
- **Expected:** Abstract: italic name or \<\<abstract\>\>. Interface: \<\<interface\>\>. Enum: \<\<enumeration\>\> with values.

### TC-7.5 Use Case Diagram
- **Steps:** Open "arch-vis Use Cases" view.
- **Expected:** Actors as stick figures outside boundary. Use cases as ellipses inside boundary rectangle.

### TC-7.7 Activity Diagram
- **Steps:** Open "Request Processing Flow" view.
- **Expected:** Actions as rounded rects. Decisions as diamonds. Initial node as filled circle. Final as double circle.

### TC-7.9 Sequence Diagram
- **Steps:** Open or create a sequence diagram view.
- **Expected:** Lifelines as rectangles + dashed vertical lines. Messages as horizontal arrows.

### TC-7.11 State Machine
- **Steps:** Check state machine rendering.
- **Expected:** States as rounded rectangles. Initial/final states correct.

### TC-7.13 Component Diagram
- **Steps:** Open component diagram view.
- **Expected:** Components with component icon. Lollipop (provided) and socket (required) interfaces rendered.

---

## 4. Wireframes (§21.9)

### TC-9.1 Page Containers
- **Steps:** Create or open a wireframe view with WfPage elements.
- **Expected:** Page renders with browser chrome header (title bar). Acts as container for child elements.

### TC-9.2 Form Controls
- **Steps:** Add button, input, select elements inside a page.
- **Expected:** Button as rounded rect. Input as rect with placeholder. Select as rect with chevron.

### TC-9.3 Data Display
- **Steps:** Add table and list elements.
- **Expected:** Table renders with header row and columns. List renders with items.

### TC-9.4 Navigation Elements
- **Steps:** Add nav element.
- **Expected:** Horizontal bar with link items.

### TC-9.6 Deep Nesting
- **Steps:** Create page → section → form → input hierarchy via parent_id.
- **Expected:** Elements nest visually inside their parents.

### TC-9.9 Modal / Dialog
- **Steps:** Create a modal element.
- **Expected:** Renders with overlay-style appearance and close button.

---

## 5. Import / Export (§21.11)

### TC-11.1 ArchiMate XML Import
- **Steps:** POST a valid ArchiMate Exchange XML to /api/import/archimate-xml.
- **Expected:** Elements and relationships created in DB. Count returned.

### TC-11.2 ArchiMate XML Export
- **Steps:** GET /api/export/archimate-xml.
- **Expected:** Valid ArchiMate 3.2 Exchange Format XML. Round-trip: export, clear DB, import, compare element counts.

### TC-11.3 CSV Import
- **Steps:** POST elements.csv + relations.csv to /api/import/csv.
- **Expected:** Elements and relationships created. Archi-compatible format.

### TC-11.7 PNG Export
- **Steps:** Click Export → PNG from the export menu.
- **Expected:** PNG file downloaded. 2x retina resolution. Contains visible canvas content.

### TC-11.8 SVG Export
- **Steps:** Click Export → SVG from the export menu.
- **Expected:** SVG file downloaded. No minimap/controls included. Clean vector output.

---

## 6. Model Management (§21.1)

### TC-1.3 Model Tree
- **Steps:** Open model tree panel.
- **Expected:** Elements organised by layer folders. Expand/collapse works.

### TC-1.5 Search/Filter
- **Steps:** Type in model tree search box.
- **Expected:** Tree filters to matching elements by name.

### TC-1.7 Drag Tree to Canvas
- **Steps:** Drag an element from model tree to canvas.
- **Expected:** Element appears on canvas at drop position. Added to current view.

### TC-1.8 Selection Sync
- **Steps:** Click element in tree.
- **Expected:** Same element selected on canvas. Conversely, click on canvas → tree highlights.

### TC-1.9 Orphan Detection
- **Steps:** Create element not in any view.
- **Expected:** Element shown in italic font in model tree.

---

## 7. Element Creation (§21.4)

### TC-4.1 Create from Palette
- **Steps:** Drag element type from palette to canvas.
- **Expected:** Name prompt appears. Element created in DB and view at drop position.

### TC-4.3 Properties Panel
- **Steps:** Click an element.
- **Expected:** Detail panel opens with Properties, Relationships, Provenance tabs.

### TC-4.6 Specialisations
- **Steps:** Set specialisation on an element.
- **Expected:** Amber pill badge appears in top-right corner of element.

---

## 8. Relationships (§21.5)

### TC-5.1 Create by Dragging
- **Steps:** Drag from element handle to another element.
- **Expected:** Relationship type picker appears. Select type. Edge created.

### TC-5.2 Type Picker Filtering
- **Steps:** Connect two elements.
- **Expected:** Only valid relationship types shown (per metamodel). Invalid types not offered.

### TC-5.4 Waypoints
- **Steps:** Ctrl+click on an edge to add waypoint. Drag waypoint handle.
- **Expected:** Edge path bends through waypoint. Waypoint draggable.

### TC-5.5 Routing Modes
- **Steps:** Right-click edge → change to bezier/straight/step.
- **Expected:** Edge re-renders with selected routing mode.

---

## 9. Appearance (§21.14)

### TC-14.1 Theme Toggle
- **Steps:** Click theme toggle button.
- **Expected:** Switches between dark and light. All elements re-colour correctly.

### TC-14.3 Conditional Formatting
- **Steps:** Enable colour-by-status in data overlay controls.
- **Expected:** Elements coloured by their status (active=green, draft=grey, etc.).

### TC-14.4 Progressive Zoom
- **Steps:** Zoom from 10% to 400%.
- **Expected:** Five tiers: dots only → labels → icons → badges → full notation. Smooth transitions.
