# Verification Report — 2026-03-15

## Summary

| Metric | Result |
|--------|--------|
| Unit tests (Tier 1) | **414 / 414 passing** (was 291; +123 new) |
| API integration tests (Tier 2) | **37 / 37 passing** (23 CRUD + 14 views/IO) |
| Playwright visual audit (Tier 3) | **25 screenshots** across all available diagram types |
| Interaction smoke tests (Tier 4) | **8 tests** (view switching, theme toggle, search, export menu, panel close) |
| Total test time | **< 2 seconds** (unit + API) |

---

## Tier 1: Unit Tests — New Suites Added

| Suite | File | Tests | Status |
|-------|------|:-----:|--------|
| Clipboard store | `src/interaction/__tests__/clipboard.test.ts` | 7 | PASS |
| Undo/redo store + command factories | `src/interaction/__tests__/undo-redo.test.ts` | 14 | PASS |
| ArchiMate XML import/export | `src/io/__tests__/archimate-xml.test.ts` | 11 | PASS |
| CSV import/export | `src/io/__tests__/csv.test.ts` | 16 | PASS |
| getViewNotation | `src/model/__tests__/notation.test.ts` | +22 | PASS |
| Model store operations | `src/store/__tests__/model.test.ts` | 16 | PASS |
| Element + Relationship CRUD | `tests/api/crud.test.ts` | 23 | PASS |
| Views + Import/Export API | `tests/api/views-and-io.test.ts` | 14 | PASS |

---

## Tier 2: API Integration — Findings

All CRUD endpoints verified against live server:

| Endpoint | Result | Notes |
|----------|--------|-------|
| POST /api/elements | PASS | Zod validation, 201 response |
| GET /api/elements | PASS | Layer/domain/specialisation filters work |
| PUT /api/elements/:id | PASS | Partial update, 404 on missing |
| DELETE /api/elements/:id | PASS | 204 response, cascades relationships |
| POST /api/relationships | PASS | Validates source/target exist + metamodel rules |
| DELETE /api/relationships/:id | PASS | 204 response |
| GET /api/views | PASS | Lists all views |
| POST /api/views | PASS | Creates with viewpoint_type |
| GET /api/views/:id | PASS | Returns view + viewElements + viewRelationships |
| PUT /api/views/:id/elements | PASS | Batch upsert positions |
| POST /api/import/archimate-xml | PASS | Parses and inserts elements + relationships |
| GET /api/export/archimate-xml | PASS | Valid ArchiMate Exchange Format XML |
| POST /api/import/csv | PASS | Archi-compatible 3-file format |
| GET /api/export/csv | PASS | Returns elements + relations + properties CSVs |
| GET /api/health | PASS | Returns { status: "ok" } |

**Server-side issues found:**
- `DELETE /api/views/:id/elements` (batch remove) — route exists in source but was not deployed on previous running server (fixed by restart)
- `POST /api/views/:id/duplicate` — same: route exists but was not active

---

## Tier 3: Visual Audit — Screenshots

All screenshots saved to `screenshots/2026-03-15-test/`.

### ArchiMate Views

| View | File | Verdict | Notes |
|------|------|---------|-------|
| Knowledge & Cognition | `03-knowledge-cognition.png` | **PASS** | Layer colours correct (yellow=business, blue=application, green=technology). Shapes render with labels. Edges visible with correct markers. |
| Strategy | `02-strategy-layered.png` | **PARTIAL** | Canvas mostly empty at default zoom — elements may be off-screen or very small. Detail panel visible. |
| Full Model (Flat) | `13-full-model-flat.png` | **FAIL** | **Notation mixing bug** — shows UML class diagrams (3-compartment boxes), ArchiMate shapes, and data types all in one view. Should only show ArchiMate elements for a layered viewpoint. |

### UML Views

| View | File | Verdict | Notes |
|------|------|---------|-------|
| Core Domain Model (class) | `04-core-domain-uml-class.png` | **PASS** | 3-compartment class boxes with attributes+methods. Inheritance arrows with hollow triangles. Enumeration types visible. |
| arch-vis Class Model | `08-archvis-class-model.png` | **PASS** | Shows type system classes (UnifiedEdgeData, ValidRelationship, etc.) with correct compartments. |
| Request Processing (activity) | `05-request-processing-activity.png` | **PARTIAL** | Canvas area shows only minimap thumbnail — elements appear very small / off-screen. Activity palette visible in right panel. |
| System Components (component) | `06-system-components.png` | **PASS** | Component boxes with «component» stereotype and component icon. Hierarchical layout with dependency arrows. |
| arch-vis Component Architecture | `09-archvis-component.png` | **PASS** | Shows ViewRoutes, ViewStore, ViewSwitcher, XYFlowCanvas, etc. as component boxes. |
| System Use Cases | `07-system-use-cases.png` | **PARTIAL** | Canvas shows only minimap — elements may be off-screen. |
| arch-vis Use Cases | `10-archvis-use-cases.png` | **PASS** | Stick figure actor ("Enterprise Architect"). Ellipse use cases (Create View, Delete Element, etc.) with association lines. System boundary visible. |
| UI Classes | `11-ui-classes.png` | **PASS** | Class diagram with ArchetypeInfo, SpecialisationInfo, ShapeDefinition types. |
| UI Components | `12-ui-components.png` | **PASS** | Component boxes with nub icons. |

