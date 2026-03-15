import { describe, it, expect } from 'vitest';
import { getNotation, getNodeType, getEdgeType, getViewNotation } from '../notation';

describe('getNotation', () => {
  it('returns "uml" for uml- prefixed types', () => {
    expect(getNotation('uml-class')).toBe('uml');
    expect(getNotation('uml-lifeline')).toBe('uml');
    expect(getNotation('uml-component')).toBe('uml');
    expect(getNotation('uml-activity')).toBe('uml');
  });

  it('returns "wireframe" for wf- prefixed types', () => {
    expect(getNotation('wf-page')).toBe('wireframe');
    expect(getNotation('wf-button')).toBe('wireframe');
    expect(getNotation('wf-table')).toBe('wireframe');
    expect(getNotation('wf-feedback')).toBe('wireframe');
  });

  it('returns "archimate" for everything else', () => {
    expect(getNotation('business-process')).toBe('archimate');
    expect(getNotation('application-component')).toBe('archimate');
    expect(getNotation('node')).toBe('archimate');
    expect(getNotation('stakeholder')).toBe('archimate');
    expect(getNotation('junction')).toBe('archimate');
  });

  it('returns "process-flow" for pf- prefixed types', () => {
    expect(getNotation('pf-start')).toBe('process-flow');
    expect(getNotation('pf-human-task')).toBe('process-flow');
    expect(getNotation('pf-decision')).toBe('process-flow');
    expect(getNotation('pf-swimlane')).toBe('process-flow');
  });

  it('returns "any" for annotation', () => {
    expect(getNotation('annotation')).toBe('any');
  });
});

describe('getNodeType', () => {
  // UML sequence types
  it.each([
    ['uml-lifeline', 'sequence-lifeline'],
    ['uml-activation', 'sequence-activation'],
    ['uml-fragment', 'sequence-fragment'],
  ])('sequence: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  // UML class family
  it.each([
    ['uml-class', 'uml-class'],
    ['uml-abstract-class', 'uml-class'],
    ['uml-interface', 'uml-class'],
    ['uml-enum', 'uml-class'],
  ])('class family: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  it('maps uml-component to uml-component', () => {
    expect(getNodeType('uml-component')).toBe('uml-component');
  });

  it('maps uml-state to uml-state', () => {
    expect(getNodeType('uml-state')).toBe('uml-state');
  });

  // UML activity types
  it.each([
    'uml-activity', 'uml-action', 'uml-decision', 'uml-merge',
    'uml-fork', 'uml-join', 'uml-initial-node', 'uml-final-node', 'uml-flow-final',
  ])('activity: %s maps to uml-activity', (input) => {
    expect(getNodeType(input as any)).toBe('uml-activity');
  });

  // UML use case types
  it.each(['uml-actor', 'uml-use-case'])('use-case: %s maps to uml-use-case', (input) => {
    expect(getNodeType(input as any)).toBe('uml-use-case');
  });

  it('maps uml-package to uml-package', () => {
    expect(getNodeType('uml-package' as any)).toBe('uml-package');
  });

  // UML fallback types
  it.each(['uml-note'])('%s maps to uml-component (fallback)', (input) => {
    expect(getNodeType(input as any)).toBe('uml-component');
  });

  // Wireframe types
  it.each([
    ['wf-page', 'wf-page'],
    ['wf-section', 'wf-section'],
    ['wf-card', 'wf-section'],
    ['wf-modal', 'wf-section'],
    ['wf-header', 'wf-section'],
    ['wf-nav', 'wf-nav'],
    ['wf-tab-group', 'wf-nav'],
    ['wf-table', 'wf-table'],
    ['wf-form', 'wf-form'],
    ['wf-list', 'wf-list'],
    ['wf-feedback', 'wf-feedback'],
  ])('wireframe: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  // Wireframe control types
  it.each([
    'wf-button', 'wf-input', 'wf-textarea', 'wf-select',
    'wf-checkbox', 'wf-radio', 'wf-image', 'wf-icon',
    'wf-text', 'wf-link', 'wf-placeholder',
  ])('wireframe control: %s maps to wf-control', (input) => {
    expect(getNodeType(input as any)).toBe('wf-control');
  });

  // ArchiMate core types
  it.each([
    'stakeholder', 'driver', 'goal', 'business-process',
    'application-component', 'node', 'device', 'artifact',
    'work-package', 'junction', 'location',
  ])('archimate: %s maps to archimate', (input) => {
    expect(getNodeType(input as any)).toBe('archimate');
  });

  it('grouping maps to group', () => {
    expect(getNodeType('grouping' as any)).toBe('group');
  });

  it('annotation maps to annotation', () => {
    expect(getNodeType('annotation' as any)).toBe('annotation');
  });

  // Process flow types
  it.each([
    ['pf-human-task', 'pf-task'],
    ['pf-agent-task', 'pf-task'],
    ['pf-system-call', 'pf-task'],
  ])('process-flow task: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  it.each([
    ['pf-start', 'pf-pseudo'],
    ['pf-end', 'pf-pseudo'],
    ['pf-timer', 'pf-pseudo'],
  ])('process-flow pseudo: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  it.each([
    ['pf-decision', 'pf-decision'],
    ['pf-gateway', 'pf-decision'],
  ])('process-flow decision: %s maps to %s', (input, expected) => {
    expect(getNodeType(input as any)).toBe(expected);
  });

  it('pf-approval-gate maps to pf-gate', () => {
    expect(getNodeType('pf-approval-gate' as any)).toBe('pf-gate');
  });

  it('pf-swimlane maps to pf-swimlane', () => {
    expect(getNodeType('pf-swimlane' as any)).toBe('pf-swimlane');
  });

  it('pf-subprocess maps to pf-subprocess', () => {
    expect(getNodeType('pf-subprocess' as any)).toBe('pf-subprocess');
  });
});

