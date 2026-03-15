import { describe, it, expect } from 'vitest';
import {
  parseElementsCsv,
  parseRelationsCsv,
  parsePropertiesCsv,
  generateElementsCsv,
  generateRelationsCsv,
  generatePropertiesCsv,
} from '../csv';

describe('parseElementsCsv', () => {
  it('parses a standard elements CSV', () => {
    const csv = `"ID","Type","Name","Documentation","Specialization"
"e1","BusinessActor","Procurement Team","Handles purchasing",""
"e2","ApplicationComponent","ERP System","",""`;

    const result = parseElementsCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('e1');
    expect(result[0]!.name).toBe('Procurement Team');
    expect(result[0]!.archimate_type).toBe('business-actor');
    expect(result[0]!.layer).toBe('business');
    expect(result[0]!.description).toBe('Handles purchasing');
    expect(result[0]!.specialisation).toBeNull();

    expect(result[1]!.archimate_type).toBe('application-component');
    expect(result[1]!.layer).toBe('application');
  });

  it('maps PascalCase types to kebab-case', () => {
    const csv = `"ID","Type","Name","Documentation","Specialization"
"e1","SystemSoftware","Linux","",""
"e2","ValueStream","Onboarding","",""
"e3","WorkPackage","Sprint 1","",""`;

    const result = parseElementsCsv(csv);
    expect(result[0]!.archimate_type).toBe('system-software');
    expect(result[0]!.layer).toBe('technology');
    expect(result[1]!.archimate_type).toBe('value-stream');
    expect(result[1]!.layer).toBe('strategy');
    expect(result[2]!.archimate_type).toBe('work-package');
    expect(result[2]!.layer).toBe('implementation');
  });

  it('returns empty array for empty CSV', () => {
    expect(parseElementsCsv('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    const csv = `"ID","Type","Name","Documentation","Specialization"`;
    expect(parseElementsCsv(csv)).toEqual([]);
  });

  it('handles quoted fields containing commas', () => {
    const csv = `"ID","Type","Name","Documentation","Specialization"
"e1","BusinessActor","Smith, Jones & Partners","Procurement, logistics","ai-agent"`;

    const result = parseElementsCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Smith, Jones & Partners');
    expect(result[0]!.description).toBe('Procurement, logistics');
    expect(result[0]!.specialisation).toBe('ai-agent');
  });

  it('handles escaped double quotes within fields', () => {
    const csv = `"ID","Type","Name","Documentation","Specialization"
"e1","BusinessActor","The ""Big"" Team","Says ""hello""",""`;

    const result = parseElementsCsv(csv);
    expect(result[0]!.name).toBe('The "Big" Team');
    expect(result[0]!.description).toBe('Says "hello"');
  });
});

describe('parseRelationsCsv', () => {
  it('parses a standard relations CSV', () => {
    const csv = `"ID","Type","Name","Documentation","Source","Target"
"r1","ServingRelationship","provides data","Integration link","e2","e1"
"r2","CompositionRelationship","","","e3","e2"`;

    const result = parseRelationsCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]!.archimate_type).toBe('serving');
    expect(result[0]!.source_id).toBe('e2');
    expect(result[0]!.target_id).toBe('e1');
    expect(result[0]!.label).toBe('provides data');
    expect(result[0]!.description).toBe('Integration link');

    expect(result[1]!.archimate_type).toBe('composition');
    expect(result[1]!.label).toBeNull();
    expect(result[1]!.description).toBeNull();
  });

  it('returns empty array for empty CSV', () => {
    expect(parseRelationsCsv('')).toEqual([]);
  });
});

describe('parsePropertiesCsv', () => {
  it('parses properties CSV', () => {
    const csv = `"ID","Key","Value"
"e1","cost","50000"
"e1","owner","Finance"
"e2","tier","production"`;

    const result = parsePropertiesCsv(csv);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 'e1', key: 'cost', value: '50000' });
    expect(result[2]).toEqual({ id: 'e2', key: 'tier', value: 'production' });
  });
});

