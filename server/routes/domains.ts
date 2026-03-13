import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/domains — return all domains
router.get('/domains', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM domains ORDER BY priority ASC, name ASC').all();
  res.json(rows);
});

// POST /api/domains — create a new domain
router.post('/domains', (req: Request, res: Response) => {
  const {
    id, name, description, priority, maturity,
    autonomy_ceiling, track_default, owner_role,
  } = req.body as Record<string, unknown>;

  const stmt = db.prepare(`
    INSERT INTO domains (id, name, description, priority, maturity, autonomy_ceiling, track_default, owner_role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, description ?? null, priority ?? null, maturity ?? null,
    autonomy_ceiling ?? null, track_default ?? null, owner_role ?? null);

  const created = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
  res.status(201).json(created);
});

export default router;
