import { describe, it, expect } from 'vitest';
import {
  buildOrderMaps,
  computeGridLayout,
  FALLBACK_LAYER_ORDER,
  FALLBACK_SUBLAYER_ORDER,
} from '../layout-computation';
import type { Element, SublayerConfig } from '../../../model/types';

function makeElement(overrides: Partial<Element> & { id: string; archimate_type: string; layer: string }): Element {
  return {
    name: overrides.id,
    specialisation: null,
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
    created_at: null,
    updated_at: null,
    ...overrides,
  } as Element;
}

describe('buildOrderMaps', () => {
  it('returns fallback values when config is null', () => {
    const result = buildOrderMaps(null);
    expect(result.layerOrder).toBe(FALLBACK_LAYER_ORDER);
    expect(result.sublayerOrder).toBe(FALLBACK_SUBLAYER_ORDER);
    expect(result.layerLabels).toHaveProperty('motivation');
    expect(result.layerLabels).toHaveProperty('technology');
  });

  it('returns correct layer ordering from config', () => {
    const config: SublayerConfig = {
      layers: {
        motivation: {
          label: 'Motivation',
          color_key: 'motivation',
          sublayers: [
            { name: 'Goals', element_types: ['goal', 'outcome'] },
            { name: 'Drivers', element_types: ['driver', 'assessment'] },
          ],
        },
        business: {
          label: 'Business',
          color_key: 'business',
          sublayers: [
            { name: 'Actors', element_types: ['business-actor', 'business-role'] },
            { name: 'Processes', element_types: ['business-process', 'business-function'] },
          ],
        },
      },
    };

    const result = buildOrderMaps(config);

    // Layer ordering
    expect(result.layerOrder['motivation']).toBe(0);
    expect(result.layerOrder['business']).toBe(1);

    // Sublayer ordering (sublayer index * 10)
    expect(result.sublayerOrder['goal']).toBe(0);
    expect(result.sublayerOrder['outcome']).toBe(0);
    expect(result.sublayerOrder['driver']).toBe(10);
    expect(result.sublayerOrder['assessment']).toBe(10);
    expect(result.sublayerOrder['business-actor']).toBe(0);
    expect(result.sublayerOrder['business-process']).toBe(10);

    // Layer labels
    expect(result.layerLabels['motivation']).toBe('Motivation');
    expect(result.layerLabels['business']).toBe('Business');
  });

  it('maps base layer name for suffixed layer keys (e.g. business_upper)', () => {
    const config: SublayerConfig = {
      layers: {
        business_upper: {
          label: 'Business — Functions',
          color_key: 'business',
          sublayers: [
            { name: 'Processes', element_types: ['business-process'] },
          ],
        },
        business_lower: {
          label: 'Business — Services',
          color_key: 'business',
          sublayers: [
            { name: 'Services', element_types: ['business-service'] },
          ],
        },
      },
    };

    const result = buildOrderMaps(config);

    // business_upper and business_lower should have separate orders
    expect(result.layerOrder['business_upper']).toBe(0);
    expect(result.layerOrder['business_lower']).toBe(1);
    // base "business" maps to the first occurrence
    expect(result.layerOrder['business']).toBe(0);
    // base label strips suffix
    expect(result.layerLabels['business']).toBe('Business');
  });
});

describe('computeGridLayout', () => {
  it('places elements in correct rows by layer', () => {
    const elements = [
      makeElement({ id: 'e1', archimate_type: 'business-process', layer: 'business' }),
      makeElement({ id: 'e2', archimate_type: 'application-component', layer: 'application' }),
    ];

    const positions = computeGridLayout(elements, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER);

    expect(positions.size).toBe(2);
    const p1 = positions.get('e1')!;
    const p2 = positions.get('e2')!;
    // business layer comes before application → lower y
    expect(p1.y).toBeLessThan(p2.y);
  });

  it('wraps columns at MAX_COLS (8)', () => {
    // Create 10 elements in the same layer and sublayer
    const elements = Array.from({ length: 10 }, (_, i) =>
      makeElement({ id: `e${i}`, archimate_type: 'business-process', layer: 'business' }),
    );

    const positions = computeGridLayout(elements, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER);

    // First 8 should be on the same row, last 2 on the next
    const firstRowY = positions.get('e0')!.y;
    const ninthY = positions.get('e8')!.y;
    expect(ninthY).toBeGreaterThan(firstRowY);

    // All first-row elements should have the same y
    for (let i = 0; i < 8; i++) {
      expect(positions.get(`e${i}`)!.y).toBe(firstRowY);
    }
  });

  it('sorts elements within a layer by sublayer order', () => {
    const elements = [
      makeElement({ id: 'obj', archimate_type: 'business-object', layer: 'business' }),
      makeElement({ id: 'proc', archimate_type: 'business-process', layer: 'business' }),
      makeElement({ id: 'svc', archimate_type: 'business-service', layer: 'business' }),
    ];

    const positions = computeGridLayout(elements, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER);

    // business-service (sublayer 10) < business-process (sublayer 20) < business-object (sublayer 30)
    expect(positions.get('svc')!.y).toBeLessThan(positions.get('proc')!.y);
    expect(positions.get('proc')!.y).toBeLessThan(positions.get('obj')!.y);
  });

  it('returns empty map for empty elements array', () => {
    const positions = computeGridLayout([], FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER);
    expect(positions.size).toBe(0);
  });

  it('assigns x positions based on column index within sublayer', () => {
    const elements = [
      makeElement({ id: 'a', archimate_type: 'business-process', layer: 'business' }),
      makeElement({ id: 'b', archimate_type: 'business-process', layer: 'business' }),
      makeElement({ id: 'c', archimate_type: 'business-process', layer: 'business' }),
    ];

    const positions = computeGridLayout(elements, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER);

    const xa = positions.get('a')!.x;
    const xb = positions.get('b')!.x;
    const xc = positions.get('c')!.x;
    // Each subsequent column should be further right
    expect(xb).toBeGreaterThan(xa);
    expect(xc).toBeGreaterThan(xb);
    // Column spacing is COL_WIDTH (210)
    expect(xb - xa).toBe(210);
    expect(xc - xb).toBe(210);
  });
});
