import { describe, it, expect } from 'vitest';
import {
  archimateTypeValues,
  relationshipTypeValues,
  archimateLayerValues,
  ElementSchema,
  RelationshipSchema,
} from '../types';

describe('archimateTypeValues', () => {
  it('contains core ArchiMate types', () => {
    const expected = [
      'stakeholder', 'driver', 'goal', 'business-process',
      'application-component', 'node', 'device', 'artifact',
      'junction', 'grouping', 'location',
    ];
    for (const type of expected) {
      expect(archimateTypeValues).toContain(type);
    }
  });

  it('contains UML types', () => {
    const expected = [
      'uml-class', 'uml-interface', 'uml-component',
      'uml-lifeline', 'uml-activation', 'uml-fragment',
      'uml-activity', 'uml-action', 'uml-state',
    ];
    for (const type of expected) {
      expect(archimateTypeValues).toContain(type);
    }
  });

  it('contains wireframe types', () => {
    const expected = [
      'wf-page', 'wf-section', 'wf-button', 'wf-input',
      'wf-table', 'wf-form', 'wf-feedback',
    ];
    for (const type of expected) {
      expect(archimateTypeValues).toContain(type);
    }
  });

  it('has a substantial number of types (80+)', () => {
    expect(archimateTypeValues.length).toBeGreaterThanOrEqual(80);
  });
});

describe('relationshipTypeValues', () => {
  it('contains all ArchiMate relationship types', () => {
    const expected = [
      'composition', 'aggregation', 'assignment', 'realisation',
      'serving', 'access', 'influence', 'triggering', 'flow',
      'specialisation', 'association',
    ];
    for (const type of expected) {
      expect(relationshipTypeValues).toContain(type);
    }
  });

  it('contains UML relationship types', () => {
    const expected = [
      'uml-inheritance', 'uml-realisation', 'uml-composition',
      'uml-aggregation', 'uml-association', 'uml-dependency',
      'uml-sync-message', 'uml-self-message',
      'uml-control-flow', 'uml-object-flow',
    ];
    for (const type of expected) {
      expect(relationshipTypeValues).toContain(type);
    }
  });

  it('contains wireframe relationship types', () => {
    const expected = ['wf-contains', 'wf-navigates-to', 'wf-binds-to'];
    for (const type of expected) {
      expect(relationshipTypeValues).toContain(type);
    }
  });
});

describe('ElementSchema', () => {
  const validElement = {
    id: 'el-001',
    name: 'Test Process',
    archimate_type: 'business-process',
    specialisation: null,
    layer: 'business',
    sublayer: null,
    domain_id: null,
    status: 'active',
    description: 'A test element',
    properties: null,
    confidence: 0.9,
    source_session_id: null,
    parent_id: null,
    created_by: null,
    source: null,
    created_at: null,
    updated_at: null,
  };

  it('validates a correct element', () => {
    const result = ElementSchema.safeParse(validElement);
    expect(result.success).toBe(true);
  });

  it('validates element with all nullable fields set to null', () => {
    const result = ElementSchema.safeParse(validElement);
    expect(result.success).toBe(true);
  });

  it('validates element with properties object', () => {
    const result = ElementSchema.safeParse({
      ...validElement,
      properties: { custom: 'value', nested: { a: 1 } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid archimate_type', () => {
    const result = ElementSchema.safeParse({
      ...validElement,
      archimate_type: 'not-a-real-type',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid layer', () => {
    const result = ElementSchema.safeParse({
      ...validElement,
      layer: 'not-a-real-layer',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = ElementSchema.safeParse({
      ...validElement,
      status: 'invalid-status',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { id, ...withoutId } = validElement;
    expect(ElementSchema.safeParse(withoutId).success).toBe(false);

    const { name, ...withoutName } = validElement;
    expect(ElementSchema.safeParse(withoutName).success).toBe(false);
  });

  it('rejects confidence outside 0-1 range', () => {
    expect(ElementSchema.safeParse({ ...validElement, confidence: 1.5 }).success).toBe(false);
    expect(ElementSchema.safeParse({ ...validElement, confidence: -0.1 }).success).toBe(false);
  });

  it('accepts all valid layer values', () => {
    for (const layer of archimateLayerValues) {
      const result = ElementSchema.safeParse({ ...validElement, layer });
      expect(result.success).toBe(true);
    }
  });
});

describe('RelationshipSchema', () => {
  const validRelationship = {
    id: 'rel-001',
    archimate_type: 'serving',
    specialisation: null,
    source_id: 'el-001',
    target_id: 'el-002',
    label: null,
    description: null,
    properties: null,
    confidence: null,
    created_by: null,
    source: null,
    created_at: null,
    updated_at: null,
  };

  it('validates a correct relationship', () => {
    expect(RelationshipSchema.safeParse(validRelationship).success).toBe(true);
  });

  it('rejects invalid relationship type', () => {
    expect(
      RelationshipSchema.safeParse({ ...validRelationship, archimate_type: 'bogus' }).success
    ).toBe(false);
  });

  it('rejects missing source_id', () => {
    const { source_id, ...without } = validRelationship;
    expect(RelationshipSchema.safeParse(without).success).toBe(false);
  });
});
