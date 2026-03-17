# AI-Assisted Build Methodology

_Extracted from the arch-vis project (March 2026). A repeatable process for building complex software with AI coding agents._

---

## Overview

arch-vis went from empty directory to ~240 test steps of UAT-ready software in 4 days (14–17 March 2026). The process wasn't planned upfront — it emerged through iteration. This document captures what actually happened, reorganised into a repeatable methodology.

**Total timeline:** 4 days, ~12 sessions
**Result:** 430 unit tests, 5 notation families, full CRUD, multi-project support, import/export, governance workflow

---

## Stage 1: Foundation — "What Are We Building?"

_Before writing code. Get the domain model and constraints right._

### 1.1 Product Definition
- Write a one-paragraph product definition with foundational principles
- Identify what the tool IS and IS NOT (scope boundaries)
- Define the deployment model (standalone, library, embedded, SaaS)

### 1.2 Requirements Document
- Core functional requirements as numbered tables (R-MOD-01, R-VIEW-01, etc.)
- Organised by domain area, not by implementation phase
- Each requirement is a testable statement, not a wish
- Include a "do not" list — things explicitly out of scope

### 1.3 Design Constraints
- Technology stack decisions with rationale (why React, why SQLite, why xyflow)
- Licence constraints (no commercial libraries)
- Notation/standard compliance requirements (ArchiMate 3.2, UML 2.5)
- Network/deployment constraints (LAN binding, host addresses)

### 1.4 CLAUDE.md — Agent Instructions
- Session modes (build/fix/test/assess/chat) to prevent scope creep
- Build philosophy (autonomous, surgical edits, validate after every change)
- File structure conventions
- Project root hygiene rules
- Explicit "do not" list for the AI agent

**Key learning:** CLAUDE.md is a living document. Update it as you discover what the agent gets wrong. Every correction that could recur becomes a rule.

---

## Stage 2: Initial Build — "Vertical Slice"

_Get something rendering on screen as fast as possible. Breadth over depth._

### 2.1 Schema & Seed Data
- Design the database schema (all tables, constraints, foreign keys)
- Create realistic seed data from a real-world domain (not lorem ipsum)
- Seed data validates the schema — if the seed is wrong, the schema is wrong

### 2.2 API Layer
- CRUD routes for every entity type
- Zod validation on inputs
- Health check endpoint
- Run the server, hit endpoints with curl — prove the data layer works

### 2.3 Core Model & Types
- TypeScript types matching the schema (strict mode, no `any`)
- Notation registry — map every entity type to its visual properties
- State management stores (Zustand) for model, views, interaction

### 2.4 Primary Renderer
- Get the main canvas rendering with real data
- ArchiMate flat view with layer bands — ugly is fine, working is required
- One element type rendering correctly proves the pipeline works

### 2.5 Shell & Panels
- Basic shell layout (toolbar, left panel, canvas, right panel, bottom panel)
- Palette, Model Tree, Detail Panel, View Switcher — functional, not pretty
- Wire everything end-to-end: palette → create element → see on canvas → click → see in detail panel

**Key learning:** This stage is one long session. Don't stop to polish. The goal is a working vertical slice that touches every layer (DB → API → store → canvas → UI). Polish comes later.

---

## Stage 3: Multi-Notation Extension — "Width"

_Now that one notation works, extend to all notation families._

### 3.1 Schema Extensions
- Add type discriminators (notation: 'archimate' | 'uml' | 'wireframe')
- Widen type constraints to accommodate new element/relationship types
- Database migrations for new columns

### 3.2 Notation-Specific Renderers
- UML Class (3-compartment boxes, stereotypes, visibility markers)
- UML Component (pins, lollipop/socket interfaces)
- UML Use Case (actors, ovals, system boundary)
- UML Sequence (lifelines, activation bars, messages)
- UML Activity (actions, decisions, forks/joins, swimlanes)
- Wireframe (pages, sections, controls, nesting)
- Process Flow (start/end, tasks, decisions, swimlanes)
- Each notation is a build-verify cycle — build it, look at it, fix it

### 3.3 Seed Data Per Notation
- Create seed views for every notation family
- Seed data exercises the rendering — if it renders wrong, fix the renderer
- Realistic examples (not toy diagrams)

