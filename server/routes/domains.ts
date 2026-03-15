import { Router, Request, Response } from 'express';
import db from '../db.js';
import { CreateDomainSchema } from '../../src/model/types.js';

const router = Router();

// GET /api/domains — return all domains
router.get('/domains', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM domains ORDER BY priority ASC, name ASC').all();
  res.json(rows);
});

// POST /api/domains — create a new domain
router.post('/domains', (req: Request, res: Response) => {
  const parsed = CreateDomainSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }
  const body = parsed.data;

  const stmt = db.prepare(`
    INSERT INTO domains (id, name, description, priority, maturity, autonomy_ceiling, track_default, owner_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(body.id, body.name, body.description ?? null, body.priority ?? null, body.maturity ?? null,
    body.autonomy_ceiling ?? null, body.track_default ?? null, body.owner_role ?? null);

  const created = db.prepare('SELECT * FROM domains WHERE id = ?').get(body.id);
  res.status(201).json(created);
});

export default router;
