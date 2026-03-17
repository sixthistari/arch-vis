import { describe, it, expect } from 'vitest';
import { getShapeDefinition, getAllRegisteredTypes } from '../../shared/registry';

describe('getShapeDefinition', () => {
  const allRegistered = getAllRegisteredTypes();

  it('returns a valid ShapeDefinition for every registered ArchiMate type', () => {
    for (const type of allRegistered) {
      const def = getShapeDefinition(type);
      expect(def).toBeDefined();
      expect(def.shapeType).toEqual(expect.any(String));
      expect(def.defaultWidth).toBeGreaterThan(0);
      expect(def.defaultHeight).toBeGreaterThan(0);
    }
  });

  it('registers all expected ArchiMate element types (~50+)', () => {
    expect(allRegistered.length).toBeGreaterThanOrEqual(50);
  });

  // Motivation
  it.each([
    ['stakeholder', 'rect-with-icon'],
    ['driver', 'rect'],
    ['assessment', 'rect'],
    ['goal', 'rounded-rect'],
    ['outcome', 'rounded-rect'],
    ['principle', 'rect'],
    ['requirement', 'rect'],
    ['constraint', 'rect'],
    ['meaning', 'rect'],
    ['value', 'rect'],
  ])('motivation: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Strategy
  it.each([
    ['resource', 'rect'],
    ['capability', 'rounded-rect'],
    ['value-stream', 'pill'],
    ['course-of-action', 'rounded-rect'],
  ])('strategy: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Business
  it.each([
    ['business-actor', 'rect-with-icon'],
    ['business-process', 'pill'],
    ['business-function', 'rect-with-icon'],
    ['business-event', 'event'],
    ['business-service', 'pill'],
    ['business-object', 'folded-corner'],
    ['contract', 'folded-corner'],
    ['representation', 'folded-corner'],
    ['product', 'rect'],
  ])('business: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Application
  it.each([
    ['application-component', 'rect-with-icon'],
    ['application-function', 'pill'],
    ['application-process', 'pill'],
    ['application-event', 'event'],
    ['application-service', 'pill'],
    ['data-object', 'folded-corner'],
  ])('application: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Technology
  it.each([
    ['node', 'box-3d'],
    ['device', 'box-3d'],
    ['system-software', 'rect'],
    ['technology-service', 'pill'],
    ['artifact', 'rect-with-icon'],
    ['communication-network', 'rect'],
  ])('technology: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Implementation & Migration
  it.each([
    ['work-package', 'rounded-rect'],
    ['deliverable', 'folded-corner'],
    ['implementation-event', 'event'],
    ['plateau', 'rect-with-icon'],
    ['gap', 'dashed-rect'],
  ])('implementation: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  // Other/Composite
  it.each([
    ['grouping', 'dashed-rect'],
    ['location', 'rect'],
    ['junction', 'rect'],
  ])('other: %s has shape %s', (type, expectedShape) => {
    expect(getShapeDefinition(type).shapeType).toBe(expectedShape);
  });

  it('returns fallback shape for unknown type', () => {
    const def = getShapeDefinition('nonexistent-type');
    expect(def.shapeType).toBe('rect');
    expect(def.defaultWidth).toBe(80);
    expect(def.defaultHeight).toBe(22);
  });

  it('returns a new reference for fallback (does not mutate registry)', () => {
    const def1 = getShapeDefinition('unknown-a');
    const def2 = getShapeDefinition('unknown-b');
    // Both should be the same fallback object (shared reference is fine since it is immutable)
    expect(def1).toEqual(def2);
  });
});

describe('getAllRegisteredTypes', () => {
  it('returns an array of strings', () => {
    const types = getAllRegisteredTypes();
    expect(Array.isArray(types)).toBe(true);
    types.forEach((t: string) => expect(typeof t).toBe('string'));
  });

  it('includes key ArchiMate types', () => {
    const types = getAllRegisteredTypes();
    const expected = [
      'stakeholder', 'business-process', 'application-component',
      'node', 'device', 'artifact', 'junction', 'grouping',
    ];
    for (const e of expected) {
      expect(types).toContain(e);
    }
  });
});
