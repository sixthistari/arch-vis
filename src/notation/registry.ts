import type { ShapeType, IconType } from './shapes/index';

export interface ShapeDefinition {
  shapeType: ShapeType;
  defaultWidth: number;
  defaultHeight: number;
  iconType?: IconType;
}

const SHAPE_REGISTRY: Record<string, ShapeDefinition> = {
  // Motivation
  'stakeholder': { shapeType: 'rect-with-icon', defaultWidth: 80, defaultHeight: 24, iconType: 'person' },
  'driver': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'assessment': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'goal': { shapeType: 'rounded-rect', defaultWidth: 85, defaultHeight: 24 },
  'outcome': { shapeType: 'rounded-rect', defaultWidth: 85, defaultHeight: 24 },
  'principle': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'requirement': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'constraint': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'meaning': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'value': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },

  // Strategy
  'resource': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'capability': { shapeType: 'rounded-rect', defaultWidth: 90, defaultHeight: 24 },
  'value-stream': { shapeType: 'pill', defaultWidth: 110, defaultHeight: 26 },
  'course-of-action': { shapeType: 'rounded-rect', defaultWidth: 90, defaultHeight: 24 },

  // Business
  'business-actor': { shapeType: 'rect-with-icon', defaultWidth: 70, defaultHeight: 22, iconType: 'person' },
  'business-role': { shapeType: 'rect', defaultWidth: 70, defaultHeight: 22 },
  'business-collaboration': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'business-interface': { shapeType: 'rect-with-icon', defaultWidth: 80, defaultHeight: 18, iconType: 'lollipop' },
  'business-process': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'business-function': { shapeType: 'rect-with-icon', defaultWidth: 95, defaultHeight: 26, iconType: 'header-bar' },
  'business-interaction': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'business-event': { shapeType: 'event', defaultWidth: 75, defaultHeight: 20 },
  'business-service': { shapeType: 'pill', defaultWidth: 90, defaultHeight: 20 },
  'business-object': { shapeType: 'folded-corner', defaultWidth: 80, defaultHeight: 20 },
  'contract': { shapeType: 'folded-corner', defaultWidth: 80, defaultHeight: 20 },
  'representation': { shapeType: 'folded-corner', defaultWidth: 80, defaultHeight: 20 },
  'product': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },

  // Application
  'application-component': { shapeType: 'rect-with-icon', defaultWidth: 85, defaultHeight: 24, iconType: 'component' },
  'application-collaboration': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'application-interface': { shapeType: 'rect-with-icon', defaultWidth: 80, defaultHeight: 18, iconType: 'lollipop' },
  'application-function': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'application-process': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'application-interaction': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'application-event': { shapeType: 'event', defaultWidth: 75, defaultHeight: 20 },
  'application-service': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 18 },
  'data-object': { shapeType: 'folded-corner', defaultWidth: 80, defaultHeight: 20 },

  // Technology
  'node': { shapeType: 'box-3d', defaultWidth: 80, defaultHeight: 22 },
  'device': { shapeType: 'box-3d', defaultWidth: 80, defaultHeight: 22 },
  'system-software': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'technology-collaboration': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'technology-interface': { shapeType: 'rect-with-icon', defaultWidth: 80, defaultHeight: 18, iconType: 'lollipop' },
  'technology-function': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'technology-process': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'technology-interaction': { shapeType: 'pill', defaultWidth: 80, defaultHeight: 22 },
  'technology-event': { shapeType: 'event', defaultWidth: 75, defaultHeight: 20 },
  'technology-service': { shapeType: 'pill', defaultWidth: 85, defaultHeight: 18 },
  'artifact': { shapeType: 'rect-with-icon', defaultWidth: 80, defaultHeight: 18, iconType: 'artifact' },
  'communication-network': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'path': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },

  // Implementation & Migration
  'work-package': { shapeType: 'rounded-rect', defaultWidth: 85, defaultHeight: 22 },
  'deliverable': { shapeType: 'folded-corner', defaultWidth: 80, defaultHeight: 20 },
  'implementation-event': { shapeType: 'event', defaultWidth: 75, defaultHeight: 20 },
  'plateau': { shapeType: 'rect-with-icon', defaultWidth: 90, defaultHeight: 22, iconType: 'stepped' },
  'gap': { shapeType: 'dashed-rect', defaultWidth: 80, defaultHeight: 22 },

  // Other/Composite
  'grouping': { shapeType: 'dashed-rect', defaultWidth: 120, defaultHeight: 80 },
  'location': { shapeType: 'rect', defaultWidth: 80, defaultHeight: 22 },
  'junction': { shapeType: 'rect', defaultWidth: 10, defaultHeight: 10 },

  // UML Activity Partition (swimlane)
  'uml-swimlane': { shapeType: 'dashed-rect', defaultWidth: 200, defaultHeight: 400 },

  // Data Modelling
  'dm-entity': { shapeType: 'rect', defaultWidth: 160, defaultHeight: 60 },
  'dm-table': { shapeType: 'rect', defaultWidth: 160, defaultHeight: 60 },
  'dm-column': { shapeType: 'rect', defaultWidth: 100, defaultHeight: 20 },
  'dm-attribute': { shapeType: 'rect', defaultWidth: 100, defaultHeight: 20 },
  'dm-primary-key': { shapeType: 'rect', defaultWidth: 100, defaultHeight: 20 },
  'dm-foreign-key': { shapeType: 'rect', defaultWidth: 100, defaultHeight: 20 },
  'dm-index': { shapeType: 'rect', defaultWidth: 100, defaultHeight: 20 },

  // Annotation (notation-agnostic)
  'annotation': { shapeType: 'folded-corner', defaultWidth: 75, defaultHeight: 50 },
};

const FALLBACK_SHAPE: ShapeDefinition = {
  shapeType: 'rect',
  defaultWidth: 80,
  defaultHeight: 22,
};

export function getShapeDefinition(archimateType: string): ShapeDefinition {
  return SHAPE_REGISTRY[archimateType] ?? FALLBACK_SHAPE;
}

export function getAllRegisteredTypes(): string[] {
  return Object.keys(SHAPE_REGISTRY);
}