describe('generateElementsCsv', () => {
  it('generates Archi-compatible CSV with PascalCase types', () => {
    const elements = [
      { id: 'e1', name: 'Actor', archimate_type: 'business-actor', description: 'Desc', specialisation: null },
    ];
    const csv = generateElementsCsv(elements);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"ID","Type","Name","Documentation","Specialization"');
    expect(lines[1]).toContain('BusinessActor');
    expect(lines[1]).toContain('Actor');
  });

  it('escapes commas and quotes in output', () => {
    const elements = [
      { id: 'e1', name: 'Smith, Jones', archimate_type: 'business-actor', description: 'Says "hi"' },
    ];
    const csv = generateElementsCsv(elements);
    expect(csv).toContain('"Smith, Jones"');
    expect(csv).toContain('"Says ""hi"""');
  });
});

describe('generateRelationsCsv', () => {
  it('generates relations CSV with PascalCase types', () => {
    const rels = [
      { id: 'r1', archimate_type: 'serving', source_id: 'e2', target_id: 'e1', label: 'data flow', description: null },
    ];
    const csv = generateRelationsCsv(rels);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"ID","Type","Name","Documentation","Source","Target"');
    expect(lines[1]).toContain('ServingRelationship');
    expect(lines[1]).toContain('e2');
  });
});

describe('generatePropertiesCsv', () => {
  it('generates properties CSV from element properties', () => {
    const elements = [
      { id: 'e1', name: 'X', archimate_type: 'node', properties: { cost: '1000', region: 'AU' } },
      { id: 'e2', name: 'Y', archimate_type: 'device', properties: null },
    ];
    const csv = generatePropertiesCsv(elements);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"ID","Key","Value"');
    // Should have 2 property rows (e2 has null properties, skipped)
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('e1');
    expect(lines[1]).toContain('cost');
    expect(lines[1]).toContain('1000');
  });

  it('handles JSON string properties', () => {
    const elements = [
      { id: 'e1', name: 'X', archimate_type: 'node', properties: '{"vendor":"Cisco"}' },
    ];
    const csv = generatePropertiesCsv(elements);
    expect(csv).toContain('vendor');
    expect(csv).toContain('Cisco');
  });
});

describe('CSV round-trip', () => {
  it('elements survive generate then parse', () => {
    const original = [
      { id: 'e1', name: 'HR Team', archimate_type: 'business-actor', description: 'HR dept', specialisation: 'ai-agent' },
      { id: 'e2', name: 'Payroll', archimate_type: 'application-component', description: null, specialisation: null },
    ];
    const csv = generateElementsCsv(original);
    const parsed = parseElementsCsv(csv);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.id).toBe('e1');
    expect(parsed[0]!.name).toBe('HR Team');
    expect(parsed[0]!.archimate_type).toBe('business-actor');
    expect(parsed[0]!.layer).toBe('business');
    expect(parsed[0]!.description).toBe('HR dept');
    expect(parsed[0]!.specialisation).toBe('ai-agent');

    expect(parsed[1]!.archimate_type).toBe('application-component');
    expect(parsed[1]!.description).toBeNull();
    expect(parsed[1]!.specialisation).toBeNull();
  });

  it('relations survive generate then parse', () => {
    const original = [
      { id: 'r1', archimate_type: 'flow', source_id: 'e1', target_id: 'e2', label: 'data', description: 'Main flow' },
    ];
    const csv = generateRelationsCsv(original);
    const parsed = parseRelationsCsv(csv);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.archimate_type).toBe('flow');
    expect(parsed[0]!.source_id).toBe('e1');
    expect(parsed[0]!.target_id).toBe('e2');
    expect(parsed[0]!.label).toBe('data');
    expect(parsed[0]!.description).toBe('Main flow');
  });
});
