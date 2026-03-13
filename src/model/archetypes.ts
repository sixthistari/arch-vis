import type { ArchimateLayer, ArchimateType } from './types';

export const shapeTypeValues = [
  'rect',
  'rounded-rect',
  'pill',
  'folded-corner',
  'box-3d',
  'event',
  'rect-with-icon',
  'dashed-rect',
] as const;

export type ShapeType = (typeof shapeTypeValues)[number];

export interface ArchetypeInfo {
  layer: ArchimateLayer;
  defaultSublayer: string;
  shapeType: ShapeType;
}

/**
 * Maps every ArchiMate base type to its layer, default sublayer, and shape.
 * Layer/sublayer assignments sourced from reference/sublayer-config.yaml.
 * Shape assignments sourced from reference/archimate-elements.md.
 */
// Partial because UML and wireframe types have their own registries (Phase 3)
export const archetypeMap: Partial<Record<ArchimateType, ArchetypeInfo>> = {
  // ── Motivation ──────────────────────────────────
  stakeholder: {
    layer: 'motivation',
    defaultSublayer: 'stakeholders',
    shapeType: 'rect-with-icon',
  },
  driver: {
    layer: 'motivation',
    defaultSublayer: 'drivers_goals',
    shapeType: 'rect',
  },
  assessment: {
    layer: 'motivation',
    defaultSublayer: 'constraints_requirements',
    shapeType: 'rect',
  },
  goal: {
    layer: 'motivation',
    defaultSublayer: 'drivers_goals',
    shapeType: 'rounded-rect',
  },
  outcome: {
    layer: 'motivation',
    defaultSublayer: 'drivers_goals',
    shapeType: 'rounded-rect',
  },
  principle: {
    layer: 'motivation',
    defaultSublayer: 'principles',
    shapeType: 'rect',
  },
  requirement: {
    layer: 'motivation',
    defaultSublayer: 'constraints_requirements',
    shapeType: 'rect',
  },
  constraint: {
    layer: 'motivation',
    defaultSublayer: 'constraints_requirements',
    shapeType: 'rect',
  },
  meaning: {
    layer: 'motivation',
    defaultSublayer: 'drivers_goals',
    shapeType: 'rect',
  },
  value: {
    layer: 'motivation',
    defaultSublayer: 'drivers_goals',
    shapeType: 'rect',
  },

  // ── Strategy ────────────────────────────────────
  resource: {
    layer: 'strategy',
    defaultSublayer: 'capabilities',
    shapeType: 'rect',
  },
  capability: {
    layer: 'strategy',
    defaultSublayer: 'capabilities',
    shapeType: 'rounded-rect',
  },
  'value-stream': {
    layer: 'strategy',
    defaultSublayer: 'value_streams',
    shapeType: 'pill',
  },
  'course-of-action': {
    layer: 'strategy',
    defaultSublayer: 'courses_of_action',
    shapeType: 'rounded-rect',
  },

  // ── Business ────────────────────────────────────
  'business-actor': {
    layer: 'business',
    defaultSublayer: 'actors_roles',
    shapeType: 'rect-with-icon',
  },
  'business-role': {
    layer: 'business',
    defaultSublayer: 'actors_roles',
    shapeType: 'rect',
  },
  'business-collaboration': {
    layer: 'business',
    defaultSublayer: 'actors_roles',
    shapeType: 'rect',
  },
  'business-interface': {
    layer: 'business',
    defaultSublayer: 'actors_roles',
    shapeType: 'rect-with-icon',
  },
  'business-process': {
    layer: 'business',
    defaultSublayer: 'processes_functions',
    shapeType: 'pill',
  },
  'business-function': {
    layer: 'business',
    defaultSublayer: 'processes_functions',
    shapeType: 'rect-with-icon',
  },
  'business-interaction': {
    layer: 'business',
    defaultSublayer: 'processes_functions',
    shapeType: 'pill',
  },
  'business-event': {
    layer: 'business',
    defaultSublayer: 'processes_functions',
    shapeType: 'event',
  },
  'business-service': {
    layer: 'business',
    defaultSublayer: 'services',
    shapeType: 'pill',
  },
  'business-object': {
    layer: 'business',
    defaultSublayer: 'objects',
    shapeType: 'folded-corner',
  },
  contract: {
    layer: 'business',
    defaultSublayer: 'controls',
    shapeType: 'folded-corner',
  },
  representation: {
    layer: 'business',
    defaultSublayer: 'objects',
    shapeType: 'folded-corner',
  },
  product: {
    layer: 'business',
    defaultSublayer: 'services',
    shapeType: 'rect',
  },

  // ── Application ─────────────────────────────────
  'application-component': {
    layer: 'application',
    defaultSublayer: 'components',
    shapeType: 'rect-with-icon',
  },
  'application-collaboration': {
    layer: 'application',
    defaultSublayer: 'components',
    shapeType: 'rect',
  },
  'application-interface': {
    layer: 'application',
    defaultSublayer: 'services_interfaces',
    shapeType: 'rect-with-icon',
  },
  'application-function': {
    layer: 'application',
    defaultSublayer: 'functions_processes',
    shapeType: 'pill',
  },
  'application-process': {
    layer: 'application',
    defaultSublayer: 'functions_processes',
    shapeType: 'pill',
  },
  'application-interaction': {
    layer: 'application',
    defaultSublayer: 'functions_processes',
    shapeType: 'pill',
  },
  'application-event': {
    layer: 'application',
    defaultSublayer: 'functions_processes',
    shapeType: 'event',
  },
  'application-service': {
    layer: 'application',
    defaultSublayer: 'services_interfaces',
    shapeType: 'pill',
  },
  'data-object': {
    layer: 'data',
    defaultSublayer: 'objects',
    shapeType: 'folded-corner',
  },

  // ── Technology ──────────────────────────────────
  node: {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'box-3d',
  },
  device: {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'box-3d',
  },
  'system-software': {
    layer: 'technology',
    defaultSublayer: 'system_software',
    shapeType: 'rect',
  },
  'technology-collaboration': {
    layer: 'technology',
    defaultSublayer: 'system_software',
    shapeType: 'rect',
  },
  'technology-interface': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'rect-with-icon',
  },
  'technology-function': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'pill',
  },
  'technology-process': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'pill',
  },
  'technology-interaction': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'pill',
  },
  'technology-event': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'event',
  },
  'technology-service': {
    layer: 'technology',
    defaultSublayer: 'services',
    shapeType: 'pill',
  },
  artifact: {
    layer: 'data',
    defaultSublayer: 'artifacts',
    shapeType: 'rect-with-icon',
  },
  'communication-network': {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'rect',
  },
  path: {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'rect',
  },

  // ── Implementation & Migration ──────────────────
  'work-package': {
    layer: 'implementation',
    defaultSublayer: 'work_packages',
    shapeType: 'rounded-rect',
  },
  deliverable: {
    layer: 'implementation',
    defaultSublayer: 'work_packages',
    shapeType: 'folded-corner',
  },
  'implementation-event': {
    layer: 'implementation',
    defaultSublayer: 'work_packages',
    shapeType: 'event',
  },
  plateau: {
    layer: 'implementation',
    defaultSublayer: 'plateaus_gaps',
    shapeType: 'rect-with-icon',
  },
  gap: {
    layer: 'implementation',
    defaultSublayer: 'plateaus_gaps',
    shapeType: 'dashed-rect',
  },

  // ── Other / Composite ──────────────────────────
  grouping: {
    layer: 'implementation',
    defaultSublayer: 'work_packages',
    shapeType: 'dashed-rect',
  },
  location: {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'rect',
  },
  junction: {
    layer: 'technology',
    defaultSublayer: 'nodes_devices',
    shapeType: 'rect',
  },
};

/**
 * Look up archetype info for a given ArchiMate base type.
 */
export function getArchetypeInfo(type: ArchimateType): ArchetypeInfo | undefined {
  return archetypeMap[type];
}