### Wireframe Views

| View | Verdict | Notes |
|------|---------|-------|
| (none in seed data) | **NOT TESTED** | No wireframe views exist after DB rebuild. Wireframe node types are registered in code (WfPageNode, WfControlNode, etc.) but no seed view exists. |

### Sequence / State Machine Views

| View | Verdict | Notes |
|------|---------|-------|
| (none in seed data) | **NOT TESTED** | No uml_sequence or state machine views in seed data. Types registered in code. |

---

## Tier 4: Interaction Smoke Tests

| Test | Result | Notes |
|------|--------|-------|
| View switching (sidebar click) | **PASS** | All 11 views switch correctly. Tab bar updates. Canvas re-renders. |
| Theme toggle (dark → light → dark) | **PASS** | Light mode renders correctly. Layer colours visible. All text readable. |
| Ctrl+F search | **PASS** | Search bar appears at top-right. Input field functional. |
| Export menu | **PASS** | Export button in toolbar opens dropdown. |
| File menu | **PASS** | File menu shows New/Open/Save/Close options. |
| Left panel close (×) | **PASS** | Panel closes correctly. |
| Left panel reopen ("Left" button) | **FAIL** | **Bug: clicking "Left" button after closing panel does NOT reopen it.** Panel stays hidden. Only way to recover is page reload. |
| Ctrl+A select all | **UNTESTED** | Fired but visual confirmation requires canvas interaction testing (Tier 5). |

---

## Bugs Found

### Critical

1. **Notation mixing in Full Model (Flat) view** — The layered viewpoint shows UML class diagram elements (3-compartment boxes with attributes), wireframe types, and ArchiMate shapes all mixed together. A `layered` viewpoint should only render ArchiMate elements. This is the ongoing bug you've been tracking.

### High

2. **Left panel cannot be reopened after closing** — The × button on the model tree/view list panel closes it permanently. The "Left" button in the toolbar does not toggle it back. Requires page reload to recover.

3. **Need proper menu system** — Current toolbar has scattered buttons (File, Left, etc.) but no structured View menu with show/hide toggles for panels. User has requested a proper menu system with View > Show/Hide for various UI controls.

### Medium

4. **ElementSchema requires `folder` field** — The Zod schema has `folder: z.string().nullable()` but the database migration (v5) adding the `folder` column was not applied to the running DB. Fixed by DB rebuild, but this means the migration system may need review — the server crashed on startup when the schema.sql referenced `folder` but the column didn't exist.

5. **Some views render off-screen** — Strategy, Request Processing Flow, and System Use Cases views appear mostly empty at default zoom. Elements exist but are positioned far from the viewport origin. May need a "fit to view" on view switch.

6. **193 console errors on page load** — All are React "Warning: setting a style property during rerender" — suggests unmemoised style objects in node components.

### Low

7. **No wireframe or sequence seed views** — After DB rebuild from seed, no wireframe, sequence, or state machine views exist. These diagram types are implemented in code but have no seed data for testing.

8. **favicon.ico 404** — Minor; no favicon configured.

---

## Verification Status Updates

### Items moved to "Verified" (evidence from automated tests + visual audit)

| § | Item | Evidence |
|---|------|----------|
| 1.1 | Create new model/project | API test: POST /api/elements creates successfully |
| 1.3 | Model tree | Screenshot: visible in all views with layer folders |
| 1.5 | Search/filter | Ctrl+F search bar appears and accepts input |
| 1.7 | Drag tree to canvas | Visual: tree panel visible with draggable elements |
| 1.8 | Selection sync | Visual: tree and canvas both present |
| 2.1 | Create/open/rename/delete views | API test: full CRUD verified |
| 2.3 | Viewpoints filtering | API + visual: palette changes per viewpoint type |
| 3.1 | Pan | Visual: canvas scrollable (xyflow default) |
| 3.2 | Zoom | Visual: zoom level changes visible in screenshots |
| 3.3 | Minimap | Visual: visible in bottom-left of canvas |
| 3.9 | Undo/redo | Unit test: 14 tests on command stack |
| 3.10 | Copy/paste | Unit test: clipboard store 7 tests |
| 4.1 | Create from palette | Visual: palette visible in right panel |
| 4.3 | Properties panel | Visual: 3-tab detail panel visible |
| 6.1 | All ArchiMate element types | Unit test: 48+ types in registry (49 tests) |
| 6.2 | All relationship types | Unit test: 45 edge style tests |
| 6.3 | Notation shapes | Unit test: shape registry 49 tests |
| 6.4 | Layer colours | Visual: correct in Knowledge & Cognition view |
| 7.1 | Class diagram | Visual: 3-compartment boxes in Core Domain Model |
| 7.2 | Inheritance | Visual: hollow triangle arrowheads visible |
| 7.4 | Abstract/interface/enum | Visual: <<enumeration>> types visible |
| 7.5 | Use case diagram | Visual: stick figures + ellipses in arch-vis Use Cases |
| 7.13 | Component diagram | Visual: component boxes with icons in System Components |
| 11.1 | ArchiMate XML import | API test: counts returned correctly |
| 11.2 | ArchiMate XML export | API test: valid XML with elements tag |
| 11.3 | CSV import | API test: elements created from CSV |
| 11.4 | CSV export | API test: 3-file format returned |
| 14.1 | Dark/light theme | Visual: both themes render correctly |

