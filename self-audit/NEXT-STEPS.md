# Self-Audit Next Steps

_Prioritised actions from the arch-vis self-audit (2026-03-17). Ordered by impact-to-effort ratio._

---

## Priority 1: Fix the Coupling Hotspot — `theme-colours.ts`

**Problem:** `notation/theme-colours.ts` lives in NOTATION-ARCHIMATE but is imported by UML (4 files), Data (1 file), and shared infra. It's the single biggest coupling point in the codebase, causing 5 of the 10 cross-notation violations.

**Fix:** Move `theme-colours.ts` to `src/shared/` or `src/theme/`. It contains notation-agnostic colour lookups (by layer, by aspect) — nothing ArchiMate-specific.

**Effort:** S | **Impact:** L — eliminates 5 cross-notation violations in one move.

---

## Priority 2: Break the Inverted Dependencies in Shared Infra

**Problem:** 4 shared-infra files import from NOTATION-ARCHIMATE:
1. `Canvas.tsx` → `notation/colors.ts`
2. `UnifiedEdge.tsx` → `notation/edge-styles.ts`
3. `layer-bands.ts` → `notation/registry.ts`
4. `node-conversion.ts` → `notation/registry.ts`

Plus 1 shared-infra → NOTATION-UML:
5. `node-conversion.ts` → `UcdBoundaryNode.tsx`

**Fix approach:**
- `notation/colors.ts` → move layer-colour mapping to `src/shared/` or `src/theme/` (same pattern as theme-colours)
- `notation/edge-styles.ts` → extract the style lookup interface to shared infra; notation modules register their styles
- `notation/registry.ts` → `node-conversion.ts` and `layer-bands.ts` use the registry to map types → shapes. Introduce a shared `NodeTypeRegistry` interface in `src/shared/`; each notation module registers its mappings. Shared infra queries the registry, never the notation module directly.
- `UcdBoundaryNode` import → move to a notation-aware routing table (same registry pattern)

**Effort:** M | **Impact:** L — eliminates all 7 high-severity violations. This is the architectural fix that makes notations truly pluggable.

---

## Priority 3: Break Circular Dependencies

**Problem:** 8 cycles detected. The most concerning:
- `STORE ↔ API` — store imports API client, API module imports store types
- `SHARED-INFRA ↔ NOTATION-UML` — the `node-conversion.ts` → `UcdBoundaryNode` import
- `UI ↔ SHARED-INFRA` — UI components import canvas hooks, canvas hooks import UI state

**Fix approach:**
- `STORE ↔ API`: Extract shared types to `src/shared/types.ts` (may already partially exist). API client should import types from shared, not from store.
- `SHARED-INFRA ↔ NOTATION-UML`: Resolved by Priority 2 (registry pattern).
- `UI ↔ SHARED-INFRA`: Likely acceptable — UI consuming canvas hooks is normal. Review whether any canvas hooks import UI components (that's the inverted direction).

**Effort:** M | **Impact:** M — reduces architectural complexity, makes dependency graph acyclic at module level.

---

## Priority 4: Clean Up Legacy Duplication

**Problem:** Top duplication pairs:
1. `ui/RotationPanel.tsx` ↔ `ui/legacy/RotationPanel.tsx` (57 lines)
2. `ui/ZoomBar.tsx` ↔ `ui/legacy/ZoomBar.tsx` (48 lines)
3. `notation/edge-styles.ts` ↔ `notation/edges.ts` (46 lines)

**Fix:**
- Delete `ui/legacy/` if those components are superseded (likely — they're in a `legacy/` folder)
- Merge `notation/edge-styles.ts` and `notation/edges.ts` — 46 lines of overlap suggests these should be one file

**Effort:** S | **Impact:** S — reduces maintenance surface, eliminates confusing duplicates.

---

## Priority 5: Consolidate Within-Notation UML Duplicates

**Problem:** 18 within-notation clone pairs, mostly in UML:
- `UmlActivityNode.tsx` ↔ `UmlStateNode.tsx` (45 + 35 lines)
- Various UML node files sharing layout/styling boilerplate

**Fix:** Extract a shared UML base node component in `renderers/xyflow/nodes/uml/shared/`. Common patterns: header rendering, compartment layout, selection styling, resize handles.

**Effort:** M | **Impact:** S — cleaner UML notation code, easier to add new UML diagram types.

---

## Priority 6: Reduce UI Fan-Out

**Problem:** UI module has fan-out of 117 across 31 files — the highest in the codebase. Instability 0.967.

**Fix:** This is partially structural (UI naturally imports from many modules). Review whether UI files import implementation details they shouldn't:
- Do UI components import from `renderers/xyflow/` internals? (Should go through store or hooks)
- Do UI components import `notation/` directly? (Should use the registry/shared layer)
- Consider barrel exports (`index.ts`) for modules that UI frequently imports from

**Effort:** M | **Impact:** M — but only after Priorities 1–3, which will naturally reduce some fan-out.

---

## Priority 7: Viewpoint CHECK Constraint Alignment

**Problem:** Discovered during self-audit: the database CHECK constraint for `viewpoint_type` only includes the original short names (`custom`, `application_landscape`, etc.) but the Zod schema and batch import accept the `am_*` extended names. The mismatch causes silent failures.

**Fix:** Either:
- (a) Add `am_*` viewpoint types to the CHECK constraint via schema migration v9, or
- (b) Map `am_*` types to short names in the batch import handler

Option (a) is cleaner — the Zod schema is authoritative.

**Effort:** S | **Impact:** S — prevents confusing batch import failures for external consumers.

---

## Execution Plan

| Session | Type | Work | Estimated Scope |
|---------|------|------|----------------|
| Next | **fix** | Priority 1 (theme-colours move) + Priority 4 (legacy cleanup) + Priority 7 (CHECK constraint) | Small surgical moves, high payoff |
| Next+1 | **build** | Priority 2 (registry pattern for shared infra) | Architectural — needs careful interface design |
| Next+2 | **fix** | Priority 3 (circular deps) + Priority 5 (UML dedup) | Cleanup pass after registry pattern is in place |
| Future | **assess** | Re-run `node self-audit/run.mjs` to measure improvement | Should see violations drop from 17 → <5 |

---

## How to Measure Progress

Re-run the self-audit after each fix session:

```bash
node self-audit/run.mjs analyse
```

Track these metrics across sessions:

| Metric | Baseline (2026-03-17) | Target |
|--------|----------------------:|-------:|
| High violations | 7 | 0 |
| Medium violations | 10 | ≤3 |
| Circular dependencies | 8 | ≤2 |
| Duplication % | 2.98% | <2% |
| Cross-notation clones | 3 | 0 |
