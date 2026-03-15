/**
 * Notation routing — maps element/relationship types to their xyflow node/edge types.
 */

import type { ArchimateType } from './types.js';

function assertNever(x: never): never {
  throw new Error('Unexpected archimate type: ' + x);
}

/** Determine which notation family an archimate_type belongs to. */
export function getNotation(archimateType: string): 'archimate' | 'uml' | 'wireframe' | 'data' | 'process-flow' | 'any' {
  if (archimateType === 'annotation') return 'any';
  if (archimateType.startsWith('pf-')) return 'process-flow';
  if (archimateType.startsWith('dm-')) return 'data';
  if (archimateType.startsWith('uml-')) return 'uml';
  if (archimateType.startsWith('wf-')) return 'wireframe';
  return 'archimate';
}

/**
 * Map archimate_type to the xyflow node type string.
 * Must match keys registered in src/renderers/xyflow/nodes/index.ts nodeTypes.
 */
export function getNodeType(archimateType: ArchimateType): string {
  switch (archimateType) {
    // Annotation (notation-agnostic)
    case 'annotation': return 'annotation';

    // UML sequence diagram types
    case 'uml-lifeline': return 'sequence-lifeline';
    case 'uml-activation': return 'sequence-activation';
    case 'uml-fragment': return 'sequence-fragment';

    // UML class family — all use the uml-class node component
    case 'uml-class':
    case 'uml-abstract-class':
    case 'uml-interface':
    case 'uml-enum':
      return 'uml-class';

    case 'uml-component': return 'uml-component';

    case 'uml-state':
      return 'uml-state';

    case 'uml-swimlane': return 'uml-swimlane';

    case 'uml-activity':
    case 'uml-action':
    case 'uml-decision':
    case 'uml-merge':
    case 'uml-fork':
    case 'uml-join':
    case 'uml-initial-node':
    case 'uml-final-node':
    case 'uml-flow-final':
      return 'uml-activity';

    case 'uml-actor':
    case 'uml-use-case':
      return 'uml-use-case';

    case 'uml-package': return 'uml-package';

    // These don't have dedicated nodes yet — fall back to uml-component
    case 'uml-note':
      return 'uml-component';

    // Wireframe types
    case 'wf-page': return 'wf-page';
    case 'wf-section':
    case 'wf-card':
    case 'wf-modal':
    case 'wf-header':
      return 'wf-section';
    case 'wf-nav':
    case 'wf-tab-group':
      return 'wf-nav';
    case 'wf-table': return 'wf-table';
    case 'wf-form': return 'wf-form';
    case 'wf-list': return 'wf-list';
    case 'wf-button':
    case 'wf-input':
    case 'wf-textarea':
    case 'wf-select':
    case 'wf-checkbox':
    case 'wf-radio':
    case 'wf-image':
    case 'wf-icon':
    case 'wf-text':
    case 'wf-link':
    case 'wf-placeholder':
      return 'wf-control';

    case 'wf-feedback': return 'wf-feedback';

    // Data modelling types — entity/table use the compartment node
    case 'dm-entity':
    case 'dm-table':
      return 'dm-entity';
    case 'dm-column':
    case 'dm-attribute':
    case 'dm-primary-key':
    case 'dm-foreign-key':
    case 'dm-index':
      return 'dm-entity';

    // Process flow types
    case 'pf-human-task':
    case 'pf-agent-task':
    case 'pf-system-call':
      return 'pf-task';
    case 'pf-start':
    case 'pf-end':
    case 'pf-timer':
      return 'pf-pseudo';
    case 'pf-decision':
    case 'pf-gateway':
      return 'pf-decision';
    case 'pf-approval-gate':
      return 'pf-gate';
    case 'pf-swimlane':
      return 'pf-swimlane';
    case 'pf-subprocess':
      return 'pf-subprocess';

    // Process flow types
    case 'pf-human-task':
    case 'pf-agent-task':
    case 'pf-system-call':
      return 'pf-task';
    case 'pf-start':
    case 'pf-end':
    case 'pf-timer':
      return 'pf-pseudo';
    case 'pf-decision':
    case 'pf-gateway':
      return 'pf-decision';
    case 'pf-approval-gate':
      return 'pf-gate';
    case 'pf-swimlane':
      return 'pf-swimlane';
    case 'pf-subprocess':
      return 'pf-subprocess';

    // ArchiMate core types
    case 'stakeholder':
    case 'driver':
    case 'assessment':
    case 'goal':
    case 'outcome':
    case 'principle':
    case 'requirement':
    case 'constraint':
    case 'meaning':
    case 'value':
    case 'resource':
    case 'capability':
    case 'value-stream':
    case 'course-of-action':
    case 'business-actor':
    case 'business-role':
    case 'business-collaboration':
    case 'business-interface':
    case 'business-process':
    case 'business-function':
    case 'business-interaction':
    case 'business-event':
    case 'business-service':
    case 'business-object':
    case 'contract':
    case 'representation':
    case 'product':
    case 'application-component':
    case 'application-collaboration':
    case 'application-interface':
    case 'application-function':
    case 'application-process':
    case 'application-interaction':
    case 'application-event':
    case 'application-service':
    case 'data-object':
    case 'node':
    case 'device':
    case 'system-software':
    case 'technology-collaboration':
    case 'technology-interface':
    case 'technology-function':
    case 'technology-process':
    case 'technology-interaction':
    case 'technology-event':
    case 'technology-service':
    case 'artifact':
    case 'communication-network':
    case 'path':
    case 'work-package':
    case 'deliverable':
    case 'implementation-event':
    case 'plateau':
    case 'gap':
      return 'archimate';
    case 'grouping':
      return 'group';
    case 'location':
    case 'junction':
      return 'archimate';

    default:
      return assertNever(archimateType);
  }
}

/** Determine which notation family a viewpoint type targets. */
export function getViewNotation(viewpointType: string): 'archimate' | 'uml' | 'wireframe' | 'data' | 'process-flow' | 'any' {
  switch (viewpointType) {
    case 'layered':
    case 'knowledge_cognition':
    case 'domain_slice':
    case 'governance_matrix':
    case 'infrastructure':
    case 'information':
    case 'application_landscape':
      return 'archimate';
    case 'uml_class':
    case 'uml_component':
    case 'uml_activity':
    case 'uml_usecase':
    case 'uml_sequence':
      return 'uml';
    case 'wireframe':
      return 'wireframe';
    case 'data_conceptual':
    case 'data_logical':
    case 'data_physical':
      return 'data';
    case 'process_detail':
    case 'process_flow':
      return 'process-flow';
    case 'custom':
    default:
      return 'any';
  }
}

/** Map relationship type to the xyflow edge type string. */
export function getEdgeType(relationshipType: string): string {
  // UML sequence message types → dedicated sequence-message edge
  if ([
    'uml-sync-message', 'uml-async-message', 'uml-return-message',
    'uml-create-message', 'uml-destroy-message', 'uml-self-message',
  ].includes(relationshipType)) {
    return 'sequence-message';
  }
  if (relationshipType.startsWith('pf-')) return 'pf-edge';
  if (relationshipType.startsWith('uml-')) return 'uml-edge';
  if (relationshipType.startsWith('wf-')) return 'wireframe';
  if (relationshipType.startsWith('dm-')) return 'data-edge';
  return 'archimate';
}
