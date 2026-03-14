/**
 * Notation routing — maps element/relationship types to their xyflow node/edge types.
 */

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
export function getNodeType(archimateType: string): string {
  // UML sequence diagram types
  if (archimateType === 'uml-lifeline') return 'sequence-lifeline';
  if (archimateType === 'uml-activation') return 'sequence-activation';
  if (archimateType === 'uml-fragment') return 'sequence-fragment';

  // UML class family — all use the uml-class node component
  if (['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum'].includes(archimateType)) {
    return 'uml-class';
  }
  if (archimateType === 'uml-component') return 'uml-component';
  if (['uml-state', 'uml-activity'].includes(archimateType)) return 'uml-state';
  if (archimateType === 'uml-actor' || archimateType === 'uml-use-case' || archimateType === 'uml-note' || archimateType === 'uml-package') {
    // These don't have dedicated nodes yet — fall back to uml-component
    return 'uml-component';
  }

  // Wireframe types
  if (archimateType === 'wf-page') return 'wf-page';
  if (['wf-section', 'wf-card', 'wf-modal', 'wf-header'].includes(archimateType)) return 'wf-section';
  if (archimateType === 'wf-nav' || archimateType === 'wf-tab-group') return 'wf-nav';
  if (archimateType === 'wf-table') return 'wf-table';
  if (archimateType === 'wf-form') return 'wf-form';
  if (archimateType === 'wf-list') return 'wf-list';
  if (['wf-button', 'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio',
       'wf-image', 'wf-icon', 'wf-text', 'wf-link', 'wf-placeholder'].includes(archimateType)) {
    return 'wf-control';
  }

  // Default: ArchiMate
  return 'archimate';
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
  // Wireframe relationships use standard archimate edges for now
  return 'archimate';
}
