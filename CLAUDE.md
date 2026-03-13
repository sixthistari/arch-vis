# CLAUDE.md — Claude Code Project Instructions

## Identity

This is **arch-vis**, an ArchiMate-aligned enterprise architecture modelling and visualisation tool. It renders interactive, notation-accurate architecture diagrams from a relational model. Diagrams are projections of data — not authored drawings.

## Build Philosophy

- **Build autonomously.** Do not ask permission for implementation decisions. Make the decision, implement it, test it, move on.
- **Surgical edits.** Never rewrite files unnecessarily. Edit what needs changing.
- **Validate after every change.** Compile check, lint, brace balance. If it breaks, fix it before moving on.
- **Test in pieces.** Build a module, verify it works, then build the next. Do not attempt a monolithic build.
- **Australian English** in all UI labels and user-facing strings. "Colour" not "Color" in labels (CSS properties stay American per spec).

## Technology Stack

- **React 18** + TypeScript (strict mode, no `any` in core modules)
- **Vite** for build
- **xyflow (React Flow)** for primary interactive canvas (all notations — ArchiMate, UML, wireframes)
- **D3.js** for SVG rendering (spatial 3D experimental only)
- **Custom SVG** for spatial 3D projection (experimental — pure math + SVG)
- **Graphology** for in-memory graph model
- **elkjs** for hierarchical auto-layout, dagre as fallback
- **better-sqlite3** for local persistence (presentation schema)
- **Zod** for schema validation
- **Zustand** for state management
- **Vitest** for unit tests

## Network Configuration

The dev server MUST bind to `0.0.0.0` so it is accessible from other machines on the LAN.

- This server has two interfaces: `192.168.10.150` and `192.168.10.151` (inner network zone)
- Work machine is on `192.168.20.xxx` (intermediate zone)
- Vite config must set `server.host: '0.0.0.0'`
- If a backend API server is needed (for SQLite), it also binds `0.0.0.0`

## Data Strategy

- **SQLite** is the persistence layer. Schema is in `schema/schema.sql`.
- **Seed data** in `data/` provides a Stanmore mining example for development.
- On first run, create the database and load seed data if the DB doesn't exist.
- The tool is a modelling tool — full CRUD on elements, relationships, views.
- PFC import (YAML) is an ingestion pathway, not the only data source.

## File Structure Conventions

```
src/
  model/          # Graphology graph, schema types, ingestion
  notation/       # ArchiMate shape registry, edge styles, colours
  renderers/      # SVG flat renderer, spatial 3D renderer
  interaction/    # Highlight, selection, pan-zoom-rotate
  layout/         # ELK, dagre, force, grid, spatial
  theme/          # Dark/light tokens, provider
  ui/             # React components (shell, panels, controls)
  api/            # Express routes for SQLite CRUD (if using backend)
  main.tsx        # Entry point
```

## Key Constraints

- **No commercial libraries.** Everything MIT/Apache/BSD/MPL-2.0.
- **ArchiMate compliance.** Every element type traces to a base ArchiMate type. Shapes match the ArchiMate 3.2 visual notation.
- **Two-level type system.** Elements have `archimate_type` (base) + `specialisation` (nullable AI/Knowledge subtype). Shape renders from `archimate_type`. Badge renders from `specialisation`.
- **Architecture shapes, not data cards.** The canvas shows compact notation shapes (70–110px wide). Schema fields are ONLY in the detail panel. Never render field lists on the canvas.
- **Diagrams are views of the model.** Every canvas element is a record in SQLite. Views are projections with saved positions.

## Build Order

Follow REQUIREMENTS.md §10 build phases. Phase 1 first. Do not skip ahead.

## Do Not

- Do not use localStorage/sessionStorage for data persistence — use SQLite
- Do not render database fields on the canvas — that's the detail panel's job
- Do not hardcode layer structure — read from sublayer config
- Do not ask for confirmation before making implementation decisions
- Do not create separate CSS files — co-locate styles or use CSS-in-JS
- Do not use Tailwind (we need precise control over ArchiMate notation rendering)
