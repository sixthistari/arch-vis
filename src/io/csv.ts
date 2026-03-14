/**
 * CSV import/export — Archi-compatible 3-file format.
 *
 * Files:
 *   elements.csv:   ID, Type, Name, Documentation, Specialization
 *   relations.csv:  ID, Type, Name, Documentation, Source, Target
 *   properties.csv: ID, Key, Value
 */

// ═══════════════════════════════════════
// CSV parsing utilities (no external lib)
// ═══════════════════════════════════════

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvRows(csv: string): string[][] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCsvLine);
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ═══════════════════════════════════════
// Type mapping (Archi CSV uses PascalCase types)
// ═══════════════════════════════════════

const ELEMENT_TYPE_MAP: Record<string, string> = {
  'BusinessActor': 'business-actor',
  'BusinessRole': 'business-role',
  'BusinessCollaboration': 'business-collaboration',
  'BusinessInterface': 'business-interface',
  'BusinessProcess': 'business-process',
  'BusinessFunction': 'business-function',
  'BusinessInteraction': 'business-interaction',
  'BusinessEvent': 'business-event',
  'BusinessService': 'business-service',
  'BusinessObject': 'business-object',
  'Contract': 'contract',
  'Representation': 'representation',
  'Product': 'product',
  'ApplicationComponent': 'application-component',
  'ApplicationCollaboration': 'application-collaboration',
  'ApplicationInterface': 'application-interface',
  'ApplicationFunction': 'application-function',
  'ApplicationProcess': 'application-process',
  'ApplicationInteraction': 'application-interaction',
  'ApplicationEvent': 'application-event',
  'ApplicationService': 'application-service',
  'DataObject': 'data-object',
  'Node': 'node',
  'Device': 'device',
  'SystemSoftware': 'system-software',
  'TechnologyCollaboration': 'technology-collaboration',
  'TechnologyInterface': 'technology-interface',
  'TechnologyFunction': 'technology-function',
  'TechnologyProcess': 'technology-process',
  'TechnologyInteraction': 'technology-interaction',
  'TechnologyEvent': 'technology-event',
  'TechnologyService': 'technology-service',
  'Artifact': 'artifact',
  'CommunicationNetwork': 'communication-network',
  'Path': 'path',
  'Resource': 'resource',
  'Capability': 'capability',
  'ValueStream': 'value-stream',
  'CourseOfAction': 'course-of-action',
  'Stakeholder': 'stakeholder',
  'Driver': 'driver',
  'Assessment': 'assessment',
  'Goal': 'goal',
  'Outcome': 'outcome',
  'Principle': 'principle',
  'Requirement': 'requirement',
  'Constraint': 'constraint',
  'Meaning': 'meaning',
  'Value': 'value',
  'WorkPackage': 'work-package',
  'Deliverable': 'deliverable',
  'ImplementationEvent': 'implementation-event',
  'Plateau': 'plateau',
  'Gap': 'gap',
  'Grouping': 'grouping',
  'Location': 'location',
  'Junction': 'junction',
};

const REVERSE_ELEMENT_TYPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ELEMENT_TYPE_MAP).map(([k, v]) => [v, k]),
);

const REL_TYPE_MAP: Record<string, string> = {
  'CompositionRelationship': 'composition',
  'AggregationRelationship': 'aggregation',
  'AssignmentRelationship': 'assignment',
  'RealizationRelationship': 'realisation',
  'ServingRelationship': 'serving',
  'AccessRelationship': 'access',
  'InfluenceRelationship': 'influence',
  'TriggeringRelationship': 'triggering',
  'FlowRelationship': 'flow',
  'SpecializationRelationship': 'specialisation',
  'AssociationRelationship': 'association',
};

const REVERSE_REL_TYPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(REL_TYPE_MAP).map(([k, v]) => [v, k]),
);

// ═══════════════════════════════════════
// Layer derivation
// ═══════════════════════════════════════

function typeToLayer(internalType: string): string {
  if (
    internalType.startsWith('business-') ||
    ['contract', 'representation', 'product'].includes(internalType)
  )
    return 'business';
  if (internalType.startsWith('application-') || internalType === 'data-object')
    return 'application';
  if (
    internalType.startsWith('technology-') ||
    ['node', 'device', 'system-software', 'artifact', 'communication-network', 'path'].includes(
      internalType,
    )
  )
    return 'technology';
  if (['resource', 'capability', 'value-stream', 'course-of-action'].includes(internalType))
    return 'strategy';
  if (
    ['stakeholder', 'driver', 'assessment', 'goal', 'outcome', 'principle', 'requirement', 'constraint', 'meaning', 'value'].includes(
      internalType,
    )
  )
    return 'motivation';
  if (
    ['work-package', 'deliverable', 'implementation-event', 'plateau', 'gap'].includes(
      internalType,
    )
  )
    return 'implementation';
  return 'application';
}

// ═══════════════════════════════════════
// Parsed types
// ═══════════════════════════════════════

export interface CsvElement {
  id: string;
  name: string;
  archimate_type: string;
  layer: string;
  description: string | null;
  specialisation: string | null;
}

