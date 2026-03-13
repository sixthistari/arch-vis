# Viewpoint Definitions

## Layered (ArchiMate standard)

All elements by ArchiMate layer with sublayer ordering. Traditional full-stack architecture view. AI/Knowledge specialised elements appear in their proper layers alongside traditional elements.

**Filter:** All elements, or filtered by domain.
**Layout:** ELK hierarchical (flat) or spatial 3D (layer planes).
**Renderer:** Flat SVG or Spatial SVG.

## Knowledge & Cognition

SIS Brain poster layout. Filters all specialised elements from across their layers and reorganises by domain grouping with shared infrastructure at bottom.

**Filter:** Elements where `specialisation IS NOT NULL`, plus technology infrastructure they depend on.
**Layout:** Custom — domain columns, shared infrastructure row at bottom.
**Renderer:** Flat SVG.

## Domain Slice

One domain's complete vertical stack: motivation → strategy → business → application → technology → data.

**Filter:** `domain_id = <selected_domain>`.
**Layout:** Hierarchical by layer.
**Renderer:** Flat SVG or Spatial.

## Governance Matrix

Matrix view: Domain Agents × (Grounding + Governance + Quality). Not a diagram — a table.

**Data source:**
- Rows: elements where `specialisation = 'domain-agent'`
- Grounding columns: follow `grounded_in` relationships to knowledge stores
- Governance columns: follow `governed_by` relationships to constraints (autonomy levels, HITL gates)
- Quality columns: quality evaluation scores from PFC

**Renderer:** HTML table/grid component, not SVG.

## Process Detail

Drill-down from a business-process element into its process_steps. Renders as a simplified swimlane or sequence flow.

**Data source:** `process_steps` table where `process_id = <selected_process>`.
**Layout:** Left-to-right sequence. Lanes by role/agent.
**Shapes:**
- human step: person icon rect
- agent step: bot icon rect
- system step: gear icon rect
- decision: diamond
- gateway: diamond with marker

**Renderer:** Flat SVG.

## Infrastructure

Technology and Data/Artifact layers only. Platform architecture.

**Filter:** `layer IN ('technology', 'data')`.
**Layout:** Hierarchical or grid.
**Renderer:** Flat SVG.

## Information

All Data Objects and Artifacts with their relationships.

**Filter:** `layer = 'data'` or `archimate_type IN ('data-object', 'artifact', 'business-object')`.
**Layout:** Hierarchical.
**Renderer:** Flat SVG.

## Application Landscape

Applications in grid/matrix layout. X-axis = domain. Y-axis = tier (strategic/tactical/retire).

**Filter:** `archimate_type = 'application-component'`.
**Layout:** Grid, positioned by domain_id (x) and tier property (y).
**Renderer:** Flat SVG.
