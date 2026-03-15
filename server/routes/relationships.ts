import { Router, Request, Response } from 'express';
import db from '../db.js';
import type { RelationshipRow } from '../../shared/types.js';
import { CreateRelationshipSchema, UpdateRelationshipSchema } from '../../src/model/types.js';

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
  const parsed = CreateRelationshipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const body = parsed.data;

  // Validate relationship against metamodel
  const sourceEl = db.prepare('SELECT archimate_type FROM elements WHERE id = ?').get(body.source_id) as { archimate_type: string } | undefined;
  const targetEl = db.prepare('SELECT archimate_type FROM elements WHERE id = ?').get(body.target_id) as { archimate_type: string } | undefined;

  if (!sourceEl) {
    res.status(400).json({ error: `Source element '${body.source_id}' not found` });
    return;
  }
  if (!targetEl) {
    res.status(400).json({ error: `Target element '${body.target_id}' not found` });
    return;
  }

  const validRel = db.prepare(
    `SELECT 1 FROM valid_relationships
     WHERE source_archimate_type = ? AND target_archimate_type = ? AND relationship_type = ?`
  ).get(sourceEl.archimate_type, targetEl.archimate_type, body.archimate_type as string);

  if (!validRel) {
    res.status(400).json({
      error: `Invalid relationship: '${body.archimate_type}' is not allowed from '${sourceEl.archimate_type}' to '${targetEl.archimate_type}'`,
    });
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id,
      label, description, properties, confidence, created_by, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    body.created_by ?? 'manual',
    body.source ?? 'manual',
  );

  const created = db.prepare('SELECT * FROM relationships WHERE id = ?').get(body.id) as RelationshipRow;
  res.status(201).json(parseProperties(created));
});

// PUT /api/relationships/:id — update a relationship
router.put('/relationships/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = UpdateRelationshipSchema.safeParse({ ...req.body, id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const body = parsed.data;

  const existing = db.prepare('SELECT id FROM relationships WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Relationship not found' });
    return;
  }

  const fields: string[] = [];
  const params: unknown[] = [];

  const updatable = [
    'archimate_type', 'specialisation', 'source_id', 'target_id',
    'label', 'description', 'confidence',
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
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  // Validate against metamodel if archimate_type, source_id, or target_id changed
  if ('archimate_type' in bodyRecord || 'source_id' in bodyRecord || 'target_id' in bodyRecord) {
    const currentRow = db.prepare('SELECT archimate_type, source_id, target_id FROM relationships WHERE id = ?')
      .get(id) as { archimate_type: string; source_id: string; target_id: string };

    const newType = (bodyRecord.archimate_type as string) ?? currentRow.archimate_type;
    const newSourceId = (bodyRecord.source_id as string) ?? currentRow.source_id;
    const newTargetId = (bodyRecord.target_id as string) ?? currentRow.target_id;

    const sourceEl = db.prepare('SELECT archimate_type FROM elements WHERE id = ?').get(newSourceId) as { archimate_type: string } | undefined;
    const targetEl = db.prepare('SELECT archimate_type FROM elements WHERE id = ?').get(newTargetId) as { archimate_type: string } | undefined;

    if (!sourceEl) {
      res.status(400).json({ error: `Source element '${newSourceId}' not found` });
      return;
    }
    if (!targetEl) {
      res.status(400).json({ error: `Target element '${newTargetId}' not found` });
      return;
    }

    const validRel = db.prepare(
      `SELECT 1 FROM valid_relationships
       WHERE source_archimate_type = ? AND target_archimate_type = ? AND relationship_type = ?`
    ).get(sourceEl.archimate_type, targetEl.archimate_type, newType);

    if (!validRel) {
      res.status(400).json({
        error: `Invalid relationship: '${newType}' is not allowed from '${sourceEl.archimate_type}' to '${targetEl.archimate_type}'`,
      });
      return;
    }
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE relationships SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM relationships WHERE id = ?').get(id) as RelationshipRow;
  res.json(parseProperties(updated));
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