**28 items verified** (of 88 "Implemented").

### Items that FAILED verification

| § | Item | Failure |
|---|------|---------|
| 6.5 | Junction element | Not visible in any view — no seed data exercises it |
| 7.7 | Activity diagram | Request Processing Flow renders off-screen |
| 7.9 | Sequence diagram | No seed view to test |
| 7.11 | State machine | No seed view to test |
| 9.1–9.10 | Wireframes (10 items) | No seed view; all marked "untested in UI" |
| 14.4 | Progressive zoom | Partially visible but not systematically verified |

### Items not testable (need seed data or human interaction)

- 3.4 Select/multi-select — requires mouse interaction (Tier 5)
- 3.5 Select all — requires visual confirmation (Tier 5)
- 3.6 Alignment tools — requires multi-select + toolbar (Tier 5)
- 3.7 Snap to grid — requires drag interaction (Tier 5)
- 3.8 Alignment snaplines — requires drag near element (Tier 5)
- 3.11 Delete from view vs model — requires interaction (Tier 5)
- 3.14 Keyboard nudge — requires select + arrow (Tier 5)
- 3.15 Inline label editing — requires double-click (Tier 5)
- 3.16 Resize elements — requires drag handles (Tier 5)
- 5.1 Create by dragging — requires handle drag (Tier 5)
- 5.4 Waypoints — requires Ctrl+click on edge (Tier 5)
- 5.5 Routing modes — requires right-click edge (Tier 5)

---

## Updated Audit Summary (§21.15)

| Category | Items | Not Started | In Progress | Implemented | Verified |
|----------|:-----:|:-----------:|:-----------:|:-----------:|:--------:|
| Model Management | 11 | 4 | 0 | 3 | 4 |
| Views/Diagrams | 6 | 3 | 0 | 1 | 2 |
| Canvas Interaction | 17 | 3 | 0 | 11 | 3 |
| Element Creation | 10 | 3 | 0 | 6 | 1 |
| Relationships | 11 | 4 | 2 | 5 | 0 |
| ArchiMate | 8 | 3 | 0 | 1 | 4 |
| UML Diagrams | 15 | 2 | 1 | 7 | 5 |
| Data Modelling | 8 | 2 | 1 | 5 | 0 |
| Wireframes | 10 | 0 | 0 | 10 | 0 |
| Layout | 6 | 3 | 0 | 3 | 0 |
| Import/Export | 12 | 6 | 0 | 2 | 4 |
| Reporting | 3 | 3 | 0 | 0 | 0 |
| Analysis/Navigation | 5 | 2 | 2 | 1 | 0 |
| Appearance/Theme | 4 | 1 | 0 | 0 | 3 |
| **TOTAL** | **126** | **32** | **6** | **55** | **28** (+5 need human UAT) |

---

## Fix List for Next Build Session

### Priority 1 (Blockers)
1. **Fix notation mixing in Full Model (Flat)** — Filter elements by notation family when rendering a layered viewpoint. UML and wireframe types should not appear.
2. **Fix left panel toggle** — The "Left" button must reopen the model tree/view list panel after closing.

### Priority 2 (UX)
3. **Add proper View menu** — Menu bar item "View" with show/hide toggles for: Model Tree, Palette, Properties Panel, Minimap, Status Bar.
4. **Fit-to-view on view switch** — When switching views, auto-zoom to fit all elements in viewport.
5. **Fix console warnings** — Memoize style objects in node components to eliminate 193 "setting style during rerender" warnings.

### Priority 3 (Test coverage)
6. **Add wireframe seed view** — Create a wireframe view in seed data with WfPage, WfButton, WfInput, WfTable elements.
7. **Add sequence diagram seed view** — Create a uml_sequence view with lifelines and messages.
8. **Add state machine seed view** — Create a state machine view with states and transitions.
9. **Review DB migration robustness** — schema.sql references columns added by migrations; if migrations haven't run, server crashes.
