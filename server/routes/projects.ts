import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { CreateProjectSchema, UpdateProjectSchema } from '../../src/model/types.js';

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const router = Router();

// GET /api/projects — list all projects
router.get('/projects', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY name ASC').all() as ProjectRow[];
  res.json(rows);
});

// POST /api/projects — create a new project
router.post('/projects', (req: Request, res: Response) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }

  const { name, description } = parsed.data;
  const id = `proj-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO projects (id, name, description) VALUES (?, ?, ?)
  `).run(id, name, description ?? null);

  const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
  res.status(201).json(created);
});

// GET /api/projects/current — get the current project
router.get('/projects/current', (_req: Request, res: Response) => {
  const pref = db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string } | undefined;
  if (!pref) {
    res.status(404).json({ error: 'No current project set' });
    return;
  }
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pref.value) as ProjectRow | undefined;
  if (!project) {
    res.status(404).json({ error: 'Current project not found' });
    return;
  }
  res.json(project);
});

// PUT /api/projects/current — switch current project
router.put('/projects/current', (req: Request, res: Response) => {
  const { id } = req.body as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'id is required', code: 'VALIDATION_ERROR' });
    return;
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  db.prepare("INSERT OR REPLACE INTO preferences (key, value) VALUES ('current_project_id', ?)").run(id);
  res.json(project);
});

// PUT /api/projects/:id — rename/update a project
router.put('/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }

  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const fields: string[] = [];
  const params: unknown[] = [];
  const body = parsed.data;

  if (body.name !== undefined) {
    fields.push('name = ?');
    params.push(body.name);
  }
  if (body.description !== undefined) {
    fields.push('description = ?');
    params.push(body.description);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update', code: 'VALIDATION_ERROR' });
    return;
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
  res.json(updated);
});

// DELETE /api/projects/:id — delete a project and cascade all its data
router.delete('/projects/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (id === 'proj-default') {
    res.status(400).json({ error: 'Cannot delete the default project' });
    return;
  }

  // Prevent deleting the last project
  const count = (db.prepare('SELECT COUNT(*) AS cnt FROM projects').get() as { cnt: number }).cnt;
  if (count <= 1) {
    res.status(400).json({ error: 'Cannot delete the last project', code: 'VALIDATION_ERROR' });
    return;
  }

  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const deleteAll = db.transaction(() => {
    // Delete view_elements and view_relationships for views in this project
    db.prepare(`
      DELETE FROM view_elements WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)
    `).run(id);
    db.prepare(`
      DELETE FROM view_relationships WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)
    `).run(id);
    // Delete views
    db.prepare('DELETE FROM views WHERE project_id = ?').run(id);
    // Delete relationships
    db.prepare('DELETE FROM relationships WHERE project_id = ?').run(id);
    // Delete elements
    db.prepare('DELETE FROM elements WHERE project_id = ?').run(id);
    // Delete the project
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    // If current_project_id pointed to this project, switch to another
    const pref = db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string } | undefined;
    if (pref?.value === id) {
      const other = db.prepare('SELECT id FROM projects LIMIT 1').get() as { id: string } | undefined;
      if (other) {
        db.prepare("UPDATE preferences SET value = ? WHERE key = 'current_project_id'").run(other.id);
      }
    }
  });

  deleteAll();
  res.status(204).send();
});

// ═══════════════════════════════════════
// Promote / Demote (elements, relationships, views)
// ═══════════════════════════════════════

function validateForPromotion(table: string, id: string): string[] {
  const row = db.prepare(`SELECT name, description FROM ${table} WHERE id = ?`).get(id) as { name: string; description: string | null } | undefined;
  if (!row) return [`${table.slice(0, -1)} not found`];
  const missing: string[] = [];
  if (!row.name?.trim()) missing.push('name');
  if (!row.description?.trim()) missing.push('description');
  return missing;
}

for (const table of ['elements', 'relationships', 'views'] as const) {
  const singular = table === 'views' ? 'view' : table === 'relationships' ? 'relationship' : 'element';

  // POST /api/{table}/:id/promote
  router.post(`/${table}/:id/promote`, (req: Request, res: Response) => {
    const id = req.params.id!;
    const missing = validateForPromotion(table, id);
    if (missing.length > 0) {
      res.status(422).json({
        error: `Cannot promote: missing ${missing.join(' and ')}`,
        missingFields: missing,
        code: 'PROMOTION_VALIDATION',
      });
      return;
    }
    db.prepare(`UPDATE ${table} SET area = 'governed', updated_at = datetime('now') WHERE id = ?`).run(id);
    res.json({ id, area: 'governed' });
  });

  // POST /api/{table}/:id/demote
  router.post(`/${table}/:id/demote`, (req: Request, res: Response) => {
    const id = req.params.id!;
    const existing = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
    if (!existing) {
      res.status(404).json({ error: `${singular} not found` });
      return;
    }
    db.prepare(`UPDATE ${table} SET area = 'working', updated_at = datetime('now') WHERE id = ?`).run(id);
    res.json({ id, area: 'working' });
  });

  // POST /api/{table}/bulk-promote
  router.post(`/${table}/bulk-promote`, (req: Request, res: Response) => {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array required', code: 'VALIDATION_ERROR' });
      return;
    }

    const results: { id: string; promoted: boolean; missingFields?: string[] }[] = [];
    const promoteStmt = db.prepare(`UPDATE ${table} SET area = 'governed', updated_at = datetime('now') WHERE id = ?`);

    db.transaction(() => {
      for (const id of ids) {
        const missing = validateForPromotion(table, id);
        if (missing.length > 0) {
          results.push({ id, promoted: false, missingFields: missing });
        } else {
          promoteStmt.run(id);
          results.push({ id, promoted: true });
        }
      }
    })();

    res.json({ results });
  });

  // POST /api/{table}/bulk-demote
  router.post(`/${table}/bulk-demote`, (req: Request, res: Response) => {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array required', code: 'VALIDATION_ERROR' });
      return;
    }

    const demoteStmt = db.prepare(`UPDATE ${table} SET area = 'working', updated_at = datetime('now') WHERE id = ?`);
    db.transaction(() => {
      for (const id of ids) {
        demoteStmt.run(id);
      }
    })();

    res.json({ demoted: ids.length });
  });
}

export default router;
