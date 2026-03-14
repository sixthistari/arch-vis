import { z } from 'zod';

// ═══════════════════════════════════════
// String literal union types
// ═══════════════════════════════════════

export const archimateLayerValues = [
  'motivation',
  'strategy',
  'business',
  'application',
  'technology',
  'data',
  'implementation',
  'none',
] as const;

export type ArchimateLayer = (typeof archimateLayerValues)[number];

export const archimateTypeValues = [
  // Motivation
  'stakeholder',
  'driver',
  'assessment',
  'goal',
  'outcome',
  'principle',
  'requirement',
  'constraint',
  'meaning',
  'value',
  // Strategy
  'resource',
  'capability',
  'value-stream',
  'course-of-action',
  // Business
  'business-actor',
  'business-role',
  'business-collaboration',
  'business-interface',
  'business-process',
  'business-function',
  'business-interaction',
  'business-event',
  'business-service',
  'business-object',
  'contract',
  'representation',
  'product',
  // Application
  'application-component',
  'application-collaboration',
  'application-interface',
  'application-function',
  'application-process',
  'application-interaction',
  'application-event',
  'application-service',
  'data-object',
  // Technology
  'node',
  'device',
  'system-software',
  'technology-collaboration',
  'technology-interface',
  'technology-function',
  'technology-process',
  'technology-interaction',
  'technology-event',
  'technology-service',
  'artifact',
  'communication-network',
  'path',
  // Implementation & Migration
  'work-package',
  'deliverable',
  'implementation-event',
  'plateau',
  'gap',
  // Other / Composite
  'grouping',
  'location',
  'junction',
  // UML element types (Phase 3)
  'uml-class',
  'uml-abstract-class',
  'uml-interface',
  'uml-enum',
  'uml-component',
  'uml-actor',
  'uml-use-case',
  'uml-state',
  'uml-activity',
  'uml-action',
  'uml-decision',
  'uml-merge',
  'uml-fork',
  'uml-join',
  'uml-initial-node',
  'uml-final-node',
  'uml-flow-final',
  'uml-note',
  'uml-package',
  // Wireframe element types (Phase 3)
  'wf-page',
  'wf-section',
  'wf-header',
  'wf-nav',
  'wf-button',
  'wf-input',
  'wf-textarea',
  'wf-select',
  'wf-checkbox',
  'wf-radio',
  'wf-table',
  'wf-image',
  'wf-icon',
  'wf-text',
  'wf-link',
  'wf-modal',
  'wf-card',
  'wf-list',
  'wf-tab-group',
  'wf-form',
  'wf-placeholder',
  'wf-feedback',
  // UML sequence diagram types (Phase 4)
  'uml-lifeline',
  'uml-activation',
  'uml-fragment',
] as const;

export type ArchimateType = (typeof archimateTypeValues)[number];

export const relationshipTypeValues = [
  'composition',
  'aggregation',
  'assignment',
  'realisation',
  'serving',
  'access',
  'influence',
  'triggering',
  'flow',
  'specialisation',
  'association',
  // UML relationship types (Phase 3)
  'uml-inheritance',
  'uml-realisation',
  'uml-composition',
  'uml-aggregation',
  'uml-association',
  'uml-dependency',
  'uml-assembly',
  // UML activity diagram flow types
  'uml-control-flow',
  'uml-object-flow',
  // UML sequence diagram message types (Phase 4)
  'uml-sync-message',
  'uml-async-message',
  'uml-return-message',
  'uml-create-message',
  'uml-destroy-message',
  'uml-self-message',
  // Wireframe relationship types (Phase 3)
  'wf-contains',
  'wf-navigates-to',
  'wf-binds-to',
] as const;

export type RelationshipType = (typeof relationshipTypeValues)[number];