### 3.4 Notation-Specific Palettes
- Filter palette by current viewpoint type
- Notation-specific relationship types in the picker
- Enforce notation boundaries (can't drag ArchiMate into UML view)

**Key learning:** Build one notation at a time. Get UML Class fully working before starting Component. Each notation reveals shared infrastructure gaps (edge routing, handle assignment, layout).

---

## Stage 4: Diagramming Refactor — "Unification"

_After building 3+ notations, you discover duplication and inconsistency. Refactor._

### 4.1 Unified Edge System
- Single edge component for all notations (UnifiedEdge)
- Notation-specific styling via data, not separate components
- Marker/arrowhead registry (6 types: filled/hollow diamond, filled/hollow triangle, filled/open arrow)

### 4.2 Shared Handle System
- Consistent connection handles across all node types (RoutingHandles)
- 5 handles per side, same component everywhere
- Handle assignment algorithm (no two edges share a port)

### 4.3 Shared Layout Infrastructure
- Layer config as single source of truth
- Layout computation extracted and memoised
- Per-viewpoint layout direction (ELK up for class, down for activity, custom for use case/sequence)

### 4.4 Edge Routing Quality
- Orthogonal routing with A* pathfinding
- Waypoint editing (Ctrl+click to add, drag to move)
- Route point persistence per view

**Key learning:** This refactor is NOT optional. Without it, each new notation adds complexity multiplicatively. The unified edge/handle/layout system is what makes the codebase maintainable. Do it before adding more features.

---

## Stage 5: Parity Audit — "Are We Complete?"

_Benchmark against existing tools. Identify gaps._

### 5.1 Functional Parity Review
- Create a detailed audit table (§21 in REQUIREMENTS.md)
- Benchmark against reference tools (Archi for ArchiMate, Sparx EA for UML)
- Status lifecycle per item: Not started → In progress → Implemented → Verified → Working
- ~126 items across 14 categories

### 5.2 Gap Prioritisation
- Tier 1: Table stakes (must-have for any modelling tool) — copy/paste, annotations, groups, z-order
- Tier 2: Missing notation families (data modelling, state diagrams)
- Tier 3: Deliverable output (PDF, HTML reports, print)
- Tier 4: Power-user features (relationship matrix, find/replace, impact analysis)

### 5.3 Tier 1 Gap Build
- Build the table-stakes features identified in the audit
- Each feature is small (1–3 hours) but essential
- Verify each against the audit table — mark as Implemented

### 5.4 Opinionated Code Reviews
- Deep review with specific focus (e.g. "extensibility", "no code reuse", "notation accuracy")
- Review findings become fix lists
- Fix, re-review, verify

**Key learning:** The parity audit is humbling. You think you're done, then you compare against a 20-year-old tool and find 30 gaps. But it also shows you what NOT to build — not every Sparx EA feature matters.

---

## Stage 6: Quality Pass — "Hardening"

_Test coverage, code review, bug fixing._

### 6.1 Unit Test Suite
- 430+ tests covering: type routing, notation registry, schema validation, layout computation, interaction stores
- Vitest with fast feedback loop
- Integration tests for API routes (require running server)

### 6.2 Code Review Passes
- **Structural review:** Decomposition, module boundaries, reuse extraction
- **Reliability review:** Error handling, edge cases, memory leaks, race conditions
- **Notification/feedback review:** Does every mutation give the user confirmation?

### 6.3 Bug Fix Cycles
- Fix lists from reviews and testing
- Surgical fixes — don't refactor while fixing bugs
- Compile-check + test after every fix

### 6.4 Verification Pass
- TypeScript strict mode clean (no errors)
- All tests passing
- Playwright visual verification of every view type

**Key learning:** The "fix" session mode in CLAUDE.md is critical. Without it, bug fix sessions drift into refactoring and feature additions. Fix mode means: fix the bug, verify, move on.

---

## Stage 7: Feature Completion — "The Last 20%"

_The features that require the foundation to be solid._

### 7.1 Project Management
- Multi-project support (create, rename, delete, switch)
- Data scoping (all queries filtered by current project)
- Per-project save/load

### 7.2 Governance Workflow
- Working/governed areas on all entities
- Promote/demote with validation gates
- Visual indicators on canvas and tree

### 7.3 Import/Export Completeness
- ArchiMate XML (round-trip)
- CSV (Archi-compatible)
- Model file (.archvis JSON)
- HTML report
- SVG, PNG, PDF export

### 7.4 Notification System
- Toast notifications for all mutations
- Error detail popout with copy-to-clipboard
- Replace all window.alert() calls

**Key learning:** Projects and governance look like "features" but they're actually architectural — they touch every query, every route, every store. Build them late (after the model is stable) but before UAT.

---

## Stage 8: UAT Preparation — "Is It Ready?"

_Build the infrastructure that maximises the value of human testing._

### 8.1 UAT Verification Middleware
- Server-side mutation verification (opt-in via env var)
- Post-response checks: row exists, cascades happened, fields match
- Append-only JSONL log + summary report endpoint

### 8.2 UAT Test Plan
- Comprehensive step-by-step plan (~240 steps)
- Every implemented feature has test steps
- Coverage analysis against requirements document
- Phase 1 (function) + Phase 2 (polish) separation

### 8.3 Shakedown Test
- Playwright MCP walkthrough of every view type
- Screenshot evidence of working state
- Verify toast system, UAT logging, project switching
- Fix any blockers before human testing starts

### 8.4 Reference Material
- Visual references for notation accuracy (Archi SVG export, spec diagrams)
- Compare palette icons against reference
- Upgrade where the reference is better than what you built

**Key learning:** UAT preparation is not the same as testing. It's building the infrastructure that makes human testing efficient — verification middleware, test plans, screenshots. Without this, UAT is ad-hoc clicking.

---

## Anti-Patterns Observed

| Anti-Pattern | What Happened | Fix |
|---|---|---|
| **Monolithic build** | Early sessions tried to build everything at once | Build in pieces, verify each piece |
| **Polish too early** | Time spent on icon aesthetics before CRUD worked | Get it working, then make it pretty |
| **Review loops (Ralph Wiggum)** | AI self-reviewing more than twice found nothing new | Max 2 review passes, then UAT |
| **Scope creep in fix sessions** | Bug fixes turned into refactoring | Enforce session modes (build/fix/test) |
| **Config UI overbaking** | Temptation to build settings panels for everything | Browser zoom exists. Ship it. |
| **Hardcoded values** | px font sizes everywhere, no design tokens | Known debt — accept it, don't block on it |

---

## What Worked Well

| Practice | Why It Worked |
|---|---|
| **Session modes** | Prevented scope creep — "fix mode" means fix only |
| **Seed data from real domain** | Stanmore mining example caught schema issues early |
| **Unified edge refactor** | One refactor eliminated a class of bugs across all notations |
| **Parity audit against Archi/Sparx** | Identified 30 gaps that would have been discovered in UAT |
| **Compile-check after every change** | Never let errors accumulate |
| **CLAUDE.md as living instructions** | Every correction became a permanent rule |
| **Feature flags for reversibility** | `USE_ARCHI_PALETTE_ICONS = false` to revert instantly |
| **UAT verification middleware** | Server-side proof that mutations worked, not just UI illusion |

---

## Reusable Process Checklist

```
□ Stage 1: Foundation
  □ Product definition + principles
  □ Requirements document (numbered, testable)
  □ Technology constraints + CLAUDE.md
  □ Scope boundaries ("do not" list)

□ Stage 2: Vertical Slice
  □ Schema + seed data
  □ API layer (CRUD + health)
  □ Types + stores + notation registry
  □ Primary renderer (one view working end-to-end)
  □ Shell + panels (functional, not pretty)

□ Stage 3: Width
  □ Notation/feature extensions (one at a time)
  □ Seed data per extension
  □ Extension-specific UI (palettes, filters)

□ Stage 4: Unification Refactor
  □ Extract shared components from duplication
  □ Single source of truth for configuration
  □ Shared rendering/layout infrastructure

□ Stage 5: Parity Audit
  □ Benchmark against reference tools
  □ Gap prioritisation (tiers)
  □ Build tier 1 gaps
  □ Opinionated code reviews

□ Stage 6: Quality Pass
  □ Unit test suite
  □ Code review (structural, reliability, UX)
  □ Bug fix cycles (fix mode only)
  □ Verification pass (compile + tests + visual)

□ Stage 7: Feature Completion
  □ Cross-cutting features (projects, governance, auth)
  □ Import/export completeness
  □ Notification/feedback system

□ Stage 8: UAT Preparation
  □ Verification middleware
  □ Test plan (function + polish phases)
  □ Shakedown test
  □ Reference material comparison
```
