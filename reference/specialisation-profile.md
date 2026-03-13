# Specialisation Profile — AI & Knowledge Extensions

55 specialisations across ArchiMate layers. Each maps to exactly one base ArchiMate element type.

## Rendering Rule

- Shape geometry: determined by `archimate_type` (base)
- Badge: 12×8px rounded rect, top-right, shows specialisation code
- Properties panel: shows base + specialisation-specific properties

## Registry

| Code | Specialisation | Base ArchiMate Type | Layer | Core/Expanded |
|------|---------------|-------------------|-------|---------------|
| M1 | ai-guardrail | constraint | motivation | Core |
| M2 | autonomy-level | constraint | motivation | Core |
| M3 | explanation-requirement | requirement | motivation | Core |
| M4 | track-crossing-protocol | principle | motivation | Core |
| M5 | human-in-the-loop-gate | requirement | motivation | Core |
| M6 | safety-case | assessment | motivation | Expanded |
| M7 | data-classification-policy | constraint | motivation | Expanded |
| ST1 | knowledge-capability | capability | strategy | Core |
| ST2 | domain-boundary | capability | strategy | Core |
| ST3 | ai-use-case | course-of-action | strategy | Core |
| B1 | authority-rule | contract | business | Core |
| B2 | domain-vocabulary | business-object | business | Core |
| B3 | ground-truth-dataset | business-object | business | Core |
| B4 | scoring-profile | contract | business | Core |
| B5 | extraction-rule | contract | business | Expanded |
| B6 | chunking-strategy | contract | business | Expanded |
| B7 | content-type-registry | business-object | business | Expanded |
| B8 | review-cycle-policy | contract | business | Expanded |
| A1 | domain-agent | application-component | application | Core |
| A2 | orchestration-engine | application-component | application | Core |
| A3 | query-router | application-service | application | Core |
| A4 | knowledge-retrieval-service | application-service | application | Core |
| A5 | context-engine | application-component | application | Core |
| A6 | entity-resolution-service | application-service | application | Core |
| A7 | reasoning-trace | application-function | application | Core |
| A8 | ingestion-pipeline | application-process | application | Core |
| A9 | reflection-loop | application-function | application | Expanded |
| A10 | plan-execute-split | application-collaboration | application | Expanded |
| A11 | compliance-assessment | application-function | application | Expanded |
| T1 | search-engine | system-software | technology | Core |
| T2 | graph-database | system-software | technology | Core |
| T3 | llm-gateway | system-software | technology | Core |
| T4 | embedding-service | system-software | technology | Core |
| T5 | document-intelligence | system-software | technology | Core |
| T6 | guardrail-engine | system-software | technology | Core |
| T7 | observability-platform | system-software | technology | Expanded |
| T8 | agent-framework | system-software | technology | Expanded |
| DA1 | knowledge-store | data-object | data | Core |
| DA2 | core-ontology | data-object | data | Core |
| DA3 | ontology-extension | data-object | data | Core |
| DA4 | vector-index | artifact | data | Core |
| DA5 | medallion-store | artifact | data | Core |
| DA6 | graph-instance | artifact | data | Core |
| DA7 | source-connector | artifact | data | Core |
| DA8 | fallback-path | artifact | data | Core |
| DA9 | prompt-library | data-object | data | Expanded |
| DA10 | decision-trace-log | data-object | data | Expanded |
| DA11 | session-memory-store | artifact | data | Expanded |
| DA12 | model-catalogue | data-object | data | Expanded |
| Q1 | retrieval-quality | assessment | motivation | Core |
| Q2 | generation-quality | assessment | motivation | Core |
| Q3 | graph-quality | assessment | motivation | Core |
| Q4 | extraction-quality | assessment | motivation | Core |
| Q5 | end-to-end-quality | assessment | motivation | Core |
| Q6 | quality-gate | assessment | motivation | Expanded |

## Specialisation-Specific Properties

Each specialisation adds properties beyond the base ArchiMate type. These are stored in the `properties` JSON column.

### Key Examples

**A1 domain-agent** (base: application-component):
```json
{
  "autonomy_level": "L2",
  "track": "Track1",
  "system_prompt_ref": "path/to/prompt.md",
  "knowledge_store_refs": ["da1-safety-store"],
  "capabilities": ["search", "summarise", "classify"]
}
```

**DA1 knowledge-store** (base: data-object):
```json
{
  "content_types": ["pdf", "docx", "markdown"],
  "document_count": 1250,
  "source_systems": ["SharePoint", "Network Drive"],
  "index_ref": "da4-safety-vector-index",
  "domain": "dom-safety"
}
```

**M2 autonomy-level** (base: constraint):
```json
{
  "level": "L2",
  "track_ceiling": "Track1",
  "governance_required": true
}
```

See the PFC Entity Reference (PFC-Entities.md) for full property definitions per archimate_type.
