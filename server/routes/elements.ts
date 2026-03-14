import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

interface ElementRow {
  id: string;
  name: string;
  archimate_type: string;
  specialisation: string | null;
  layer: string;
  sublayer: string | null;
  domain_id: string | null;
  status: string;
  description: string | null;
  properties: string | null;
  confidence: number | null;
  source_session_id: string | null;
  parent_id: string | null;
  created_by: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
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
  const { layer, domain, specialisation } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];

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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM elements ${where} ORDER BY name ASC`).all(...params) as ElementRow[];

  res.json(rows.map(parseProperties));
});

// POST /api/elements — create a new element
router.post('/elements', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const id = (body.id as string | undefined) ?? `el-${crypto.randomUUID()}`;

  const stmt = db.prepare(`
    INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer,
      domain_id, status, description, properties, confidence, source_session_id, parent_id,
      created_by, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  );

  const created = db.prepare('SELECT * FROM elements WHERE id = ?').get(id) as ElementRow;
  res.status(201).json(parseProperties(created));
});

// PUT /api/elements/:id — update an element
router.put('/elements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

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
  ];

  for (const field of updatable) {
    if (field in body) {
      fields.push(`${field} = ?`);
      params.push(body[field] ?? null);
    }
  }

  if ('properties' in body) {
    fields.push('properties = ?');
    params.push(body.properties ? JSON.stringify(body.properties) : null);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
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

// DELETE /api/elements/:id — delete an element
router.delete('/elements/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM elements WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Element not found' });
    return;
  }
  res.json({ deleted: id });
});

export default router;
