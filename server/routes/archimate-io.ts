import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

// ═══════════════════════════════════════
// Type maps (duplicated from src/io for server-side use — server runs Node, not browser)
// ═══════════════════════════════════════

const TYPE_MAP: Record<string, string> = {
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

const REVERSE_TYPE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_MAP).map(([k, v]) => [v, k]),
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

const REVERSE_REL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(REL_TYPE_MAP).map(([k, v]) => [v, k]),
);

function typeToLayer(internalType: string): string {
  if (internalType.startsWith('business-') || ['contract', 'representation', 'product'].includes(internalType)) return 'business';
  if (internalType.startsWith('application-') || internalType === 'data-object') return 'application';
  if (internalType.startsWith('technology-') || ['node', 'device', 'system-software', 'artifact', 'communication-network', 'path'].includes(internalType)) return 'technology';
  if (['resource', 'capability', 'value-stream', 'course-of-action'].includes(internalType)) return 'strategy';
  if (['stakeholder', 'driver', 'assessment', 'goal', 'outcome', 'principle', 'requirement', 'constraint', 'meaning', 'value'].includes(internalType)) return 'motivation';
  if (['work-package', 'deliverable', 'implementation-event', 'plateau', 'gap'].includes(internalType)) return 'implementation';
  return 'application';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ═══════════════════════════════════════
// Server-side XML parsing with DOMParser from linkedom
// ═══════════════════════════════════════

interface ParsedXmlElement {
  id: string;
  name: string;
  archimate_type: string;
  layer: string;
  description: string | null;
}

interface ParsedXmlRelationship {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

/** Simple XML text extraction using regex (avoids needing a DOM parser on server) */
function extractXmlElements(xmlString: string): ParsedXmlElement[] {
  const elements: ParsedXmlElement[] = [];
  // Match <element ...>...</element> or self-closing <element ... />
  const elementRegex = /<element\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/element>)/gi;
  let match;

  while ((match = elementRegex.exec(xmlString)) !== null) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';

    const identifier = extractAttr(attrs, 'identifier') ?? extractAttr(attrs, 'id') ?? '';
    const xsiType = extractAttr(attrs, 'xsi:type') ?? extractAttr(attrs, 'type') ?? '';

    const internalType = TYPE_MAP[xsiType];
    if (!internalType) continue;

    const name = extractChildText(body, 'name') ?? extractChildText(body, 'label') ?? 'Unnamed';
    const description = extractChildText(body, 'documentation') ?? extractChildText(body, 'description');

    elements.push({
      id: identifier,
      name,
      archimate_type: internalType,
      layer: typeToLayer(internalType),
      description: description ?? null,
    });
  }

  return elements;
}

function extractXmlRelationships(xmlString: string): ParsedXmlRelationship[] {
  const relationships: ParsedXmlRelationship[] = [];
  const relRegex = /<relationship\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/relationship>)/gi;
  let match;

  while ((match = relRegex.exec(xmlString)) !== null) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';

    const identifier = extractAttr(attrs, 'identifier') ?? extractAttr(attrs, 'id') ?? '';
    const xsiType = extractAttr(attrs, 'xsi:type') ?? extractAttr(attrs, 'type') ?? '';

    const internalType = REL_TYPE_MAP[xsiType];
    if (!internalType) continue;

    const sourceId = extractAttr(attrs, 'source') ?? '';
    const targetId = extractAttr(attrs, 'target') ?? '';
    const label = extractChildText(body, 'name') ?? extractChildText(body, 'label');
    const description = extractChildText(body, 'documentation') ?? extractChildText(body, 'description');

    relationships.push({
      id: identifier,
      archimate_type: internalType,
      source_id: sourceId,
      target_id: targetId,
      label: label ?? null,
      description: description ?? null,
    });
  }

  return relationships;
}

function extractAttr(attrString: string, name: string): string | null {
  // Handle both xsi:type="..." and type="..."
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*=\\s*"([^"]*)"`, 'i');
  const m = regex.exec(attrString);
  return m?.[1] ?? null;
}

function extractChildText(body: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const m = regex.exec(body);
  return m?.[1]?.trim() ?? null;
}

// ═══════════════════════════════════════
// Routes
// ═══════════════════════════════════════

interface ElementRow {
  id: string;
  name: string;
  archimate_type: string;
  description: string | null;
}

interface RelationshipRow {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

const router = Router();

// POST /api/import/archimate-xml — accepts XML string in request body
router.post('/import/archimate-xml', (req: Request, res: Response) => {
  try {
    // Accept raw XML as text body or JSON with { xml: "..." }
    let xmlString: string;
    if (typeof req.body === 'string') {
      xmlString = req.body;
    } else if (req.body && typeof req.body.xml === 'string') {
      xmlString = req.body.xml as string;
    } else {
      res.status(400).json({ error: 'Request body must contain XML string or { xml: "..." }', code: 'VALIDATION_ERROR' });
      return;
    }

    const elements = extractXmlElements(xmlString);
    const relationships = extractXmlRelationships(xmlString);

    const result = db.transaction(() => {
      const insertElement = db.prepare(`
        INSERT OR REPLACE INTO elements (id, name, archimate_type, layer, description, created_by, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      let elementsCreated = 0;
      for (const el of elements) {
        const id = el.id || `el-${crypto.randomUUID()}`;
        insertElement.run(id, el.name, el.archimate_type, el.layer, el.description, 'archimate-xml-import', 'archimate-xml');
        elementsCreated++;
      }

      const insertRelationship = db.prepare(`
        INSERT OR REPLACE INTO relationships (id, archimate_type, source_id, target_id, label, description, created_by, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let relationshipsCreated = 0;
      for (const rel of relationships) {
        const id = rel.id || `rel-${crypto.randomUUID()}`;
        insertRelationship.run(id, rel.archimate_type, rel.source_id, rel.target_id, rel.label, rel.description, 'archimate-xml-import', 'archimate-xml');
        relationshipsCreated++;
      }

      return { elementsCreated, relationshipsCreated };
    })();

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message, code: 'VALIDATION_ERROR' });
  }
});

// GET /api/export/archimate-xml — generate ArchiMate exchange format XML
router.get('/export/archimate-xml', (_req: Request, res: Response) => {
  try {
    const elements = db.prepare('SELECT id, name, archimate_type, description FROM elements ORDER BY name ASC').all() as ElementRow[];
    const relationships = db.prepare('SELECT id, archimate_type, source_id, target_id, label, description FROM relationships').all() as RelationshipRow[];

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/"' +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd"' +
      ' identifier="model-1">',
    );
    lines.push('  <name>arch-vis Export</name>');

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

    const xml = lines.join('\n');
    res.type('application/xml').send(xml);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
