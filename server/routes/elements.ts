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
      domain_id, status, description, properties, confidence, source_session_id, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
