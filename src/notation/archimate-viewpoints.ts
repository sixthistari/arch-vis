/**
 * ArchiMate 3.2 named viewpoints (§14).
 *
 * Each viewpoint restricts which element types and relationship types
 * are valid on the canvas. The Palette reads the active viewpoint and
 * filters its element groups accordingly.
 */
import type { ArchimateType, RelationshipType } from '../model/types';

// ═══════════════════════════════════════
// Viewpoint definition
// ═══════════════════════════════════════

export interface ArchiMateViewpoint {
  /** Machine-readable identifier — stored in views.viewpoint_type. */
  id: string;
  /** Human-readable name (Australian English). */
  name: string;
  /** Short description of the viewpoint's purpose. */
  description: string;
  /** Element types allowed on the canvas for this viewpoint. */
  allowedElementTypes: ArchimateType[];
  /** Relationship types allowed on the canvas for this viewpoint. */
  allowedRelationshipTypes: RelationshipType[];
}

// ═══════════════════════════════════════
// Shared sets for reuse
// ═══════════════════════════════════════

const MOTIVATION_ELEMENTS: ArchimateType[] = [
  'stakeholder', 'driver', 'assessment', 'goal', 'outcome',
  'principle', 'requirement', 'constraint', 'meaning', 'value',
];

const STRATEGY_ELEMENTS: ArchimateType[] = [
  'resource', 'capability', 'value-stream', 'course-of-action',
];

const BUSINESS_ACTIVE: ArchimateType[] = [
  'business-actor', 'business-role', 'business-collaboration',
  'business-interface',
];

const BUSINESS_BEHAVIOUR: ArchimateType[] = [
  'business-process', 'business-function', 'business-interaction',
  'business-event', 'business-service',
];

const BUSINESS_PASSIVE: ArchimateType[] = [
  'business-object', 'contract', 'representation', 'product',
];

const BUSINESS_ALL: ArchimateType[] = [
  ...BUSINESS_ACTIVE, ...BUSINESS_BEHAVIOUR, ...BUSINESS_PASSIVE,
];

const APPLICATION_ACTIVE: ArchimateType[] = [
  'application-component', 'application-collaboration',
  'application-interface',
];

const APPLICATION_BEHAVIOUR: ArchimateType[] = [
  'application-function', 'application-process',
  'application-interaction', 'application-event',
  'application-service',
];

const APPLICATION_PASSIVE: ArchimateType[] = [
  'data-object',
];

const APPLICATION_ALL: ArchimateType[] = [
  ...APPLICATION_ACTIVE, ...APPLICATION_BEHAVIOUR, ...APPLICATION_PASSIVE,
];

const TECHNOLOGY_ACTIVE: ArchimateType[] = [
  'node', 'device', 'system-software', 'technology-collaboration',
  'technology-interface', 'communication-network', 'path',
];

const TECHNOLOGY_BEHAVIOUR: ArchimateType[] = [
  'technology-function', 'technology-process',
  'technology-interaction', 'technology-event',
  'technology-service',
];

const TECHNOLOGY_PASSIVE: ArchimateType[] = [
  'artifact',
];

const TECHNOLOGY_ALL: ArchimateType[] = [
  ...TECHNOLOGY_ACTIVE, ...TECHNOLOGY_BEHAVIOUR, ...TECHNOLOGY_PASSIVE,
];

const PHYSICAL_ELEMENTS: ArchimateType[] = [
  'node', 'device', 'path', 'communication-network',
  'system-software', 'artifact',
];

const IMPL_MIGRATION_ELEMENTS: ArchimateType[] = [
  'work-package', 'deliverable', 'implementation-event',
  'plateau', 'gap',
];

const COMPOSITE_ELEMENTS: ArchimateType[] = [
  'grouping', 'location',
];

/** All structural ArchiMate relationship types. */
const ALL_ARCHIMATE_RELS: RelationshipType[] = [
  'composition', 'aggregation', 'assignment', 'realisation',
  'serving', 'access', 'influence', 'triggering', 'flow',
  'specialisation', 'association',
];


// ═══════════════════════════════════════
// The 23 named viewpoints
// ═══════════════════════════════════════

