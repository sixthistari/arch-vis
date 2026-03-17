import { describe, it, expect } from 'vitest';
import { getUnifiedEdgeStyle } from '../../shared/edge-styles';

describe('getUnifiedEdgeStyle', () => {
  // ── ArchiMate relationship types ──────────────────────────────────────
  describe('ArchiMate relationship types', () => {
    const archimateTypes = [
      'composition', 'aggregation', 'assignment', 'realisation',
      'serving', 'access', 'influence', 'triggering', 'flow',
      'specialisation', 'association',
    ];

    it.each(archimateTypes)('%s has a defined style', (type) => {
      const style = getUnifiedEdgeStyle(type);
      expect(style).toBeDefined();
      expect(style.strokeStyle).toMatch(/^(solid|dashed)$/);
      expect(style.width).toBeGreaterThan(0);
    });

    it('composition has filled-diamond sourceMarker', () => {
      const s = getUnifiedEdgeStyle('composition');
      expect(s.sourceMarker).toBe('filled-diamond');
      expect(s.targetMarker).toBeNull();
      expect(s.strokeStyle).toBe('solid');
    });

    it('aggregation has open-diamond sourceMarker', () => {
      const s = getUnifiedEdgeStyle('aggregation');
      expect(s.sourceMarker).toBe('open-diamond');
    });

    it('realisation is dashed with open-triangle target', () => {
      const s = getUnifiedEdgeStyle('realisation');
      expect(s.strokeStyle).toBe('dashed');
      expect(s.dashArray).toBe('6 3');
      expect(s.targetMarker).toBe('open-triangle');
    });

    it('assignment has filled-circle source and filled-arrow target', () => {
      const s = getUnifiedEdgeStyle('assignment');
      expect(s.sourceMarker).toBe('filled-circle');
      expect(s.targetMarker).toBe('filled-arrow');
    });

    it('triggering has filled-arrow target', () => {
      const s = getUnifiedEdgeStyle('triggering');
      expect(s.targetMarker).toBe('filled-arrow');
      expect(s.strokeStyle).toBe('solid');
    });

    it('association has no markers', () => {
      const s = getUnifiedEdgeStyle('association');
      expect(s.sourceMarker).toBeNull();
      expect(s.targetMarker).toBeNull();
      expect(s.strokeStyle).toBe('solid');
    });
  });

  // ── UML relationship types ────────────────────────────────────────────
  describe('UML relationship types', () => {
    const umlClassTypes = [
      'uml-inheritance', 'uml-realisation', 'uml-composition',
      'uml-aggregation', 'uml-association', 'uml-dependency', 'uml-assembly',
    ];

    it.each(umlClassTypes)('%s has a defined style', (type) => {
      const style = getUnifiedEdgeStyle(type);
      expect(style).toBeDefined();
      expect(style.width).toBeGreaterThan(0);
    });

    it('uml-inheritance has uml-hollow-triangle target', () => {
      const s = getUnifiedEdgeStyle('uml-inheritance');
      expect(s.targetMarker).toBe('uml-hollow-triangle');
      expect(s.strokeStyle).toBe('solid');
    });

    it('uml-composition has uml-filled-diamond source', () => {
      const s = getUnifiedEdgeStyle('uml-composition');
      expect(s.sourceMarker).toBe('uml-filled-diamond');
    });

    it('uml-dependency is dashed', () => {
      const s = getUnifiedEdgeStyle('uml-dependency');
      expect(s.strokeStyle).toBe('dashed');
    });

    // UML sequence message types
    const sequenceTypes = [
      'sync-message', 'async-message', 'return-message',
      'create-message', 'destroy-message', 'self-message',
    ];

    it.each(sequenceTypes)('%s has isMessage=true', (type) => {
      const style = getUnifiedEdgeStyle(type);
      expect(style.isMessage).toBe(true);
    });

    it('sync-message has filledArrow=true', () => {
      expect(getUnifiedEdgeStyle('sync-message').filledArrow).toBe(true);
    });

    it('async-message has filledArrow=false', () => {
      expect(getUnifiedEdgeStyle('async-message').filledArrow).toBe(false);
    });

    it('self-message has isSelfMessage=true', () => {
      expect(getUnifiedEdgeStyle('self-message').isSelfMessage).toBe(true);
    });

    // UML activity types
    it.each(['uml-control-flow', 'uml-object-flow'])('%s has a defined style', (type) => {
      const style = getUnifiedEdgeStyle(type);
      expect(style).toBeDefined();
      expect(style.targetMarker).toBe('uml-open-arrow');
    });

    it('uml-object-flow is dashed', () => {
      expect(getUnifiedEdgeStyle('uml-object-flow').strokeStyle).toBe('dashed');
    });
  });

  // ── Wireframe relationship types ──────────────────────────────────────
  describe('Wireframe relationship types', () => {
    const wireframeTypes = ['wf-navigates-to', 'wf-binds-to', 'wf-contains'];

    it.each(wireframeTypes)('%s has a defined style', (type) => {
      const style = getUnifiedEdgeStyle(type);
      expect(style).toBeDefined();
      expect(style.width).toBeGreaterThan(0);
    });

    it('wf-navigates-to is dashed with filled-arrow target', () => {
      const s = getUnifiedEdgeStyle('wf-navigates-to');
      expect(s.strokeStyle).toBe('dashed');
      expect(s.targetMarker).toBe('filled-arrow');
    });

    it('wf-contains has no markers', () => {
      const s = getUnifiedEdgeStyle('wf-contains');
      expect(s.sourceMarker).toBeNull();
      expect(s.targetMarker).toBeNull();
    });
  });

  // ── Fallback ──────────────────────────────────────────────────────────
  describe('unknown type fallback', () => {
    it('returns association style for unknown type', () => {
      const s = getUnifiedEdgeStyle('totally-unknown');
      expect(s.strokeStyle).toBe('solid');
      expect(s.sourceMarker).toBeNull();
      expect(s.targetMarker).toBeNull();
      expect(s.width).toBe(1.0);
    });
  });
});