export interface CsvRelationship {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

export interface CsvProperty {
  id: string;
  key: string;
  value: string;
}

// ═══════════════════════════════════════
// Import: parse CSV files
// ═══════════════════════════════════════

export function parseElementsCsv(csvString: string): CsvElement[] {
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) return [];

  // First row is header: "ID","Type","Name","Documentation","Specialization"
  const header = rows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
  const idIdx = header.indexOf('id');
  const typeIdx = header.indexOf('type');
  const nameIdx = header.indexOf('name');
  const docIdx = header.indexOf('documentation');
  const specIdx = header.indexOf('specialization');

  const elements: CsvElement[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const rawType = typeIdx >= 0 ? (row[typeIdx] ?? '') : '';
    const internalType = ELEMENT_TYPE_MAP[rawType] ?? rawType;

    elements.push({
      id: idIdx >= 0 ? (row[idIdx] ?? '') : '',
      name: nameIdx >= 0 ? (row[nameIdx] ?? 'Unnamed') : 'Unnamed',
      archimate_type: internalType,
      layer: typeToLayer(internalType),
      description: docIdx >= 0 && row[docIdx] ? row[docIdx]! : null,
      specialisation: specIdx >= 0 && row[specIdx] ? row[specIdx]! : null,
    });
  }

  return elements;
}

export function parseRelationsCsv(csvString: string): CsvRelationship[] {
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) return [];

  const header = rows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
  const idIdx = header.indexOf('id');
  const typeIdx = header.indexOf('type');
  const nameIdx = header.indexOf('name');
  const docIdx = header.indexOf('documentation');
  const sourceIdx = header.indexOf('source');
  const targetIdx = header.indexOf('target');

  const relationships: CsvRelationship[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const rawType = typeIdx >= 0 ? (row[typeIdx] ?? '') : '';
    const internalType = REL_TYPE_MAP[rawType] ?? rawType;

    relationships.push({
      id: idIdx >= 0 ? (row[idIdx] ?? '') : '',
      archimate_type: internalType,
      source_id: sourceIdx >= 0 ? (row[sourceIdx] ?? '') : '',
      target_id: targetIdx >= 0 ? (row[targetIdx] ?? '') : '',
      label: nameIdx >= 0 && row[nameIdx] ? row[nameIdx]! : null,
      description: docIdx >= 0 && row[docIdx] ? row[docIdx]! : null,
    });
  }

  return relationships;
}

export function parsePropertiesCsv(csvString: string): CsvProperty[] {
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) return [];

  const header = rows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
  const idIdx = header.indexOf('id');
  const keyIdx = header.indexOf('key');
  const valueIdx = header.indexOf('value');

  const properties: CsvProperty[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    properties.push({
      id: idIdx >= 0 ? (row[idIdx] ?? '') : '',
      key: keyIdx >= 0 ? (row[keyIdx] ?? '') : '',
      value: valueIdx >= 0 ? (row[valueIdx] ?? '') : '',
    });
  }

  return properties;
}

// ═══════════════════════════════════════
// Export: generate CSV strings
// ═══════════════════════════════════════

interface ElementForExport {
  id: string;
  name: string;
  archimate_type: string;
  description?: string | null;
  specialisation?: string | null;
  properties?: Record<string, unknown> | string | null;
}

interface RelationshipForExport {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label?: string | null;
  description?: string | null;
}

export function generateElementsCsv(elements: ElementForExport[]): string {
  const lines: string[] = ['"ID","Type","Name","Documentation","Specialization"'];
  for (const el of elements) {
    const csvType = REVERSE_ELEMENT_TYPE_MAP[el.archimate_type] ?? el.archimate_type;
    lines.push(
      [
        csvEscape(el.id),
        csvEscape(csvType),
        csvEscape(el.name),
        csvEscape(el.description ?? ''),
        csvEscape(el.specialisation ?? ''),
      ].join(','),
    );
  }
  return lines.join('\n');
}

export function generateRelationsCsv(relationships: RelationshipForExport[]): string {
  const lines: string[] = ['"ID","Type","Name","Documentation","Source","Target"'];
  for (const rel of relationships) {
    const csvType = REVERSE_REL_TYPE_MAP[rel.archimate_type] ?? rel.archimate_type;
    lines.push(
      [
        csvEscape(rel.id),
        csvEscape(csvType),
        csvEscape(rel.label ?? ''),
        csvEscape(rel.description ?? ''),
        csvEscape(rel.source_id),
        csvEscape(rel.target_id),
      ].join(','),
    );
  }
  return lines.join('\n');
}

export function generatePropertiesCsv(elements: ElementForExport[]): string {
  const lines: string[] = ['"ID","Key","Value"'];
  for (const el of elements) {
    if (!el.properties) continue;
    const props =
      typeof el.properties === 'string'
        ? (JSON.parse(el.properties) as Record<string, unknown>)
        : el.properties;
    for (const [key, value] of Object.entries(props)) {
      lines.push(
        [csvEscape(el.id), csvEscape(key), csvEscape(String(value ?? ''))].join(','),
      );
    }
  }
  return lines.join('\n');
}
