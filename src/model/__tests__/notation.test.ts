import { describe, it, expect } from 'vitest';
import { getNotation, getNodeType, getEdgeType } from '../notation';

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

  // UML fallback types
  it.each(['uml-note', 'uml-package'])('%s maps to uml-component (fallback)', (input) => {
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
    'work-package', 'junction', 'grouping', 'location',
  ])('archimate: %s maps to archimate', (input) => {
    expect(getNodeType(input as any)).toBe('archimate');
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

  // ArchiMate types
  it.each([
    'composition', 'aggregation', 'assignment', 'realisation',
    'serving', 'access', 'influence', 'triggering', 'flow',
    'specialisation', 'association',
  ])('%s maps to archimate', (input) => {
    expect(getEdgeType(input)).toBe('archimate');
  });
});
