# ArchiMate 3.2 — Relationship Types

## Standard Relationships

| Type | Line Style | Source Marker | Target Marker | Semantics |
|------|-----------|---------------|---------------|-----------|
| composition | Solid | Filled diamond | None | Part-of (strong ownership) |
| aggregation | Solid | Open diamond | None | Part-of (weak grouping) |
| assignment | Solid | Filled circle | Arrow | Active structure performs behaviour |
| realisation | Dashed | None | Open triangle | Implements / satisfies |
| serving | Solid | None | Open arrow | Provides service to |
| access | Dashed | None | Arrow(s) | Reads/writes (direction indicates r/w/rw) |
| influence | Dashed | None | Open arrow + modifier | Affects (with +/- strength) |
| triggering | Solid | None | Filled arrow | Causes / triggers |
| flow | Dashed | None | Filled arrow | Transfer of content |
| specialisation | Solid | None | Open triangle | Is-a (inheritance) |
| association | Solid | None | None (or small arrows) | Unspecified / named |

## Specialised Associations (AI/Knowledge)

These are standard ArchiMate `association` relationships with a `specialisation` label.

| Specialisation | Meaning | Typical Source → Target |
|---------------|---------|------------------------|
| grounded_in | Agent retrieves knowledge from this store | domain-agent → knowledge-store |
| governed_by | Element operates under this constraint | domain-agent → autonomy-level, HITL gate |
| measured_by | Element assessed by this quality metric | any → assessment (quality) |
| feeds | Source provides content to pipeline | source-connector → ingestion-pipeline |
| populates | Pipeline writes to store/index | ingestion-pipeline → knowledge-store |
| supersedes | Document/version chain | element → element |
| falls_back_to | Degradation path | service → service |
| crosses_track | Track 2 output entering Track 1 | process → process |
| extends | Ontology specialisation | ontology-extension → core-ontology |

## Edge Rendering

| Relationship | Stroke | Dash | Width | Colour Source |
|-------------|--------|------|-------|---------------|
| composition | Solid | — | 1.2 | Layer colour |
| aggregation | Solid | — | 1.0 | Layer colour |
| assignment | Solid | — | 1.0 | Layer colour |
| realisation | Dashed | 6,3 | 1.0 | Target layer colour |
| serving | Solid | — | 1.0 | Source layer colour |
| access | Dashed | 4,2 | 0.8 | Muted |
| influence | Dashed | 4,4 | 0.8 | Muted |
| triggering | Solid | — | 1.2 | Source layer colour |
| flow | Dashed | — | 1.0 | Data colour |
| specialisation | Solid | — | 1.0 | Layer colour |
| association | Solid | — | 0.8 | Muted |

When highlighted, all relationships render at 2px with the highlight colour.

## Valid Relationship Matrix (Simplified)

ArchiMate defines which relationships are valid between element categories. The full matrix is in the ArchiMate 3.2 spec Appendix B. Key rules:

- **Structural relationships** (composition, aggregation, assignment, realisation) flow within or between adjacent layers
- **Dependency relationships** (serving, access, influence) cross layers freely
- **Dynamic relationships** (triggering, flow) connect behavioural elements
- **Other** (specialisation, association) are unrestricted

The `valid_relationships` table in the schema enforces this. Seed it with the most common valid combinations from the ArchiMate spec.
