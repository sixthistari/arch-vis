import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { CreateViewSchema } from '../../src/model/types.js';

function getCurrentProjectId(req: Request): string {
  const qp = req.query.project_id;
  if (typeof qp === 'string' && qp) return qp;
  const pref = db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string } | undefined;
  return pref?.value ?? 'proj-default';
}

interface ViewRow {
  id: string;
  name: string;
  viewpoint_type: string;
  description: string | null;
  render_mode: string;
  filter_domain: string | null;
  filter_layers: string | null;
  filter_specialisations: string | null;
  rotation_default: string | null;
  is_preset: number;
  created_at: string;
  updated_at: string;
}

interface ViewElementRow {
  view_id: string;
  element_id: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  sublayer_override: string | null;
  style_overrides: string | null;
  z_index: number;
}

interface ViewRelationshipRow {
  view_id: string;
  relationship_id: string;
  route_points: string | null;
  style_overrides: string | null;
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseView(row: ViewRow) {
  return {
    ...row,
    filter_layers: safeJsonParse(row.filter_layers),
    filter_specialisations: safeJsonParse(row.filter_specialisations),
    rotation_default: safeJsonParse(row.rotation_default),
    is_preset: row.is_preset === 1,
  };
}

function parseViewElement(row: ViewElementRow) {
  return {
    ...row,
    style_overrides: safeJsonParse(row.style_overrides),
  };
}

function parseViewRelationship(row: ViewRelationshipRow) {
  return {
    ...row,
    route_points: safeJsonParse(row.route_points),
    style_overrides: safeJsonParse(row.style_overrides),
  };
}

const router = Router();

// GET /api/views — return all views for current project
router.get('/views', (req: Request, res: Response) => {
  const projectId = getCurrentProjectId(req);
  const rows = db.prepare('SELECT * FROM views WHERE project_id = ? ORDER BY name ASC').all(projectId) as ViewRow[];
  res.json(rows.map(parseView));
});

// POST /api/views — create a new view
router.post('/views', (req: Request, res: Response) => {
  const projectId = getCurrentProjectId(req);
  const parsed = CreateViewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; '), code: 'VALIDATION_ERROR' });
    return;
  }
  const body = parsed.data;

  const stmt = db.prepare(`
    INSERT INTO views (id, name, viewpoint_type, description, render_mode,
      filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset, project_id, area)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    body.id,
    body.name,
    body.viewpoint_type,
    body.description ?? null,
    body.render_mode ?? 'spatial',
    body.filter_domain ?? null,
    body.filter_layers ? JSON.stringify(body.filter_layers) : null,
    body.filter_specialisations ? JSON.stringify(body.filter_specialisations) : null,
    body.rotation_default ? JSON.stringify(body.rotation_default) : null,
    body.is_preset ? 1 : 0,
    body.project_id ?? projectId,
    body.area ?? 'working',
  );

  const created = db.prepare('SELECT * FROM views WHERE id = ?').get(body.id) as ViewRow;
  res.status(201).json(parseView(created));
});

// GET /api/views/:id — return the view with nested view_elements and view_relationships
router.get('/views/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const view = db.prepare('SELECT * FROM views WHERE id = ?').get(id) as ViewRow | undefined;
  if (!view) {
    res.status(404).json({ error: 'View not found' });
    return;
  }

  const viewElements = db.prepare('SELECT * FROM view_elements WHERE view_id = ?').all(id) as ViewElementRow[];
  const viewRelationships = db.prepare('SELECT * FROM view_relationships WHERE view_id = ?').all(id) as ViewRelationshipRow[];

  res.json({
    view: parseView(view),
    viewElements: viewElements.map(parseViewElement),
    viewRelationships: viewRelationships.map(parseViewRelationship),
  });
});

// PUT /api/views/:id/elements — batch upsert view_elements
router.put('/views/:id/elements', (req: Request, res: Response) => {
  const { id } = req.params;

  const view = db.prepare('SELECT id FROM views WHERE id = ?').get(id);
  if (!view) {
    res.status(404).json({ error: 'View not found' });
    return;
  }

  const items = req.body as Array<Record<string, unknown>>;

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO view_elements (view_id, element_id, x, y, width, height, sublayer_override, style_overrides, z_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const batchUpsert = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      upsert.run(
        id,
        row.element_id,
        row.x ?? 0,
        row.y ?? 0,
        row.width ?? null,
        row.height ?? null,
        row.sublayer_override ?? null,
        row.style_overrides ? JSON.stringify(row.style_overrides) : null,
        row.z_index ?? 0,
      );
    }
  });

  batchUpsert(items);

  const updated = db.prepare('SELECT * FROM view_elements WHERE view_id = ?').all(id) as ViewElementRow[];
  res.json(updated.map(parseViewElement));
});

// DELETE /api/views/:id/elements — batch remove view_elements (remove from view only, model unchanged)
router.delete('/views/:id/elements', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as { element_ids?: string[] };
  const elementIds = body.element_ids;
  if (!Array.isArray(elementIds) || elementIds.length === 0) {
    res.status(400).json({ error: 'element_ids array required', code: 'VALIDATION_ERROR' });
    return;
  }

  const del = db.prepare('DELETE FROM view_elements WHERE view_id = ? AND element_id = ?');
  const batchDelete = db.transaction((ids: string[]) => {
    for (const eid of ids) {
      del.run(id, eid);
    }
  });
  batchDelete(elementIds);

  res.status(204).send();
});

// DELETE /api/views/:id/elements/:elementId — remove a single view_element
router.delete('/views/:id/elements/:elementId', (req: Request, res: Response) => {
  const { id, elementId } = req.params;
  db.prepare('DELETE FROM view_elements WHERE view_id = ? AND element_id = ?').run(id, elementId);
  res.status(204).send();
});

// POST /api/views/:id/duplicate — atomically duplicate a view with all elements and relationships
router.post('/views/:id/duplicate', (req: Request, res: Response) => {
  const { id } = req.params;
  const original = db.prepare('SELECT * FROM views WHERE id = ?').get(id) as ViewRow | undefined;
  if (!original) {
    res.status(404).json({ error: 'View not found' });
    return;
  }

  const newId = `view-${crypto.randomUUID()}`;
  const newName = `Copy of ${original.name}`;

  const duplicateTransaction = db.transaction(() => {
    // Create the new view
    db.prepare(`
      INSERT INTO views (id, name, viewpoint_type, description, render_mode,
        filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      newName,
      original.viewpoint_type,
      original.description,
      original.render_mode,
      original.filter_domain,
      original.filter_layers,
      original.filter_specialisations,
      original.rotation_default,
      0, // duplicated views are never presets
    );

    // Copy view_elements
    const viewElements = db.prepare('SELECT * FROM view_elements WHERE view_id = ?').all(id) as ViewElementRow[];
    const insertVE = db.prepare(`
      INSERT INTO view_elements (view_id, element_id, x, y, width, height, sublayer_override, style_overrides, z_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ve of viewElements) {
      insertVE.run(newId, ve.element_id, ve.x, ve.y, ve.width, ve.height, ve.sublayer_override, ve.style_overrides, ve.z_index);
    }

    // Copy view_relationships
    const viewRels = db.prepare('SELECT * FROM view_relationships WHERE view_id = ?').all(id) as ViewRelationshipRow[];
    const insertVR = db.prepare(`
      INSERT INTO view_relationships (view_id, relationship_id, route_points, style_overrides)
      VALUES (?, ?, ?, ?)
    `);
    for (const vr of viewRels) {
      insertVR.run(newId, vr.relationship_id, vr.route_points, vr.style_overrides);
    }
  });

  duplicateTransaction();

  const created = db.prepare('SELECT * FROM views WHERE id = ?').get(newId) as ViewRow;
  res.status(201).json(parseView(created));
});

// DELETE /api/views/:id — delete a view (cascade handles view_elements and view_relationships)
router.delete('/views/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM views WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
