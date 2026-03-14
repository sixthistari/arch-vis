/**
 * Notation routing — maps element/relationship types to their xyflow node/edge types.
 */

import type { ArchimateType } from './types.js';

function assertNever(x: never): never {
  throw new Error('Unexpected archimate type: ' + x);
}

/** Determine which notation family an archimate_type belongs to. */
export function getNotation(archimateType: string): 'archimate' | 'uml' | 'wireframe' {
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
    case 'uml-activity':
      return 'uml-state';

    case 'uml-actor':
    case 'uml-use-case':
      return 'uml-use-case';

    // These don't have dedicated nodes yet — fall back to uml-component
    case 'uml-note':
    case 'uml-package':
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
    case 'grouping':
    case 'location':
    case 'junction':
      return 'archimate';

    default:
      return assertNever(archimateType);
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
  if (relationshipType.startsWith('uml-')) return 'uml-edge';
  if (relationshipType.startsWith('wf-')) return 'wireframe';
  return 'archimate';
}
