import { describe, it, expect } from 'vitest';
import {
  ElementSchema,
  RelationshipSchema,
  ArchimateTypeSchema,
  RelationshipTypeSchema,
  ArchimateLayerSchema,
  ElementStatusSchema,
} from '@/model/types';

describe('ElementSchema', () => {
  const validElement = {
    id: 'el-1',
    name: 'Test Element',
    archimate_type: 'application-component',
    specialisation: null,
    layer: 'application',
    sublayer: null,
    domain_id: null,
    status: 'active',
    description: null,
    properties: null,
    confidence: null,
    source_session_id: null,
    parent_id: null,
    created_by: null,
    source: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('accepts a valid element', () => {
    const result = ElementSchema.safeParse(validElement);
    expect(result.success).toBe(true);
  });

  it('accepts all nullable fields as null', () => {
    const result = ElementSchema.safeParse(validElement);
    expect(result.success).toBe(true);
  });

  it('accepts valid confidence between 0 and 1', () => {
    const result = ElementSchema.safeParse({ ...validElement, confidence: 0.85 });
    expect(result.success).toBe(true);
  });

  it('rejects confidence > 1', () => {
    const result = ElementSchema.safeParse({ ...validElement, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects confidence < 0', () => {
    const result = ElementSchema.safeParse({ ...validElement, confidence: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid archimate_type', () => {
    const result = ElementSchema.safeParse({ ...validElement, archimate_type: 'not-a-type' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid layer', () => {
    const result = ElementSchema.safeParse({ ...validElement, layer: 'invalid-layer' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status', () => {
    const result = ElementSchema.safeParse({ ...validElement, status: 'unknown-status' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required field: name', () => {
    const { name: _, ...noName } = validElement;
    const result = ElementSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field: id', () => {
    const { id: _, ...noId } = validElement;
    const result = ElementSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field: archimate_type', () => {
    const { archimate_type: _, ...noType } = validElement;
    const result = ElementSchema.safeParse(noType);
    expect(result.success).toBe(false);
  });

  it('accepts properties as a record', () => {
    const result = ElementSchema.safeParse({ ...validElement, properties: { foo: 'bar' } });
    expect(result.success).toBe(true);
  });
});

describe('RelationshipSchema', () => {
  const validRel = {
    id: 'rel-1',
    archimate_type: 'composition',
    specialisation: null,
    source_id: 'el-1',
    target_id: 'el-2',
    label: null,
    description: null,
    properties: null,
    confidence: null,
    created_by: null,
    source: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
  };

  it('accepts a valid relationship', () => {
    const result = RelationshipSchema.safeParse(validRel);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid archimate_type', () => {
    const result = RelationshipSchema.safeParse({ ...validRel, archimate_type: 'bad-type' });
    expect(result.success).toBe(false);
  });

  it('rejects missing source_id', () => {
    const { source_id: _, ...noSource } = validRel;
    const result = RelationshipSchema.safeParse(noSource);
    expect(result.success).toBe(false);
  });
});

describe('ArchimateTypeSchema', () => {
  it('accepts known ArchiMate types', () => {
    expect(ArchimateTypeSchema.safeParse('business-process').success).toBe(true);
    expect(ArchimateTypeSchema.safeParse('application-component').success).toBe(true);
    expect(ArchimateTypeSchema.safeParse('node').success).toBe(true);
  });

  it('accepts UML types', () => {
    expect(ArchimateTypeSchema.safeParse('uml-class').success).toBe(true);
    expect(ArchimateTypeSchema.safeParse('uml-lifeline').success).toBe(true);
  });

  it('accepts wireframe types', () => {
    expect(ArchimateTypeSchema.safeParse('wf-page').success).toBe(true);
    expect(ArchimateTypeSchema.safeParse('wf-button').success).toBe(true);
  });

  it('rejects unknown type strings', () => {
    expect(ArchimateTypeSchema.safeParse('banana').success).toBe(false);
    expect(ArchimateTypeSchema.safeParse('').success).toBe(false);
  });
});

describe('RelationshipTypeSchema', () => {
  it('accepts known relationship types', () => {
    expect(RelationshipTypeSchema.safeParse('composition').success).toBe(true);
    expect(RelationshipTypeSchema.safeParse('flow').success).toBe(true);
    expect(RelationshipTypeSchema.safeParse('uml-inheritance').success).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(RelationshipTypeSchema.safeParse('extends').success).toBe(false);
  });
});

describe('ArchimateLayerSchema', () => {
  it('accepts valid layers', () => {
    expect(ArchimateLayerSchema.safeParse('business').success).toBe(true);
    expect(ArchimateLayerSchema.safeParse('technology').success).toBe(true);
    expect(ArchimateLayerSchema.safeParse('none').success).toBe(true);
  });

  it('rejects invalid layers', () => {
    expect(ArchimateLayerSchema.safeParse('presentation').success).toBe(false);
  });
});

describe('ElementStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(ElementStatusSchema.safeParse('active').success).toBe(true);
    expect(ElementStatusSchema.safeParse('deprecated').success).toBe(true);
    expect(ElementStatusSchema.safeParse('draft').success).toBe(true);
  });

  it('rejects invalid statuses', () => {
    expect(ElementStatusSchema.safeParse('deleted').success).toBe(false);
  });
});
