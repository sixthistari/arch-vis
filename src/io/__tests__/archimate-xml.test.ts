// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseArchimateXml, generateArchimateXml } from '../archimate-xml';

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       identifier="model-1">
  <name>Test Model</name>
  <elements>
    <element identifier="el-1" xsi:type="BusinessActor">
      <name>Procurement Team</name>
      <documentation>Handles purchasing</documentation>
    </element>
    <element identifier="el-2" xsi:type="ApplicationComponent">
      <name>ERP System</name>
    </element>
    <element identifier="el-3" xsi:type="Node">
      <name>App Server</name>
      <documentation>Production server</documentation>
    </element>
  </elements>
  <relationships>
    <relationship identifier="rel-1" xsi:type="ServingRelationship" source="el-2" target="el-1">
      <name>provides data</name>
      <documentation>Primary integration</documentation>
    </relationship>
    <relationship identifier="rel-2" xsi:type="CompositionRelationship" source="el-3" target="el-2">
    </relationship>
  </relationships>
</model>`;

describe('parseArchimateXml', () => {
  it('parses elements with correct fields', () => {
    const result = parseArchimateXml(VALID_XML);
    expect(result.elements).toHaveLength(3);

    const el1 = result.elements.find((e) => e.id === 'el-1');
    expect(el1).toBeDefined();
    expect(el1!.name).toBe('Procurement Team');
    expect(el1!.description).toBe('Handles purchasing');
  });

  it('maps PascalCase XML types to kebab-case internal types', () => {
    const result = parseArchimateXml(VALID_XML);
    const el1 = result.elements.find((e) => e.id === 'el-1')!;
    expect(el1.archimate_type).toBe('business-actor');

    const el2 = result.elements.find((e) => e.id === 'el-2')!;
    expect(el2.archimate_type).toBe('application-component');

    const el3 = result.elements.find((e) => e.id === 'el-3')!;
    expect(el3.archimate_type).toBe('node');
  });

  it('derives layer from internal type', () => {
    const result = parseArchimateXml(VALID_XML);
    expect(result.elements.find((e) => e.id === 'el-1')!.layer).toBe('business');
    expect(result.elements.find((e) => e.id === 'el-2')!.layer).toBe('application');
    expect(result.elements.find((e) => e.id === 'el-3')!.layer).toBe('technology');
  });

  it('parses relationships with correct fields', () => {
    const result = parseArchimateXml(VALID_XML);
    expect(result.relationships).toHaveLength(2);

    const rel1 = result.relationships.find((r) => r.id === 'rel-1')!;
    expect(rel1.archimate_type).toBe('serving');
    expect(rel1.source_id).toBe('el-2');
    expect(rel1.target_id).toBe('el-1');
    expect(rel1.label).toBe('provides data');
    expect(rel1.description).toBe('Primary integration');
  });

  it('returns null label/description when absent', () => {
    const result = parseArchimateXml(VALID_XML);
    const rel2 = result.relationships.find((r) => r.id === 'rel-2')!;
    expect(rel2.label).toBeNull();
    expect(rel2.description).toBeNull();
  });

  it('returns empty arrays for an empty model', () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       identifier="model-1">
  <name>Empty</name>
  <elements></elements>
  <relationships></relationships>
</model>`;
    const result = parseArchimateXml(emptyXml);
    expect(result.elements).toEqual([]);
    expect(result.relationships).toEqual([]);
  });

  it('skips elements with unknown types', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m1">
  <elements>
    <element identifier="e1" xsi:type="MadeUpType"><name>X</name></element>
    <element identifier="e2" xsi:type="Goal"><name>Y</name></element>
  </elements>
  <relationships></relationships>
</model>`;
    const result = parseArchimateXml(xml);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]!.archimate_type).toBe('goal');
    expect(result.elements[0]!.layer).toBe('motivation');
  });
});

describe('generateArchimateXml', () => {
  it('generates valid XML with model name', () => {
    const xml = generateArchimateXml([], [], 'My Model');
    expect(xml).toContain('<name>My Model</name>');
    expect(xml).toContain('<?xml version="1.0"');
  });

  it('escapes special XML characters', () => {
    const elements = [
      { id: 'e1', name: 'R&D <Team>', archimate_type: 'business-actor', description: 'Uses "quotes" & \'apostrophes\'' },
    ];
    const xml = generateArchimateXml(elements, []);
    expect(xml).toContain('R&amp;D &lt;Team&gt;');
    expect(xml).toContain('&quot;quotes&quot;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&apos;apostrophes&apos;');
  });

  it('maps internal kebab-case types back to PascalCase', () => {
    const elements = [
      { id: 'e1', name: 'Actor', archimate_type: 'business-actor' },
    ];
    const rels = [
      { id: 'r1', archimate_type: 'composition', source_id: 'e1', target_id: 'e1' },
    ];
    const xml = generateArchimateXml(elements, rels);
    expect(xml).toContain('xsi:type="BusinessActor"');
    expect(xml).toContain('xsi:type="CompositionRelationship"');
  });
});

describe('XML round-trip', () => {
  it('generate then parse preserves data', () => {
    const elements = [
      { id: 'e1', name: 'HR Department', archimate_type: 'business-actor', description: 'Human resources' },
      { id: 'e2', name: 'Payroll App', archimate_type: 'application-component', description: null },
    ];
    const relationships = [
      { id: 'r1', archimate_type: 'serving', source_id: 'e2', target_id: 'e1', label: 'payroll data', description: null },
    ];

    const xml = generateArchimateXml(elements, relationships, 'Round Trip');
    const parsed = parseArchimateXml(xml);

    expect(parsed.elements).toHaveLength(2);
    const pe1 = parsed.elements.find((e) => e.id === 'e1')!;
    expect(pe1.name).toBe('HR Department');
    expect(pe1.archimate_type).toBe('business-actor');
    expect(pe1.layer).toBe('business');
    expect(pe1.description).toBe('Human resources');

    const pe2 = parsed.elements.find((e) => e.id === 'e2')!;
    expect(pe2.name).toBe('Payroll App');
    expect(pe2.archimate_type).toBe('application-component');
    expect(pe2.description).toBeNull();

    expect(parsed.relationships).toHaveLength(1);
    const pr1 = parsed.relationships[0]!;
    expect(pr1.archimate_type).toBe('serving');
    expect(pr1.source_id).toBe('e2');
    expect(pr1.target_id).toBe('e1');
    expect(pr1.label).toBe('payroll data');
  });
});