describe('getEdgeType', () => {
  // UML sequence message types
  it.each([
    'uml-sync-message', 'uml-async-message', 'uml-return-message',
    'uml-create-message', 'uml-destroy-message', 'uml-self-message',
  ])('%s maps to sequence-message', (input) => {
    expect(getEdgeType(input)).toBe('sequence-message');
  });

  // Other UML types (non-message)
  it.each([
    'uml-inheritance', 'uml-realisation', 'uml-composition',
    'uml-aggregation', 'uml-association', 'uml-dependency',
    'uml-control-flow', 'uml-object-flow',
  ])('%s maps to uml-edge', (input) => {
    expect(getEdgeType(input)).toBe('uml-edge');
  });

  // Wireframe types
  it.each([
    'wf-contains', 'wf-navigates-to', 'wf-binds-to',
  ])('%s maps to wireframe', (input) => {
    expect(getEdgeType(input)).toBe('wireframe');
  });

  // Process flow types
  it.each([
    'pf-sequence-flow', 'pf-conditional-flow', 'pf-error-flow',
  ])('%s maps to pf-edge', (input) => {
    expect(getEdgeType(input)).toBe('pf-edge');
  });

  // ArchiMate types
  it.each([
    'composition', 'aggregation', 'assignment', 'realisation',
    'serving', 'access', 'influence', 'triggering', 'flow',
    'specialisation', 'association',
  ])('%s maps to archimate', (input) => {
    expect(getEdgeType(input)).toBe('archimate');
  });
});

describe('getViewNotation', () => {
  it.each([
    'layered',
    'knowledge_cognition',
    'domain_slice',
    'governance_matrix',
    'infrastructure',
    'information',
    'application_landscape',
  ])('archimate viewpoint: %s returns "archimate"', (viewpointType) => {
    expect(getViewNotation(viewpointType)).toBe('archimate');
  });

  it.each([
    'process_detail',
    'process_flow',
  ])('process-flow viewpoint: %s returns "process-flow"', (viewpointType) => {
    expect(getViewNotation(viewpointType)).toBe('process-flow');
  });

  it.each([
    'uml_class',
    'uml_component',
    'uml_activity',
    'uml_usecase',
    'uml_sequence',
  ])('uml viewpoint: %s returns "uml"', (viewpointType) => {
    expect(getViewNotation(viewpointType)).toBe('uml');
  });

  it('wireframe viewpoint returns "wireframe"', () => {
    expect(getViewNotation('wireframe')).toBe('wireframe');
  });

  it.each([
    'data_conceptual',
    'data_logical',
    'data_physical',
  ])('data viewpoint: %s returns "data"', (viewpointType) => {
    expect(getViewNotation(viewpointType)).toBe('data');
  });

  it('custom viewpoint returns "any"', () => {
    expect(getViewNotation('custom')).toBe('any');
  });

  it.each([
    'unknown_viewpoint',
    '',
    'something_random',
    'archimate',
  ])('unknown viewpoint: "%s" returns "any" (default)', (viewpointType) => {
    expect(getViewNotation(viewpointType)).toBe('any');
  });
});
