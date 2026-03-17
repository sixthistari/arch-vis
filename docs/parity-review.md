# Parity Review — Pattern Check Against Reference Tools

**Date:** 2026-03-17
**Purpose:** Check arch-vis patterns against quality open-source references. Not a feature comparison — we're validating our design choices and spotting blind spots. arch-vis is an AI-agentic modelling tool, not a clone of any of these.

---

## Reference Tools

| Layer | Tool | Why we looked |
|-------|------|---------------|
| Architecture | Archi | ArchiMate 3.2 reference — how do they handle the spec? |
| Engineering | Gaphor | UML 2.5, active Python project — canvas interaction patterns |
| Data | DrawDB | Clean ER editor — column metadata patterns |
| Data | ChartDB | Uses xyflow like us — what patterns emerge on the same foundation? |

---

## Pattern Observations

### 1. Edge Routing

**What they do:** Archi has Manhattan (orthogonal) routing as a per-view setting. Gaphor has user-draggable bend points ("knees"). Both DrawDB and ChartDB use basic straight lines.

**Our situation:** We have straight lines via xyflow defaults plus our A* edge router and waypoint system. The waypoint infrastructure exists but isn't fully exposed to users.

**Verdict:** Our edge routing infrastructure is sound. **Must-fix:** Ensure waypoint drag handles are discoverable and working. Orthogonal routing is nice-to-have but not blocking.

### 2. Alignment & Snap

**What they do:** Archi has full alignment suite (L/C/R/T/M/B), snap-to-grid, snap-to-guides. Gaphor has auto-layout but no documented snap. DrawDB/ChartDB have basic drag only.

**Our situation:** We have ELK/dagre auto-layout and snap-to-grid in xyflow config.

**Verdict:** Auto-layout covers most cases for AI-generated diagrams. **Nice-to-have:** Add alignment commands for manual cleanup.

### 3. Valid Relationship Awareness

**What they do:** Archi's "Magic Connector" suggests only valid relationships between two elements. It's their standout feature for productivity.

**Our situation:** We already have a `valid_relationships` matrix (525 rules loaded at seed). The infrastructure is there — it's used for validation.

**Verdict:** **Must-fix:** Surface the valid-relationship matrix in the connection UX — when connecting two elements, show only valid relationship types. This is critical for AI agents creating models programmatically.

### 4. Palette Interaction

**What they do:** Archi: click-to-place or drag. Shift+click to lock tool for repeated placement. Gaphor: click tool, click canvas. Both support search.

**Our situation:** Drag-to-canvas was the only option. B3 fix just added click-to-create.

**Verdict:** Core pattern now covered. **Future:** Locked-tool mode for batch placement.

### 5. Data Model Column Metadata

**What they do:** DrawDB has full column metadata — type, nullable, unique, auto-increment, default, check constraint, comment. ChartDB similar. Both have database-specific type lists.

**Our situation:** DmEntityNode has PK/FK colour coding and 3 viewpoint levels (conceptual/logical/physical). Column properties are minimal.

**Verdict:** **Must-fix for data model UAT:** Add column type, nullable, and unique flags to seed data and detail panel. DDL export is important but can follow.

### 6. Cardinality Notation on Data Edges

**What they do:** DrawDB and ChartDB both render crow's foot cardinality markers.

**Our situation:** We have `dm-one` and `dm-many` marker definitions in the edge style system. The rendering infrastructure exists.

**Verdict:** Check that cardinality markers actually render on data model edges during UAT. The code is there — needs verification.

### 7. Export

**What they do:** Archi exports PNG/SVG/PDF/HTML reports. DrawDB exports DDL to 5 SQL dialects. Gaphor has Sphinx integration.

**Our situation:** No export yet.

**Verdict:** **Must-fix (but not pre-UAT):** Image export (SVG/PNG) is the minimum viable export. For AI-agentic use, the API *is* the primary interface — agents read the model via REST. Human-facing export is Phase 6+.

### 8. Open Exchange / Interop

**What they do:** Archi supports ArchiMate Open Exchange Format XML. This is the standard interchange.

**Our situation:** No XMI/OEF support.

**Verdict:** **Future.** For AI-agentic use, REST API is the interchange format. OEF matters when interoperating with Archi users specifically.

---

## Gap Table — Pre-UAT Priority

| Gap | Severity | Action |
|-----|----------|--------|
| Valid-relationship filtering in connection UX | must-fix | Surface existing matrix when connecting elements |
| Data model seed data (so UAT §14 can run) | must-fix | Add dm-* seed elements, views, relationships |
| Waypoint handle discoverability | must-fix | Verify waypoint drag handles work in UAT |
| Data model column metadata (type, nullable) | must-fix | Extend dm-column properties in detail panel |
| Cardinality markers on data edges | must-fix | Verify dm-one/dm-many markers render |
| Alignment commands (L/C/R/T/M/B) | nice-to-have | Post-UAT polish |
| Snap-to-alignment guides | nice-to-have | Post-UAT polish |
| Image export (SVG/PNG) | nice-to-have | Phase 6+ |
| Specialisations manager UI | nice-to-have | Post-UAT |
| DDL export | nice-to-have | Post-UAT, driven by data model maturity |
| Open Exchange Format XML | future | Only when Archi interop is needed |
| HTML/PDF reporting | future | API is primary interface for agents |
| Locked-tool palette mode | future | Batch placement convenience |
| Per-element appearance customisation | future | Properties panel enrichment |

---

## Key Takeaway

arch-vis is architecturally sound. The main gaps are:
1. **Surfacing existing infrastructure** (valid-relationship matrix, waypoint handles, cardinality markers)
2. **Data model maturity** (seed data, column metadata)
3. **No export** — acceptable for now since AI agents use the REST API

None of the reference tools are designed for AI-agentic use. arch-vis's REST API, programmatic model creation, and multi-notation support are unique differentiators that none of the reference tools offer.