export const specialisationValues = [
  // Motivation (M1–M7, Q1–Q6)
  'ai-guardrail',
  'autonomy-level',
  'explanation-requirement',
  'track-crossing-protocol',
  'human-in-the-loop-gate',
  'safety-case',
  'data-classification-policy',
  'retrieval-quality',
  'generation-quality',
  'graph-quality',
  'extraction-quality',
  'end-to-end-quality',
  'quality-gate',
  // Strategy (ST1–ST3)
  'knowledge-capability',
  'domain-boundary',
  'ai-use-case',
  // Business (B1–B8)
  'authority-rule',
  'domain-vocabulary',
  'ground-truth-dataset',
  'scoring-profile',
  'extraction-rule',
  'chunking-strategy',
  'content-type-registry',
  'review-cycle-policy',
  // Application (A1–A11)
  'domain-agent',
  'orchestration-engine',
  'query-router',
  'knowledge-retrieval-service',
  'context-engine',
  'entity-resolution-service',
  'reasoning-trace',
  'ingestion-pipeline',
  'reflection-loop',
  'plan-execute-split',
  'compliance-assessment',
  // Technology (T1–T8)
  'search-engine',
  'graph-database',
  'llm-gateway',
  'embedding-service',
  'document-intelligence',
  'guardrail-engine',
  'observability-platform',
  'agent-framework',
  // Data (DA1–DA12)
  'knowledge-store',
  'core-ontology',
  'ontology-extension',
  'vector-index',
  'medallion-store',
  'graph-instance',
  'source-connector',
  'fallback-path',
  'prompt-library',
  'decision-trace-log',
  'session-memory-store',
  'model-catalogue',
] as const;

export type Specialisation = (typeof specialisationValues)[number];

export const viewpointTypeValues = [
  'layered',
  'knowledge_cognition',
  'domain_slice',
  'governance_matrix',
  'process_detail',
  'infrastructure',
  'information',
  'application_landscape',
  'custom',
  'uml_class',
  'uml_component',
  'wireframe',
  'uml_sequence',
  'uml_activity',
  'uml_usecase',
] as const;

export type ViewpointType = (typeof viewpointTypeValues)[number];

export const renderModeValues = ['flat', 'spatial'] as const;
export type RenderMode = (typeof renderModeValues)[number];

export const elementStatusValues = [
  'active',
  'draft',
  'superseded',
  'deprecated',
  'retired',
] as const;

export type ElementStatus = (typeof elementStatusValues)[number];

export const maturityValues = [
  'initial',
  'defined',
  'managed',
  'optimised',
] as const;

export type Maturity = (typeof maturityValues)[number];

export const autonomyLevelValues = [
  'L0',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
] as const;

export type AutonomyLevel = (typeof autonomyLevelValues)[number];

export const trackValues = ['Track1', 'Track2'] as const;
export type Track = (typeof trackValues)[number];

// ═══════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════

export const ArchimateLayerSchema = z.enum(archimateLayerValues);
export const ArchimateTypeSchema = z.enum(archimateTypeValues);
export const RelationshipTypeSchema = z.enum(relationshipTypeValues);
export const SpecialisationSchema = z.enum(specialisationValues);
export const ViewpointTypeSchema = z.enum(viewpointTypeValues);
export const RenderModeSchema = z.enum(renderModeValues);
export const ElementStatusSchema = z.enum(elementStatusValues);

// ═══════════════════════════════════════
// Per-notation property schemas
// ═══════════════════════════════════════

const UmlMemberSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  visibility: z.enum(['+', '-', '#', '~']).optional(),
});

export const UmlClassPropertiesSchema = z.object({
  attributes: z.array(UmlMemberSchema),
  methods: z.array(UmlMemberSchema),
  isAbstract: z.boolean().optional(),
});

export type UmlClassProperties = z.infer<typeof UmlClassPropertiesSchema>;

export const UmlEnumPropertiesSchema = z.object({
  literals: z.array(z.string()),
});

export type UmlEnumProperties = z.infer<typeof UmlEnumPropertiesSchema>;

export const UmlSequenceFragmentPropertiesSchema = z.object({
  operator: z.enum(['alt', 'opt', 'loop', 'break', 'par', 'critical', 'ref']),
  guard: z.string().optional(),
});

export type UmlSequenceFragmentProperties = z.infer<typeof UmlSequenceFragmentPropertiesSchema>;

export const WfPagePropertiesSchema = z.object({
  url: z.string().optional(),
  pageWidth: z.number().optional(),
});

export type WfPageProperties = z.infer<typeof WfPagePropertiesSchema>;

export const WfTablePropertiesSchema = z.object({
  columns: z.array(z.string()),
  rows: z.number().int().optional(),
  sampleData: z.array(z.array(z.string())).optional(),
});

export type WfTableProperties = z.infer<typeof WfTablePropertiesSchema>;