export const ARCHIMATE_VIEWPOINTS: ArchiMateViewpoint[] = [
  // ── 1. Organisation ────────────────────────────────────────────
  {
    id: 'am_organisation',
    name: 'Organisation',
    description: 'Shows the structure of the enterprise in terms of its business actors, roles, and their collaborations.',
    allowedElementTypes: [
      ...BUSINESS_ACTIVE,
      'location',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'association',
      'specialisation',
    ],
  },

  // ── 2. Application Cooperation ─────────────────────────────────
  {
    id: 'am_application_cooperation',
    name: 'Application Cooperation',
    description: 'Shows application components and their mutual cooperation through services and data flows.',
    allowedElementTypes: [
      ...APPLICATION_ALL,
      'location',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'realisation',
      'serving', 'flow', 'triggering', 'access', 'association',
      'specialisation',
    ],
  },

  // ── 3. Application Usage ───────────────────────────────────────
  {
    id: 'am_application_usage',
    name: 'Application Usage',
    description: 'Shows how applications serve business processes and other elements.',
    allowedElementTypes: [
      ...BUSINESS_ALL,
      ...APPLICATION_ALL,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 4. Business Process Cooperation ────────────────────────────
  {
    id: 'am_business_process_cooperation',
    name: 'Business Process Cooperation',
    description: 'Shows business processes and their cooperation through data and services.',
    allowedElementTypes: [
      ...BUSINESS_ALL,
      ...APPLICATION_ACTIVE,
      'application-service',
      'data-object',
      'location',
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 5. Implementation and Deployment ───────────────────────────
  {
    id: 'am_implementation_deployment',
    name: 'Implementation and Deployment',
    description: 'Shows how applications are mapped onto technology infrastructure.',
    allowedElementTypes: [
      ...APPLICATION_ACTIVE,
      'application-service',
      ...TECHNOLOGY_ALL,
      'artifact',
      'communication-network',
      'location',
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 6. Information Structure ───────────────────────────────────
  {
    id: 'am_information_structure',
    name: 'Information Structure',
    description: 'Shows the structure of the information used in the enterprise, including data objects and their relationships.',
    allowedElementTypes: [
      'business-object', 'data-object', 'representation',
      'meaning', 'artifact',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'association', 'access',
      'realisation', 'specialisation',
    ],
  },

  // ── 7. Layered ─────────────────────────────────────────────────
  {
    id: 'am_layered',
    name: 'Layered',
    description: 'Shows all layers of the enterprise architecture — motivation, strategy, business, application, and technology.',
    allowedElementTypes: [
      ...MOTIVATION_ELEMENTS,
      ...STRATEGY_ELEMENTS,
      ...BUSINESS_ALL,
      ...APPLICATION_ALL,
      ...TECHNOLOGY_ALL,
      ...IMPL_MIGRATION_ELEMENTS,
      ...COMPOSITE_ELEMENTS,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 8. Migration ───────────────────────────────────────────────
  {
    id: 'am_migration',
    name: 'Migration',
    description: 'Shows the transition from baseline to target architecture using plateaus and gaps.',
    allowedElementTypes: [
      ...IMPL_MIGRATION_ELEMENTS,
      'grouping',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'association', 'triggering',
      'flow', 'realisation',
    ],
  },

  // ── 9. Motivation ──────────────────────────────────────────────
  {
    id: 'am_motivation',
    name: 'Motivation',
    description: 'Shows the motivational aspects: stakeholders, drivers, goals, principles, and requirements.',
    allowedElementTypes: [
      ...MOTIVATION_ELEMENTS,
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'association', 'influence',
      'realisation', 'specialisation',
    ],
  },

  // ── 10. Physical ───────────────────────────────────────────────
  {
    id: 'am_physical',
    name: 'Physical',
    description: 'Shows the physical environment: devices, nodes, networks, and their location.',
    allowedElementTypes: [
      ...PHYSICAL_ELEMENTS,
      'location',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'serving',
      'realisation', 'association', 'specialisation',
    ],
  },

  // ── 11. Product ────────────────────────────────────────────────
  {
    id: 'am_product',
    name: 'Product',
    description: 'Shows the products offered and the services, contracts, and business objects associated with them.',
    allowedElementTypes: [
      'product', 'business-service', 'application-service',
      'technology-service', 'contract', 'business-object',
      'data-object', 'value',
      ...BUSINESS_ACTIVE,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 12. Requirements Realisation ───────────────────────────────
  {
    id: 'am_requirements_realisation',
    name: 'Requirements Realisation',
    description: 'Shows how requirements are realised by core elements across the architecture.',
    allowedElementTypes: [
      'requirement', 'constraint', 'principle', 'goal',
      ...BUSINESS_ALL,
      ...APPLICATION_ALL,
      ...TECHNOLOGY_ALL,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 13. Service Realisation ────────────────────────────────────
  {
    id: 'am_service_realisation',
    name: 'Service Realisation',
    description: 'Shows how services are realised by internal behaviour and active structure.',
    allowedElementTypes: [
      'business-service', 'application-service', 'technology-service',
      ...BUSINESS_ACTIVE, ...BUSINESS_BEHAVIOUR,
      ...APPLICATION_ACTIVE, ...APPLICATION_BEHAVIOUR,
      ...TECHNOLOGY_ACTIVE, ...TECHNOLOGY_BEHAVIOUR,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 14. Stakeholder ────────────────────────────────────────────
  {
    id: 'am_stakeholder',
    name: 'Stakeholder',
    description: 'Shows the stakeholders, their concerns (drivers), and the goals that address those concerns.',
    allowedElementTypes: [
      'stakeholder', 'driver', 'assessment', 'goal', 'outcome',
      'value',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'association', 'influence',
      'realisation',
    ],
  },

  // ── 15. Strategy ───────────────────────────────────────────────
  {
    id: 'am_strategy',
    name: 'Strategy',
    description: 'Shows the strategic direction: capabilities, resources, value streams, and courses of action.',
    allowedElementTypes: [
      ...STRATEGY_ELEMENTS,
      ...MOTIVATION_ELEMENTS,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 16. Technology ─────────────────────────────────────────────
  {
    id: 'am_technology',
    name: 'Technology',
    description: 'Shows the technology layer: infrastructure, platforms, and their services.',
    allowedElementTypes: [
      ...TECHNOLOGY_ALL,
      'location',
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 17. Technology Usage ───────────────────────────────────────
  {
    id: 'am_technology_usage',
    name: 'Technology Usage',
    description: 'Shows how application components are supported by technology infrastructure.',
    allowedElementTypes: [
      ...APPLICATION_ALL,
      ...TECHNOLOGY_ALL,
      'location',
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 18. Goal Realisation ───────────────────────────────────────
  {
    id: 'am_goal_realisation',
    name: 'Goal Realisation',
    description: 'Shows how goals are refined and realised by principles and requirements.',
    allowedElementTypes: [
      'goal', 'outcome', 'principle', 'requirement', 'constraint',
      'stakeholder', 'driver', 'assessment',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'association', 'influence',
      'realisation', 'specialisation',
    ],
  },

  // ── 19. Application Structure ──────────────────────────────────
  {
    id: 'am_application_structure',
    name: 'Application Structure',
    description: 'Shows the internal structure of application components and their interfaces.',
    allowedElementTypes: [
      ...APPLICATION_ACTIVE,
      'data-object',
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'association',
      'serving', 'access', 'specialisation',
    ],
  },

  // ── 20. Application Interaction ────────────────────────────────
  {
    id: 'am_application_interaction',
    name: 'Application Interaction',
    description: 'Shows how application components interact through services and connectors.',
    allowedElementTypes: [
      ...APPLICATION_ALL,
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'serving',
      'flow', 'triggering', 'association', 'specialisation',
    ],
  },

  // ── 21. Business Cooperation ───────────────────────────────────
  {
    id: 'am_business_cooperation',
    name: 'Business Cooperation',
    description: 'Shows the cooperation between business actors through shared services and information.',
    allowedElementTypes: [
      ...BUSINESS_ALL,
      'location',
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },

  // ── 22. Business Function ──────────────────────────────────────
  {
    id: 'am_business_function',
    name: 'Business Function',
    description: 'Shows the main business functions and their relationships.',
    allowedElementTypes: [
      'business-function', 'business-service', 'business-object',
      ...BUSINESS_ACTIVE,
    ],
    allowedRelationshipTypes: [
      'composition', 'aggregation', 'assignment', 'serving',
      'access', 'triggering', 'flow', 'association', 'specialisation',
    ],
  },

  // ── 23. Business Product ───────────────────────────────────────
  {
    id: 'am_business_product',
    name: 'Business Product',
    description: 'Shows the products and services offered to external customers, including contracts.',
    allowedElementTypes: [
      'product', 'business-service', 'contract', 'business-object',
      'value', 'business-interface',
      ...BUSINESS_ACTIVE,
    ],
    allowedRelationshipTypes: ALL_ARCHIMATE_RELS,
  },
];

// ═══════════════════════════════════════
// Lookup helpers
// ═══════════════════════════════════════

/** Map from viewpoint ID → viewpoint definition. */
const VIEWPOINT_MAP = new Map<string, ArchiMateViewpoint>(
  ARCHIMATE_VIEWPOINTS.map(vp => [vp.id, vp]),
);

/** Look up a named ArchiMate viewpoint by its ID. Returns undefined for non-ArchiMate or custom viewpoints. */
export function getArchiMateViewpoint(id: string): ArchiMateViewpoint | undefined {
  return VIEWPOINT_MAP.get(id);
}

/** All viewpoint IDs as a typed array (for use in viewpointTypeValues). */
export const archiMateViewpointIds = ARCHIMATE_VIEWPOINTS.map(vp => vp.id);

/**
 * Given a viewpoint ID, return the set of allowed element types.
 * Returns null if the viewpoint is not a named ArchiMate viewpoint
 * (meaning no filtering should be applied).
 */
export function getAllowedElementTypes(viewpointId: string): Set<ArchimateType> | null {
  const vp = VIEWPOINT_MAP.get(viewpointId);
  if (!vp) return null;
  return new Set(vp.allowedElementTypes);
}

/**
 * Given a viewpoint ID, return the set of allowed relationship types.
 * Returns null if the viewpoint is not a named ArchiMate viewpoint.
 */
export function getAllowedRelationshipTypes(viewpointId: string): Set<RelationshipType> | null {
  const vp = VIEWPOINT_MAP.get(viewpointId);
  if (!vp) return null;
  return new Set(vp.allowedRelationshipTypes);
}
