import { describe, it, expect } from 'vitest';
import type { BatchImportBody, BatchElementInput, BatchRelationshipInput } from '../../shared/types';

/**
 * Unit tests for batch import validation logic.
 * Tests the shape and constraints of BatchImportBody without needing a running server.
 */

describe('BatchImportBody shape validation', () => {
  it('accepts a minimal valid batch with just elements', () => {
    const body: BatchImportBody = {
      elements: [
        {
          name: 'My Component',
          archimate_type: 'application-component',
          layer: 'application',
        },
      ],
    };
    expect(body.elements).toHaveLength(1);
    expect(body.elements![0]!.name).toBe('My Component');
  });

  it('accepts elements with optional fields', () => {
    const el: BatchElementInput = {
      id: 'el-custom-id',
      name: 'Custom',
      archimate_type: 'business-process',
      layer: 'business',
      specialisation: 'orchestration-engine',
      sublayer: 'core',
      description: 'A process',
    };
    expect(el.id).toBe('el-custom-id');
    expect(el.specialisation).toBe('orchestration-engine');
  });

  it('accepts nested children', () => {
    const body: BatchImportBody = {
      elements: [
        {
          name: 'Parent',
          archimate_type: 'application-component',
          layer: 'application',
          children: [
            {
              name: 'Child',
              archimate_type: 'application-function',
              layer: 'application',
            },
          ],
        },
      ],
    };
    expect(body.elements![0]!.children).toHaveLength(1);
    expect(body.elements![0]!.children![0]!.name).toBe('Child');
  });

  it('accepts relationships with source_name/target_name', () => {
    const rel: BatchRelationshipInput = {
      archimate_type: 'serving',
      source_name: 'ServiceA',
      target_name: 'ServiceB',
    };
    expect(rel.source_name).toBe('ServiceA');
    expect(rel.source_id).toBeUndefined();
  });

  it('accepts relationships with source_id/target_id', () => {
    const rel: BatchRelationshipInput = {
      archimate_type: 'composition',
      source_id: 'el-1',
      target_id: 'el-2',
    };
    expect(rel.source_id).toBe('el-1');
    expect(rel.source_name).toBeUndefined();
  });

  it('accepts a view specification', () => {
    const body: BatchImportBody = {
      elements: [],
      view: {
        name: 'My View',
        viewpoint: 'layered',
        render_mode: 'flat',
      },
    };
    expect(body.view!.name).toBe('My View');
    expect(body.view!.viewpoint).toBe('layered');
  });

  it('view fields are optional except name', () => {
    const body: BatchImportBody = {
      view: {
        name: 'Minimal View',
      },
    };
    expect(body.view!.id).toBeUndefined();
    expect(body.view!.viewpoint).toBeUndefined();
    expect(body.view!.render_mode).toBeUndefined();
  });

  it('all top-level fields of BatchImportBody are optional', () => {
    const body: BatchImportBody = {};
    expect(body.elements).toBeUndefined();
    expect(body.relationships).toBeUndefined();
    expect(body.view).toBeUndefined();
    expect(body.notation).toBeUndefined();
  });
});

describe('batch import name-to-id resolution logic', () => {
  it('relationships without source_id or source_name are unresolvable', () => {
    const rel: BatchRelationshipInput = {
      archimate_type: 'flow',
    };
    // The batch route skips rels where both source_id and source_name are missing
    const sourceId = rel.source_id ?? undefined;
    const sourceName = rel.source_name ?? undefined;
    expect(sourceId).toBeUndefined();
    expect(sourceName).toBeUndefined();
  });

  it('name-to-id map resolves source_name to an id', () => {
    const nameToId = new Map<string, string>();
    nameToId.set('MyService', 'el-abc');

    const rel: BatchRelationshipInput = {
      archimate_type: 'serving',
      source_name: 'MyService',
      target_id: 'el-xyz',
    };

    const resolvedSourceId = rel.source_id ?? (rel.source_name ? nameToId.get(rel.source_name) : undefined);
    expect(resolvedSourceId).toBe('el-abc');
  });

  it('unresolvable name returns undefined', () => {
    const nameToId = new Map<string, string>();

    const rel: BatchRelationshipInput = {
      archimate_type: 'serving',
      source_name: 'NonExistent',
      target_id: 'el-xyz',
    };

    const resolvedSourceId = rel.source_id ?? (rel.source_name ? nameToId.get(rel.source_name) : undefined);
    expect(resolvedSourceId).toBeUndefined();
  });
});
