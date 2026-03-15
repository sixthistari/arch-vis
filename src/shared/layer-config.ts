/**
 * Canonical layer/sublayer ordering — single source of truth.
 *
 * Every module that needs to sort or label ArchiMate layers imports from here
 * rather than maintaining its own copy.
 */

// ═══════════════════════════════════════
// Layer ordering
// ═══════════════════════════════════════

/** Canonical layer sort order (lower number = higher in the stack). */
export const LAYER_ORDER: Record<string, number> = {
  motivation: 0,
  strategy: 1,
  business: 2,
  business_upper: 2,
  business_lower: 3,
  application: 4,
  data: 5,
  technology: 6,
  implementation: 7,
};

/** Ordered list of layer keys (no _upper/_lower variants). */
export const LAYER_SEQUENCE: readonly string[] = [
  'motivation',
  'strategy',
  'business',
  'application',
  'technology',
  'data',
  'implementation',
];

/** Ordered list including _upper/_lower variants (for tree/palette display). */
export const LAYER_SEQUENCE_FULL: readonly string[] = [
  'motivation', 'strategy', 'business', 'business_upper', 'business_lower',
  'application', 'data', 'technology', 'implementation',
];

// ═══════════════════════════════════════
// Layer labels (Australian English)
// ═══════════════════════════════════════

/** Human-readable layer labels. */
export const LAYER_LABELS: Record<string, string> = {
  motivation: 'Motivation',
  strategy: 'Strategy',
  business: 'Business',
  business_upper: 'Business — Functions & Processes',
  business_lower: 'Business — Services & Information',
  application: 'Application',
  data: 'Data & Artefacts',
  technology: 'Technology',
  implementation: 'Implementation & Migration',
};

// ═══════════════════════════════════════
// Sublayer ordering (archimate_type → sort order within its layer)
// ═══════════════════════════════════════

export const SUBLAYER_ORDER: Record<string, number> = {
  // Motivation
  'stakeholder': 0, 'driver': 10, 'assessment': 20, 'goal': 30, 'outcome': 40,
  'principle': 50, 'constraint': 50, 'requirement': 60, 'meaning': 35, 'value': 45,
  // Strategy
  'value-stream': 0, 'course-of-action': 10, 'capability': 20, 'resource': 30,
  // Business
  'business-actor': 0, 'business-role': 0, 'business-collaboration': 5,
  'business-service': 10, 'business-interface': 15,
  'business-process': 20, 'business-function': 20, 'business-interaction': 20,
  'business-event': 25, 'business-object': 30, 'contract': 30, 'representation': 30, 'product': 35,
  // Application
  'application-service': 0, 'application-interface': 5,
  'application-process': 10, 'application-function': 10, 'application-interaction': 10,
  'application-event': 15, 'application-component': 20, 'application-collaboration': 20,
  'data-object': 30,
  // Technology
  'technology-service': 0, 'technology-interface': 5,
  'technology-process': 10, 'technology-function': 10, 'technology-interaction': 10,
  'technology-event': 15, 'node': 20, 'device': 20, 'system-software': 25,
  'technology-collaboration': 20, 'communication-network': 30, 'path': 30, 'artifact': 35,
  // Implementation & Migration
  'gap': 0, 'plateau': 10, 'implementation-event': 15, 'deliverable': 20, 'work-package': 30,
};

// ═══════════════════════════════════════
// Notation-specific relationship types
// ═══════════════════════════════════════

export interface RelationshipTypeOption {
  value: string;
  label: string;
}

export const NOTATION_RELATIONSHIP_TYPES: Record<'archimate' | 'uml' | 'wireframe' | 'data', RelationshipTypeOption[]> = {
  archimate: [
    { value: 'association',    label: 'Association' },
    { value: 'serving',        label: 'Serving' },
    { value: 'assignment',     label: 'Assignment' },
    { value: 'realisation',    label: 'Realisation' },
    { value: 'composition',    label: 'Composition' },
    { value: 'aggregation',    label: 'Aggregation' },
    { value: 'influence',      label: 'Influence' },
    { value: 'triggering',     label: 'Triggering' },
    { value: 'flow',           label: 'Flow' },
    { value: 'access',         label: 'Access' },
    { value: 'specialisation', label: 'Specialisation' },
  ],
  uml: [
    { value: 'uml-inheritance',   label: 'Inheritance' },
    { value: 'uml-realisation',   label: 'Realisation' },
    { value: 'uml-composition',   label: 'Composition' },
    { value: 'uml-aggregation',   label: 'Aggregation' },
    { value: 'uml-association',   label: 'Association' },
    { value: 'uml-dependency',    label: 'Dependency' },
    { value: 'uml-control-flow',  label: 'Control Flow' },
    { value: 'uml-object-flow',   label: 'Object Flow' },
  ],
  wireframe: [
    { value: 'wf-contains',      label: 'Contains' },
    { value: 'wf-navigates-to',  label: 'Navigates To' },
    { value: 'wf-binds-to',      label: 'Binds To' },
  ],
  data: [
    { value: 'dm-has-attribute',  label: 'Has Attribute' },
    { value: 'dm-references',     label: 'References' },
    { value: 'dm-one-to-one',     label: 'One-to-One' },
    { value: 'dm-one-to-many',    label: 'One-to-Many' },
    { value: 'dm-many-to-many',   label: 'Many-to-Many' },
  ],
};
