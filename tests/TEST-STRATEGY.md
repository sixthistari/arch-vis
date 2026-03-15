# Test Strategy — arch-vis

## Philosophy

arch-vis is a canvas-based diagramming tool. The interesting behaviour lives in three layers:

1. **Data layer** — SQLite CRUD, metamodel validation, import/export
2. **Logic layer** — notation routing, layout algorithms, undo/redo, clipboard
3. **Visual layer** — shapes render correctly, edges route cleanly, interactions feel right

Layers 1 and 2 are fully automatable. Layer 3 is split: structural correctness can be automated, but *feel* (drag responsiveness, snap precision, visual polish) requires a human on the canvas.

The goal is to push everything except canvas feel into automation, so the human UAT session is focused and efficient.

---

## Test Tiers

### Tier 1: Unit Tests (Vitest) — Claude Code owns

**What:** Pure function tests. No DOM, no React, no browser.

**Already covered (289 tests):**
- Shape registry (49 tests) — all ArchiMate/UML/wireframe shape definitions
- Edge styles (45 tests) — all relationship type line/marker styles
- Notation routing (87 tests) — getNotation, getNodeType, getEdgeType
- Type schemas (44 tests) — Zod validation for elements, relationships
- Layout computation (8 tests) — grid layout, layer ordering
- Edge routing (20 tests) — orthogonal routing, handle placement, port detection
- Graph model (12 tests) — graphology integration, neighbour queries
- Highlight (4 tests) — selection graph traversal
- Projection math (9 tests) — 3D projection (spatial renderer)
- Batch import (11 tests) — API body validation

**To add:**
| Area | What to test | Priority |
|------|-------------|----------|
| Clipboard store | copy → paste round-trip, relative position preservation | High |
| Undo/redo store | push, run, undo, redo sequences; canUndo/canRedo flags | High |
| moveElementCommand | execute saves new pos, undo restores old pos | High |
| removeFromViewCommand | execute removes, undo re-adds with original positions | High |
| getViewNotation | all viewpoint types return correct notation | Medium |
| Palette groups | UML_USECASE_GROUPS, WIREFRAME_GROUPS completeness | Medium |
| Export XML | round-trip: export → parse → verify element count | Medium |
| Seed data integrity | all seed elements have valid archimate_type values | Low |

**Run:** `npx vitest run` — should complete in < 2 seconds.

---

### Tier 2: API Integration Tests (Vitest + real SQLite) — Claude Code owns

**What:** Test the Express routes against a real SQLite database. No browser needed. Uses `fetch` against the running dev server, or imports route handlers directly with an in-memory DB.

**Coverage target:**

| Endpoint | Operations to test |
|----------|-------------------|
| `POST /api/elements` | Create with valid data, reject invalid archimate_type |
| `GET /api/elements/:id` | Fetch existing, 404 for missing |
| `PUT /api/elements/:id` | Update name, update archimate_type, reject invalid |
| `DELETE /api/elements/:id` | Delete element, cascade to relationships |
| `POST /api/relationships` | Create valid, reject invalid source→target→type per metamodel |
| `POST /api/views` | Create view with viewpoint_type |
| `PUT /api/views/:id/elements` | Add/update view elements, verify position persistence |
| `DELETE /api/views/:id/elements` | Remove from view (element stays in model) |
| `POST /api/import/model-batch` | Batch upsert with children, verify counts |
| `GET /api/export/model-batch` | Export and verify structure matches import format |
| `GET /api/export/archimate-xml` | Valid XML output, element count matches DB |
| `POST /api/import/archimate-xml` | Round-trip: export → import → compare |
| `GET /api/export/csv` | CSV output with correct headers |

**Approach:** Create a test helper that spins up the server with a temp DB, runs tests, tears down. Or test route handlers directly by importing them with a test DB instance.

**Run:** `npx vitest run tests/api/` — target < 5 seconds.

---

### Tier 3: Visual Audit (Playwright MCP) — Claude Code owns

**What:** Screenshot-driven verification. Claude Code navigates the app, takes screenshots, and evaluates them against the ArchiMate 3.2 spec and UML 2.5 spec.

