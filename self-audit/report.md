# arch-vis Self-Audit Report

*Generated: 2026-03-17*

## 1. Codebase Overview

Total source files analysed: **165**

| Module | Files | Fan-In | Fan-Out | Instability |
|--------|------:|-------:|--------:|------------:|
| SERVER | 17 | 0 | 1 | 1 |
| UI | 29 | 2 | 116 | 0.983 |
| OTHER | 8 | 4 | 101 | 0.962 |
| RENDERER-FLAT | 2 | 1 | 10 | 0.909 |
| RENDERER-SPATIAL | 6 | 10 | 14 | 0.583 |
| NOTATION-WIREFRAME | 8 | 24 | 20 | 0.455 |
| NOTATION-DATA | 1 | 3 | 2 | 0.4 |
| SHARED-INFRA | 37 | 69 | 36 | 0.343 |
| NOTATION-ARCHIMATE | 11 | 6 | 3 | 0.333 |
| NOTATION-UML | 12 | 36 | 17 | 0.321 |
| NOTATION-PROCESS | 6 | 18 | 5 | 0.217 |
| API | 1 | 16 | 3 | 0.158 |
| STORE | 9 | 63 | 10 | 0.137 |
| IO | 2 | 0 | 0 | 0 |
| MODEL | 12 | 81 | 0 | 0 |
| THEME | 4 | 5 | 0 | 0 |

## 2. Duplication

- Total clone pairs: **53**
- Duplicated lines: **984**
- Duplication percentage: **2.85%**

Breakdown by type:
- Within-notation: 17
- Cross-notation: 3
- Shared infra: 0
- Other: 33

### Worst Offenders

| File A | File B | Type | Lines |
|--------|--------|------|------:|
| ui/RotationPanel.tsx | ui/spatial-shell/RotationPanel.tsx | other | 57 |
| renderers/xyflow/nodes/GroupNode.tsx | renderers/xyflow/nodes/uml/UmlSwimlaneNode.tsx | other | 53 |
| ui/ZoomBar.tsx | ui/spatial-shell/ZoomBar.tsx | other | 48 |
| renderers/xyflow/nodes/uml/UmlActivityNode.tsx | renderers/xyflow/nodes/uml/UmlStateNode.tsx | within-notation | 45 |
| renderers/xyflow/nodes/AnnotationNode.tsx | renderers/xyflow/nodes/ArchimateNode.tsx | other | 45 |
| io/archimate-xml.ts | io/csv.ts | other | 45 |
| renderers/xyflow/nodes/uml/UmlActivityNode.tsx | renderers/xyflow/nodes/uml/UmlStateNode.tsx | within-notation | 35 |
| renderers/xyflow/nodes/sequence/SequenceLifelineNode.tsx | renderers/xyflow/nodes/wireframe/WfPageNode.tsx | cross-notation | 28 |
| renderers/xyflow/nodes/wireframe/WfNavNode.tsx | renderers/xyflow/nodes/wireframe/WfNavNode.tsx | within-notation | 22 |
| store/__tests__/model.test.ts | store/__tests__/model.test.ts | other | 22 |

## 3. Abstraction Violations

- **High severity**: 0 (inverted dependencies)
- **Medium severity**: 3 (cross-notation coupling)
- **Low severity**: 0 (duplication overlap)

### Medium: Cross-Notation Coupling

- Duplicated code between NOTATION-UML and NOTATION-WIREFRAME: renderers/xyflow/nodes/sequence/SequenceLifelineNode.tsx ↔ renderers/xyflow/nodes/wireframe/WfPageNode.tsx (28 lines). Should be extracted to shared infra.
- Duplicated code between NOTATION-PROCESS and NOTATION-UML: renderers/xyflow/nodes/process-flow/PfTaskNode.tsx ↔ renderers/xyflow/nodes/uml/UmlActivityNode.tsx (16 lines). Should be extracted to shared infra.
- Duplicated code between NOTATION-PROCESS and NOTATION-UML: renderers/xyflow/nodes/process-flow/PfGateNode.tsx ↔ renderers/xyflow/nodes/uml/UmlActivityNode.tsx (19 lines). Should be extracted to shared infra.

## 4. Dependency Health

### Circular Dependencies (2)

- SHARED-INFRA → RENDERER-SPATIAL → SHARED-INFRA
- OTHER → UI → SHARED-INFRA → OTHER

### High Fan-Out Modules (potential God modules)

- **UI**: fan-out 116, 29 files
- **OTHER**: fan-out 101, 8 files
- **NOTATION-WIREFRAME**: fan-out 20, 8 files
- **SHARED-INFRA**: fan-out 36, 37 files
- **NOTATION-UML**: fan-out 17, 12 files

### High Instability (>0.8)

- **SERVER**: instability 1 (fan-in: 0, fan-out: 1)
- **UI**: instability 0.983 (fan-in: 2, fan-out: 116)
- **OTHER**: instability 0.962 (fan-in: 4, fan-out: 101)
- **RENDERER-FLAT**: instability 0.909 (fan-in: 1, fan-out: 10)

### Low Instability / High Fan-In (rigid)

- **API**: instability 0.158 (fan-in: 16)
- **STORE**: instability 0.137 (fan-in: 63)
- **MODEL**: instability 0 (fan-in: 81)

## 5. Recommendations

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Extract duplicated cross-notation code to shared infrastructure | M | M |
| 2 | Consolidate within-notation duplicates | S | S |
| 3 | Reduce fan-out of God modules | L | L |
| 4 | Break circular dependencies | M | L |

**1. Extract duplicated cross-notation code to shared infrastructure**
3 cross-notation clone pairs. These represent patterns that should live in shared-infra.

**2. Consolidate within-notation duplicates**
17 within-notation clone pairs. Consider shared base components within each notation family.

**3. Reduce fan-out of God modules**
UI, OTHER, NOTATION-WIREFRAME, SHARED-INFRA, NOTATION-UML have excessive fan-out. Consider facade patterns or splitting responsibilities.

**4. Break circular dependencies**
2 cycles detected. Introduce interfaces or dependency inversion to break cycles.

## 6. Views Created

*Views not imported (import phase skipped or server unavailable).*
