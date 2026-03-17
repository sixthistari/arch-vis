import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import type { ElementRow } from '../../shared/types.js';
import { CreateElementSchema, UpdateElementSchema } from '../../src/model/types.js';

function getCurrentProjectId(req: Request): string {
  const qp = req.query.project_id;
  if (typeof qp === 'string' && qp) return qp;
  const pref = db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string } | undefined;
  return pref?.value ?? 'proj-default';
}

function parseProperties(row: ElementRow): Omit<ElementRow, 'properties'> & { properties: Record<string, unknown> | null } {
  return {
    ...row,
    properties: row.properties ? JSON.parse(row.properties) as Record<string, unknown> : null,
  };
}

const router = Router();

// GET /api/elements — return all elements, with optional filters
router.get('/elements', (req: Request, res: Response) => {
  const projectId = getCurrentProjectId(req);
  const { layer, domain, specialisation } = req.query;
  const conditions: string[] = ['project_id = ?'];
  const params: unknown[] = [projectId];

  if (typeof layer === 'string') {
    conditions.push('layer = ?');
    params.push(layer);
  }
  if (typeof domain === 'string') {
    conditions.push('domain_id = ?');
    params.push(domain);
  }
  if (typeof specialisation === 'string') {
    conditions.push('specialisation = ?');
    params.push(specialisation);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = db.prepare(`SELECT * FROM elements ${where} ORDER BY name ASC`).all(...params) as ElementRow[];

  res.json(rows.map(parseProperties));
});

// POST /api/elements — create a new element
router.post('/elements', (req: Request, res: Response) => {
  const projectId = getCurrentProjectId(req);
  const parsed = CreateElementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }

  const body = parsed.data;
  const id = body.id ?? `el-${crypto.randomUUID()}`;

  const stmt = db.prepare(`
    INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer,
      domain_id, status, description, properties, confidence, source_session_id, parent_id,
      created_by, source, folder, project_id, area)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    body.name,
    body.archimate_type,
    body.specialisation ?? null,
    body.layer,
    body.sublayer ?? null,
    body.domain_id ?? null,
    body.status ?? 'active',
    body.description ?? null,
    body.properties ? JSON.stringify(body.properties) : null,
    body.confidence ?? null,
    body.source_session_id ?? null,
    body.parent_id ?? null,
    body.created_by ?? 'manual',
    body.source ?? 'manual',
    body.folder ?? null,
    body.project_id ?? projectId,
    body.area ?? 'working',
  );

  const created = db.prepare('SELECT * FROM elements WHERE id = ?').get(id) as ElementRow;
  res.status(201).json(parseProperties(created));
});

// PUT /api/elements/:id — update an element
router.put('/elements/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = UpdateElementSchema.safeParse({ ...req.body, id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }

  const body = parsed.data;

  const existing = db.prepare('SELECT id FROM elements WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Element not found' });
    return;
  }

  const fields: string[] = [];
  const params: unknown[] = [];

  const updatable = [
    'name', 'archimate_type', 'specialisation', 'layer', 'sublayer',
    'domain_id', 'status', 'description', 'confidence', 'source_session_id', 'parent_id',
    'folder',
  ];

  const bodyRecord = body as Record<string, unknown>;
  for (const field of updatable) {
    if (field in bodyRecord) {
      fields.push(`${field} = ?`);
      params.push(bodyRecord[field] ?? null);
    }
  }

  if ('properties' in bodyRecord) {
    fields.push('properties = ?');
    params.push(bodyRecord.properties ? JSON.stringify(bodyRecord.properties) : null);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update', code: 'VALIDATION_ERROR' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE elements SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM elements WHERE id = ?').get(id) as ElementRow;
  res.json(parseProperties(updated));
});

// GET /api/elements/:id/views — return all views containing this element
router.get('/elements/:id/views', (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM elements WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Element not found' });
    return;
  }

  const rows = db.prepare(`
    SELECT v.* FROM views v
    JOIN view_elements ve ON v.id = ve.view_id
    WHERE ve.element_id = ?
  `).all(id);

  // Parse JSON columns
  const parsed = (rows as Record<string, unknown>[]).map((row) => ({
    ...row,
    filter_layers: typeof row.filter_layers === 'string' ? JSON.parse(row.filter_layers) : row.filter_layers ?? null,
    filter_specialisations: typeof row.filter_specialisations === 'string' ? JSON.parse(row.filter_specialisations) : row.filter_specialisations ?? null,
    rotation_default: typeof row.rotation_default === 'string' ? JSON.parse(row.rotation_default) : row.rotation_default ?? null,
  }));

  res.json(parsed);
});

// POST /api/elements/bulk-specialisation — rename or clear specialisation across all matching elements
router.post('/elements/bulk-specialisation', (req: Request, res: Response) => {
  const { oldValue, newValue } = req.body as { oldValue?: string; newValue?: string | null };
  if (typeof oldValue !== 'string' || !oldValue) {
    res.status(400).json({ error: 'oldValue is required', code: 'VALIDATION_ERROR' });
    return;
  }
  const stmt = db.prepare('UPDATE elements SET specialisation = ?, updated_at = datetime(\'now\') WHERE specialisation = ?');
  const result = stmt.run(newValue ?? null, oldValue);
  res.json({ updated: result.changes });
});

// GET /api/elements/distinct-specialisations — return distinct specialisation values with counts
router.get('/elements/distinct-specialisations', (_req: Request, res: Response) => {
  const rows = db.prepare(
    'SELECT specialisation, COUNT(*) as count FROM elements WHERE specialisation IS NOT NULL GROUP BY specialisation ORDER BY specialisation ASC',
  ).all() as Array<{ specialisation: string; count: number }>;
  res.json(rows);
});

// DELETE /api/elements/:id — delete an element
router.delete('/elements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM elements WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Element not found' });
    return;
  }
  res.status(204).send();
});

export default router;