**This is the most valuable automated tier for a canvas app.** DOM assertions are useless inside xyflow. Screenshots let Claude Code spot:
- Wrong shape for an element type
- Missing arrowhead on a relationship
- Broken layout (overlapping nodes, edges through nodes)
- Theme colour issues
- Missing UI elements (buttons, panels, labels)
- Text truncation or overflow

**Audit script structure:**

```
For each diagram type:
  1. Navigate to the view
  2. Wait for render (networkidle or element visible)
  3. Screenshot full canvas → screenshots/audit/
  4. Screenshot zoomed to 200% on a node cluster
  5. Evaluate against checklist

For each UI panel:
  1. Open panel (palette, detail, model tree, export menu)
  2. Screenshot
  3. Verify all expected items present

For each theme:
  1. Toggle dark/light
  2. Screenshot same view in both
  3. Verify contrast, readability, no invisible elements
```

**Checklist per diagram type:**

| Diagram | What to verify |
|---------|---------------|
| Layered ArchiMate | Layer colours correct, shapes match spec, relationship markers visible |
| UML Class | 3-compartment boxes, visibility markers, inheritance triangles, multiplicities |
| UML Component | Component icon, lollipop/socket interfaces, package nesting |
| UML Use Case | Stick figure actors, ellipse use cases, system boundary |
| UML Activity | Rounded actions, diamond decisions, filled/hollow circles for start/end |
| UML Sequence | Lifeline dashes, message arrows, activation bars |
| Wireframe | Browser chrome on pages, form controls recognisable, nesting correct |

**Run:** Interactive Playwright MCP session. Output is screenshots + a written report with pass/fail per item.

---

### Tier 4: Interaction Smoke Tests (Playwright MCP) — Claude Code owns, limited

**What:** Test UI interactions that don't require precise canvas coordinates.

**Can automate:**
| Test | How |
|------|-----|
| View switching | Click each view in sidebar, verify canvas changes |
| Theme toggle | Click toggle, screenshot, verify colours changed |
| Export menu | Click Export, verify 6 options visible |
| Model tree search | Type in search box, verify tree filters |
| Model tree expand/collapse | Click group headers, verify children appear/disappear |
| Palette group expand | Click palette group, verify chips appear |
| Detail panel tabs | Click element, verify Properties/Relationships tabs |
| Keyboard: Ctrl+F | Press Ctrl+F, verify search bar appears |
| Keyboard: Escape | Press Escape after Ctrl+F, verify search bar closes |

**Cannot reliably automate (leave to human):**
| Test | Why |
|------|-----|
| Drag node | Requires precise xyflow coordinates, transform math |
| Drag-to-connect | Mouse down on handle → drag → release on target handle |
| Ctrl+click waypoint | Needs exact edge midpoint coordinates |
| Multi-select box drag | Shift+drag region selection |
| Snap-to-grid feel | Qualitative — does it *feel* right? |
| Alignment snaplines | Visual — do they appear at the right threshold? |
| Undo/redo of drag | Requires successful drag first |
| Copy/paste visual | Need to verify pasted elements appear at offset |

---

### Tier 5: Human UAT — You own

**What:** Everything that requires being on the canvas with a mouse.

**Pre-condition:** Tiers 1-4 have passed. You should arrive at UAT with confidence that:
- All shapes render correctly (Tier 3 screenshots verified)
- All API operations work (Tier 2 passed)
- All logic is correct (Tier 1 passed)
- UI panels and menus work (Tier 4 passed)

**Your UAT focuses on three things:**

#### A. Interaction quality (does it feel right?)

