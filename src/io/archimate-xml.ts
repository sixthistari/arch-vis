/**
 * ArchiMate XML import/export — bidirectional XML ↔ model conversion.
 * Follows the ArchiMate Model Exchange File Format.
 */

// ═══════════════════════════════════════
// Element type mapping (PascalCase XML ↔ kebab-case internal)
// ═══════════════════════════════════════

const TYPE_MAP: Record<string, string> = {
  // Business
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
  // Application
  'ApplicationComponent': 'application-component',
  'ApplicationCollaboration': 'application-collaboration',
  'ApplicationInterface': 'application-interface',
  'ApplicationFunction': 'application-function',
  'ApplicationProcess': 'application-process',
  'ApplicationInteraction': 'application-interaction',
  'ApplicationEvent': 'application-event',
  'ApplicationService': 'application-service',
  'DataObject': 'data-object',
  // Technology
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
  // Strategy
  'Resource': 'resource',
  'Capability': 'capability',
  'ValueStream': 'value-stream',
  'CourseOfAction': 'course-of-action',
  // Motivation
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
  // Implementation & Migration
  'WorkPackage': 'work-package',
  'Deliverable': 'deliverable',
  'ImplementationEvent': 'implementation-event',
  'Plateau': 'plateau',
  'Gap': 'gap',
  // Other
  'Grouping': 'grouping',
  'Location': 'location',
  'Junction': 'junction',
};

const REVERSE_TYPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([k, v]) => [v, k]),
);

// ═══════════════════════════════════════
// Relationship type mapping
// ═══════════════════════════════════════

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

const REVERSE_REL_MAP: Record<string, string> = Object.fromEntries(
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

export interface ParsedElement {
  id: string;
  name: string;
  archimate_type: string;
  layer: string;
  description: string | null;
}

export interface ParsedRelationship {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

export interface ParsedModel {
  elements: ParsedElement[];
  relationships: ParsedRelationship[];
}

// ═══════════════════════════════════════
// Import: parse ArchiMate exchange XML
// ═══════════════════════════════════════

function getChildText(parent: Element, tagName: string): string | null {
  // Try with and without namespace
  const byLocal = Array.from(parent.children).find((c) => c.localName === tagName);
  if (byLocal?.textContent) return byLocal.textContent.trim();
  const byTag = parent.getElementsByTagName(tagName)[0];
  return byTag?.textContent?.trim() ?? null;
}

export function parseArchimateXml(xmlString: string): ParsedModel {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error(`XML parse error: ${parseError[0]?.textContent ?? 'unknown'}`);
  }

  const elements: ParsedElement[] = [];
  const relationships: ParsedRelationship[] = [];

  // Find all <element> nodes (namespace-agnostic)
  const elementNodes = doc.getElementsByTagName('element');
  for (let i = 0; i < elementNodes.length; i++) {
    const el = elementNodes.item(i);
    if (!el) continue;
    const identifier = el.getAttribute('identifier') ?? el.getAttribute('id') ?? '';
    const xsiType =
      el.getAttribute('xsi:type') ??
      el.getAttribute('type') ??
      el.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type') ??
      '';

    const internalType = TYPE_MAP[xsiType];
    if (!internalType) continue; // Skip unknown types

    const name = getChildText(el, 'name') ?? getChildText(el, 'label') ?? 'Unnamed';
    const description = getChildText(el, 'documentation') ?? getChildText(el, 'description') ?? null;

    elements.push({
      id: identifier,
      name,
      archimate_type: internalType,
      layer: typeToLayer(internalType),
      description,
    });
  }

  // Find all <relationship> nodes
  const relNodes = doc.getElementsByTagName('relationship');
  for (let i = 0; i < relNodes.length; i++) {
    const rel = relNodes.item(i);
    if (!rel) continue;
    const identifier = rel.getAttribute('identifier') ?? rel.getAttribute('id') ?? '';
    const xsiType =
      rel.getAttribute('xsi:type') ??
      rel.getAttribute('type') ??
      rel.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'type') ??
      '';

    const internalType = REL_TYPE_MAP[xsiType];
    if (!internalType) continue;

    const sourceId = rel.getAttribute('source') ?? '';
    const targetId = rel.getAttribute('target') ?? '';
    const label = getChildText(rel, 'name') ?? getChildText(rel, 'label') ?? null;
    const description = getChildText(rel, 'documentation') ?? getChildText(rel, 'description') ?? null;

    relationships.push({
      id: identifier,
      archimate_type: internalType,
      source_id: sourceId,
      target_id: targetId,
      label,
      description,
    });
  }

  return { elements, relationships };
}

// ═══════════════════════════════════════
// Export: generate ArchiMate exchange XML
// ═══════════════════════════════════════

interface ExportElement {
  id: string;
  name: string;
  archimate_type: string;
  description?: string | null;
}

interface ExportRelationship {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label?: string | null;
  description?: string | null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateArchimateXml(
  elements: ExportElement[],
  relationships: ExportRelationship[],
  modelName = 'arch-vis Export',
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    '<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd"' +
      ` identifier="model-1">`,
  );
  lines.push(`  <name>${escapeXml(modelName)}</name>`);

  // Elements
  lines.push('  <elements>');
  for (const el of elements) {
    const xmlType = REVERSE_TYPE_MAP[el.archimate_type] ?? el.archimate_type;
    lines.push(`    <element identifier="${escapeXml(el.id)}" xsi:type="${escapeXml(xmlType)}">`);
    lines.push(`      <name>${escapeXml(el.name)}</name>`);
    if (el.description) {
      lines.push(`      <documentation>${escapeXml(el.description)}</documentation>`);
    }
    lines.push('    </element>');
  }
  lines.push('  </elements>');

  // Relationships
  lines.push('  <relationships>');
  for (const rel of relationships) {
    const xmlType = REVERSE_REL_MAP[rel.archimate_type] ?? rel.archimate_type;
    lines.push(
      `    <relationship identifier="${escapeXml(rel.id)}" xsi:type="${escapeXml(xmlType)}"` +
        ` source="${escapeXml(rel.source_id)}" target="${escapeXml(rel.target_id)}">`,
    );
    if (rel.label) {
      lines.push(`      <name>${escapeXml(rel.label)}</name>`);
    }
    if (rel.description) {
      lines.push(`      <documentation>${escapeXml(rel.description)}</documentation>`);
    }
    lines.push('    </relationship>');
  }
  lines.push('  </relationships>');

  lines.push('</model>');
  return lines.join('\n');
}
