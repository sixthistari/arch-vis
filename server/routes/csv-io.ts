import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

// ═══════════════════════════════════════
// CSV parsing utilities
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
// Type mappings
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

function typeToLayer(internalType: string): string {
  if (internalType.startsWith('business-') || ['contract', 'representation', 'product'].includes(internalType)) return 'business';
  if (internalType.startsWith('application-') || internalType === 'data-object') return 'application';
  if (internalType.startsWith('technology-') || ['node', 'device', 'system-software', 'artifact', 'communication-network', 'path'].includes(internalType)) return 'technology';
  if (['resource', 'capability', 'value-stream', 'course-of-action'].includes(internalType)) return 'strategy';
  if (['stakeholder', 'driver', 'assessment', 'goal', 'outcome', 'principle', 'requirement', 'constraint', 'meaning', 'value'].includes(internalType)) return 'motivation';
  if (['work-package', 'deliverable', 'implementation-event', 'plateau', 'gap'].includes(internalType)) return 'implementation';
  return 'application';
}

// ═══════════════════════════════════════
// Row types
// ═══════════════════════════════════════

interface ElementRow {
  id: string;
  name: string;
  archimate_type: string;
  specialisation: string | null;
  description: string | null;
  properties: string | null;
}

interface RelationshipRow {
  id: string;
  archimate_type: string;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

// ═══════════════════════════════════════
// Routes
// ═══════════════════════════════════════

const router = Router();

// POST /api/import/csv — accepts JSON { elements: string, relations: string, properties?: string }
router.post('/import/csv', (req: Request, res: Response) => {
  try {
    const body = req.body as { elements?: string; relations?: string; properties?: string };

    if (!body.elements) {
      res.status(400).json({ error: 'elements CSV string is required' });
      return;
    }

    const result = db.transaction(() => {
      // Parse elements CSV
      const elementRows = parseCsvRows(body.elements!);
      if (elementRows.length === 0) {
        return { elementsCreated: 0, relationshipsCreated: 0 };
      }

      const elHeader = elementRows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
      const elIdIdx = elHeader.indexOf('id');
      const elTypeIdx = elHeader.indexOf('type');
      const elNameIdx = elHeader.indexOf('name');
      const elDocIdx = elHeader.indexOf('documentation');
      const elSpecIdx = elHeader.indexOf('specialization');

      const insertElement = db.prepare(`
        INSERT OR REPLACE INTO elements (id, name, archimate_type, specialisation, layer, description, created_by, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let elementsCreated = 0;
      for (let i = 1; i < elementRows.length; i++) {
        const row = elementRows[i]!;
        const rawType = elTypeIdx >= 0 ? (row[elTypeIdx] ?? '') : '';
        const internalType = ELEMENT_TYPE_MAP[rawType] ?? rawType;
        const id = (elIdIdx >= 0 && row[elIdIdx]) ? row[elIdIdx]! : `el-${crypto.randomUUID()}`;

        insertElement.run(
          id,
          elNameIdx >= 0 ? (row[elNameIdx] ?? 'Unnamed') : 'Unnamed',
          internalType,
          elSpecIdx >= 0 && row[elSpecIdx] ? row[elSpecIdx] : null,
          typeToLayer(internalType),
          elDocIdx >= 0 && row[elDocIdx] ? row[elDocIdx] : null,
          'csv-import',
          'csv',
        );
        elementsCreated++;
      }

      // Parse relations CSV
      let relationshipsCreated = 0;
      if (body.relations) {
        const relRows = parseCsvRows(body.relations);
        if (relRows.length > 1) {
          const relHeader = relRows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
          const relIdIdx = relHeader.indexOf('id');
          const relTypeIdx = relHeader.indexOf('type');
          const relNameIdx = relHeader.indexOf('name');
          const relDocIdx = relHeader.indexOf('documentation');
          const relSourceIdx = relHeader.indexOf('source');
          const relTargetIdx = relHeader.indexOf('target');

          const insertRelationship = db.prepare(`
            INSERT OR REPLACE INTO relationships (id, archimate_type, source_id, target_id, label, description, created_by, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (let i = 1; i < relRows.length; i++) {
            const row = relRows[i]!;
            const rawType = relTypeIdx >= 0 ? (row[relTypeIdx] ?? '') : '';
            const internalType = REL_TYPE_MAP[rawType] ?? rawType;
            const id = (relIdIdx >= 0 && row[relIdIdx]) ? row[relIdIdx]! : `rel-${crypto.randomUUID()}`;

            insertRelationship.run(
              id,
              internalType,
              relSourceIdx >= 0 ? (row[relSourceIdx] ?? '') : '',
              relTargetIdx >= 0 ? (row[relTargetIdx] ?? '') : '',
              relNameIdx >= 0 && row[relNameIdx] ? row[relNameIdx] : null,
              relDocIdx >= 0 && row[relDocIdx] ? row[relDocIdx] : null,
              'csv-import',
              'csv',
            );
            relationshipsCreated++;
          }
        }
      }

      // Parse properties CSV and update element properties
      if (body.properties) {
        const propRows = parseCsvRows(body.properties);
        if (propRows.length > 1) {
          const propHeader = propRows[0]!.map((h) => h.replace(/^"|"$/g, '').toLowerCase());
          const propIdIdx = propHeader.indexOf('id');
          const propKeyIdx = propHeader.indexOf('key');
          const propValueIdx = propHeader.indexOf('value');

          // Group properties by element ID
          const propsMap = new Map<string, Record<string, string>>();
          for (let i = 1; i < propRows.length; i++) {
            const row = propRows[i]!;
            const id = propIdIdx >= 0 ? (row[propIdIdx] ?? '') : '';
            const key = propKeyIdx >= 0 ? (row[propKeyIdx] ?? '') : '';
            const value = propValueIdx >= 0 ? (row[propValueIdx] ?? '') : '';
            if (!id || !key) continue;

            const existing = propsMap.get(id) ?? {};
            existing[key] = value;
            propsMap.set(id, existing);
          }

          const updateProps = db.prepare('UPDATE elements SET properties = ? WHERE id = ?');
          for (const [id, props] of propsMap) {
            updateProps.run(JSON.stringify(props), id);
          }
        }
      }

      return { elementsCreated, relationshipsCreated };
    })();

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// GET /api/export/csv — returns JSON with 3 CSV strings
router.get('/export/csv', (_req: Request, res: Response) => {
  try {
    const elements = db.prepare('SELECT id, name, archimate_type, specialisation, description, properties FROM elements ORDER BY name ASC').all() as ElementRow[];
    const relationships = db.prepare('SELECT id, archimate_type, source_id, target_id, label, description FROM relationships').all() as RelationshipRow[];

    // Generate elements CSV
    const elemLines: string[] = ['"ID","Type","Name","Documentation","Specialization"'];
    for (const el of elements) {
      const csvType = REVERSE_ELEMENT_TYPE_MAP[el.archimate_type] ?? el.archimate_type;
      elemLines.push(
        [
          csvEscape(el.id),
          csvEscape(csvType),
          csvEscape(el.name),
          csvEscape(el.description ?? ''),
          csvEscape(el.specialisation ?? ''),
        ].join(','),
      );
    }

    // Generate relations CSV
    const relLines: string[] = ['"ID","Type","Name","Documentation","Source","Target"'];
    for (const rel of relationships) {
      const csvType = REVERSE_REL_TYPE_MAP[rel.archimate_type] ?? rel.archimate_type;
      relLines.push(
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

    // Generate properties CSV
    const propLines: string[] = ['"ID","Key","Value"'];
    for (const el of elements) {
      if (!el.properties) continue;
      try {
        const props = JSON.parse(el.properties) as Record<string, unknown>;
        for (const [key, value] of Object.entries(props)) {
          propLines.push(
            [csvEscape(el.id), csvEscape(key), csvEscape(String(value ?? ''))].join(','),
          );
        }
      } catch {
        // Skip malformed JSON
      }
    }

    res.json({
      elements: elemLines.join('\n'),
      relations: relLines.join('\n'),
      properties: propLines.join('\n'),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