| # | Test | What to feel for |
|---|------|-----------------|
| 1 | Drag a node | Smooth, no lag, snaps to grid cleanly |
| 2 | Drag multiple selected nodes | All move together, relative positions preserved |
| 3 | Arrow key nudge | 1px precise, 10px with Shift, no drift |
| 4 | Drag-to-connect | Handle highlights on hover, picker appears, edge created |
| 5 | Ctrl+Z after drag | Node returns to exact pre-drag position |
| 6 | Ctrl+Z after delete | Element and its relationships restored |
| 7 | Ctrl+C → Ctrl+V | Copies appear at offset, names have "(copy)" suffix |
| 8 | Ctrl+X | Elements disappear, Ctrl+V brings them back elsewhere |
| 9 | Ctrl+F search | Finds nodes, Enter cycles, canvas pans to match |
| 10 | Alignment snaplines | Orange lines appear when dragging near another node's edge |
| 11 | Alignment toolbar | Select 3+, align left/right/centre works correctly |
| 12 | Double-click rename | Text becomes editable, Enter saves, Escape cancels |
| 13 | Scroll zoom | Smooth, centred on cursor, minimap updates |
| 14 | Delete vs Shift+Delete | Delete removes from view, Shift+Delete removes from model |
| 15 | Edge context menu | Right-click edge → straight/bezier/step/delete options work |
| 16 | Waypoint insertion | Ctrl+click edge adds draggable waypoint |

#### B. Visual polish (does it look right?)

| # | Test | What to look for |
|---|------|-----------------|
| 1 | Light + dark theme | No invisible text, no lost borders, all layers readable |
| 2 | Minimap accuracy | Matches canvas layout, viewport rectangle correct |
| 3 | Zoom tiers | Progressive disclosure: dots → labels → icons → badges → full |
| 4 | Edge routing | No edges through nodes, no unnecessary zigzags |
| 5 | Large diagram (50+ nodes) | No jank on pan/zoom, edges don't flicker |
| 6 | Palette icons | Recognisable notation silhouettes, not blurry |

#### C. Export verification (do outputs work?)

| # | Test | What to verify |
|---|------|---------------|
| 1 | Export SVG | Opens in browser/Inkscape, shapes intact, no minimap/controls |
| 2 | Export PNG | Retina quality, transparent or white background |
| 3 | Export PDF | Opens in PDF viewer, correct orientation, readable |
| 4 | Export JSON | Valid JSON, re-importable via batch endpoint |
| 5 | Export ArchiMate XML | Importable into Archi (if available) |
| 6 | Export CSV | Importable into Archi or spreadsheet |

---

## Tools

| Tool | Role | Who |
|------|------|-----|
| **Vitest** | Unit + API integration tests | Claude Code |
| **Playwright MCP** | Visual audit screenshots, UI panel smoke tests | Claude Code |
| **Browser DevTools** | Performance profiling (React DevTools, Performance tab) | Human |
| **Archi** (open source) | Import exported XML/CSV to verify interoperability | Human |
| **Inkscape/browser** | Verify SVG export quality | Human |
| **PDF viewer** | Verify PDF export | Human |
| **React DevTools** | Check for unnecessary re-renders during drag, identify unmemoised components | Human (install as browser extension) |
| **Lighthouse** | Accessibility audit (tab order, contrast, ARIA) | Human or Claude Code via Playwright |

---

## Execution Order

```
Phase 1: Automated (Claude Code, no human needed)
  1. Run existing unit tests (npx vitest run)
  2. Write + run new unit tests (clipboard, undo-redo, API)
  3. Write + run API integration tests
  4. Playwright visual audit session (all diagram types, both themes)
  5. Playwright UI panel smoke tests
  6. Generate test report with screenshots

Phase 2: Performance (Claude Code + Human)
  7. Create 200+ element test view via batch import
  8. Playwright screenshot at various zoom levels
  9. Human: open in browser, drag nodes, check for jank
  10. Human: React DevTools profiler during drag
  11. Human: check memory usage in DevTools

Phase 3: Human UAT (focused canvas testing)
  12. Work through interaction quality table (16 tests)
  13. Work through visual polish table (6 tests)
  14. Work through export verification table (6 tests)
  15. Log issues as they're found

Phase 4: Fix + Retest
  16. Claude Code fixes issues from UAT
  17. Re-run Tiers 1-4 (regression)
  18. Human re-tests fixed items
```

---

## Metrics

| Metric | Target |
|--------|--------|
| Unit tests | 350+ (currently 289) |
| Unit test time | < 3 seconds |
| API tests | 15+ endpoints covered |
| Visual audit | All 7 diagram types screenshotted and verified |
| Human UAT blockers | Zero — all Tier 1-4 issues fixed before UAT |
| Export formats | 6/6 working |
| Performance | 200+ elements, < 100ms interaction latency |