export const WfInputPropertiesSchema = z.object({
  placeholder: z.string().optional(),
  inputType: z.enum(['text', 'email', 'password', 'number', 'date', 'search']).optional(),
});

export type WfInputProperties = z.infer<typeof WfInputPropertiesSchema>;

export const WfSelectPropertiesSchema = z.object({
  options: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
});

export type WfSelectProperties = z.infer<typeof WfSelectPropertiesSchema>;

/** Map from archimate_type to the expected properties schema. */
export const propertiesSchemaByType: Partial<Record<ArchimateType, z.ZodType>> = {
  'uml-class': UmlClassPropertiesSchema,
  'uml-abstract-class': UmlClassPropertiesSchema,
  'uml-interface': UmlClassPropertiesSchema,
  'uml-enum': UmlEnumPropertiesSchema,
  'uml-fragment': UmlSequenceFragmentPropertiesSchema,
  'wf-page': WfPagePropertiesSchema,
  'wf-table': WfTablePropertiesSchema,
  'wf-input': WfInputPropertiesSchema,
  'wf-textarea': WfInputPropertiesSchema,
  'wf-select': WfSelectPropertiesSchema,
};

/**
 * Validate properties against the typed schema for a given archimate_type.
 * Returns { success: true, data } or { success: false, error }.
 * If no typed schema exists for the type, any record is accepted.
 */
export function validateProperties(
  archimateType: ArchimateType,
  properties: Record<string, unknown> | null,
): z.SafeParseReturnType<unknown, unknown> {
  const schema = propertiesSchemaByType[archimateType];
  if (!schema) {
    return z.record(z.unknown()).nullable().safeParse(properties);
  }
  return schema.nullable().safeParse(properties);
}

// ═══════════════════════════════════════
// Domain
// ═══════════════════════════════════════

export const DomainSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priority: z.number().int().nullable(),
  maturity: z.string().nullable(),
  autonomy_ceiling: z.string().nullable(),
  track_default: z.string().nullable(),
  owner_role: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Domain = z.infer<typeof DomainSchema>;

export const CreateDomainSchema = DomainSchema.omit({
  created_at: true,
  updated_at: true,
});

export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;

// ═══════════════════════════════════════
// Element
// ═══════════════════════════════════════

export const ElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  archimate_type: ArchimateTypeSchema,
  specialisation: z.string().nullable(),
  layer: ArchimateLayerSchema,
  sublayer: z.string().nullable(),
  domain_id: z.string().nullable(),
  status: ElementStatusSchema,
  description: z.string().nullable(),
  properties: z.record(z.unknown()).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  source_session_id: z.string().nullable(),
  parent_id: z.string().nullable(),
  created_by: z.string().nullable(),
  source: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Element = z.infer<typeof ElementSchema>;

export const CreateElementSchema = ElementSchema.omit({
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
  sublayer: true,
  domain_id: true,
  description: true,
  properties: true,
  confidence: true,
  source_session_id: true,
  parent_id: true,
  created_by: true,
  source: true,
});

export type CreateElementInput = z.infer<typeof CreateElementSchema>;

export const UpdateElementSchema = CreateElementSchema.partial().required({
  id: true,
});

export type UpdateElementInput = z.infer<typeof UpdateElementSchema>;

// ═══════════════════════════════════════
// Relationship
// ═══════════════════════════════════════

export const RelationshipSchema = z.object({
  id: z.string(),
  archimate_type: RelationshipTypeSchema,
  specialisation: z.string().nullable(),
  source_id: z.string(),
  target_id: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  properties: z.record(z.unknown()).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  created_by: z.string().nullable(),
  source: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

export const CreateRelationshipSchema = RelationshipSchema.omit({
  created_at: true,
  updated_at: true,
}).partial({
  specialisation: true,
  label: true,
  description: true,
  properties: true,
  confidence: true,
  created_by: true,
  source: true,
});

export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>;

export const UpdateRelationshipSchema = CreateRelationshipSchema.partial().required({
  id: true,
});

export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>;

// ═══════════════════════════════════════
// Batch Import
// ═══════════════════════════════════════

export interface BatchElementInputParsed {
  id?: string;
  name: string;
  archimate_type: z.infer<typeof ArchimateTypeSchema>;
  layer: z.infer<typeof ArchimateLayerSchema>;
  specialisation?: string | null;
  sublayer?: string | null;
  description?: string | null;
  children?: BatchElementInputParsed[];
}

export const BatchElementInputSchema: z.ZodType<BatchElementInputParsed> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string(),
    archimate_type: ArchimateTypeSchema,
    layer: ArchimateLayerSchema,
    specialisation: z.string().nullable().optional(),
    sublayer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    children: z.array(BatchElementInputSchema).optional(),
  })
);

