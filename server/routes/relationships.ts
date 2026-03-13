import { Router, Request, Response } from 'express';
import db from '../db.js';

interface RelationshipRow {
  id: string;
  archimate_type: string;
  specialisation: string | null;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
  properties: string | null;
  confidence: number | null;
  created_at: string;
}

function parseProperties(row: RelationshipRow): Omit<RelationshipRow, 'properties'> & { properties: Record<string, unknown> | null } {
  return {
    ...row,
    properties: row.properties ? JSON.parse(row.properties) as Record<string, unknown> : null,
  };
}

const router = Router();

// GET /api/relationships — return all, with optional filters
router.get('/relationships', (req: Request, res: Response) => {
  const { source_id, target_id, archimate_type } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (typeof source_id === 'string') {
    conditions.push('source_id = ?');
    params.push(source_id);
  }
  if (typeof target_id === 'string') {
    conditions.push('target_id = ?');
    params.push(target_id);
  }
  if (typeof archimate_type === 'string') {
    conditions.push('archimate_type = ?');
    params.push(archimate_type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM relationships ${where}`).all(...params) as RelationshipRow[];

  res.json(rows.map(parseProperties));
});

// POST /api/relationships — create a new relationship
router.post('/relationships', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const stmt = db.prepare(`
    INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id,
      label, description, properties, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    body.id,
    body.archimate_type,
    body.specialisation ?? null,
    body.source_id,
    body.target_id,
    body.label ?? null,
    body.description ?? null,
    body.properties ? JSON.stringify(body.properties) : null,
    body.confidence ?? null,
  );

  const created = db.prepare('SELECT * FROM relationships WHERE id = ?').get(body.id) as RelationshipRow;
  res.status(201).json(parseProperties(created));
});

// DELETE /api/relationships/:id — delete a relationship
router.delete('/relationships/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM relationships WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Relationship not found' });
    return;
  }
  res.json({ deleted: id });
});

export default router;