export const BatchRelationshipInputSchema = z.object({
  id: z.string().optional(),
  archimate_type: RelationshipTypeSchema,
  source_id: z.string().optional(),
  source_name: z.string().optional(),
  target_id: z.string().optional(),
  target_name: z.string().optional(),
  label: z.string().nullable().optional(),
  specialisation: z.string().nullable().optional(),
});

export const BatchImportBodySchema = z.object({
  notation: z.string().optional(),
  elements: z.array(BatchElementInputSchema).optional(),
  relationships: z.array(BatchRelationshipInputSchema).optional(),
  view: z.object({
    id: z.string().optional(),
    name: z.string(),
    viewpoint: z.string().optional(),
    render_mode: z.string().optional(),
  }).optional(),
});

// ═══════════════════════════════════════
// View
// ═══════════════════════════════════════

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  viewpoint_type: ViewpointTypeSchema,
  description: z.string().nullable(),
  render_mode: RenderModeSchema,
  filter_domain: z.string().nullable(),
  filter_layers: z.array(z.string()).nullable(),
  filter_specialisations: z.array(z.string()).nullable(),
  rotation_default: z.object({ y: z.number(), x: z.number() }).nullable(),
  is_preset: z.union([z.boolean(), z.number()]),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type View = z.infer<typeof ViewSchema>;

export const CreateViewSchema = ViewSchema.omit({
  created_at: true,
  updated_at: true,
}).partial({
  description: true,
  render_mode: true,
  filter_domain: true,
  filter_layers: true,
  filter_specialisations: true,
  rotation_default: true,
  is_preset: true,
});

export type CreateViewInput = z.infer<typeof CreateViewSchema>;

// ═══════════════════════════════════════
// View Element
// ═══════════════════════════════════════

export const ViewElementSchema = z.object({
  view_id: z.string(),
  element_id: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  sublayer_override: z.string().nullable(),
  style_overrides: z.record(z.unknown()).nullable(),
});

export type ViewElement = z.infer<typeof ViewElementSchema>;

// ═══════════════════════════════════════
// View Relationship
// ═══════════════════════════════════════

export const ViewRelationshipSchema = z.object({
  view_id: z.string(),
  relationship_id: z.string(),
  route_points: z.array(z.object({ x: z.number(), y: z.number() })).nullable(),
  style_overrides: z.record(z.unknown()).nullable(),
});

export type ViewRelationship = z.infer<typeof ViewRelationshipSchema>;

// ═══════════════════════════════════════
// Sublayer Config
// ═══════════════════════════════════════

export const SublayerEntrySchema = z.object({
  name: z.string(),
  element_types: z.array(z.string()),
  specialisations: z.array(z.string()).optional(),
});

export type SublayerEntry = z.infer<typeof SublayerEntrySchema>;

export const LayerConfigSchema = z.object({
  label: z.string(),
  color_key: z.string(),
  sublayers: z.array(SublayerEntrySchema),
});

export type LayerConfig = z.infer<typeof LayerConfigSchema>;

export const SublayerConfigSchema = z.object({
  layers: z.record(z.string(), LayerConfigSchema),
});

export type SublayerConfig = z.infer<typeof SublayerConfigSchema>;

// ═══════════════════════════════════════
// Valid Relationship (metamodel)
// ═══════════════════════════════════════

export const ValidRelationshipSchema = z.object({
  source_archimate_type: z.string(),
  target_archimate_type: z.string(),
  relationship_type: z.string(),
});

export type ValidRelationship = z.infer<typeof ValidRelationshipSchema>;

// ═══════════════════════════════════════
// API filter types
// ═══════════════════════════════════════

export interface ElementFilters {
  layer?: ArchimateLayer;
  domain?: string;
  specialisation?: Specialisation;
}

export interface RelationshipFilters {
  source_id?: string;
  target_id?: string;
  archimate_type?: RelationshipType;
}

// ═══════════════════════════════════════
// API health response
// ═══════════════════════════════════════

export const HealthResponseSchema = z.object({
  status: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
