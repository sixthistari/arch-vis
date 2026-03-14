import { Router, Request, Response } from 'express';
import db from '../db.js';

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
}

interface ViewRelationshipRow {
  view_id: string;
  relationship_id: string;
  route_points: string | null;
  style_overrides: string | null;
}

function parseView(row: ViewRow) {
  return {
    ...row,
    filter_layers: row.filter_layers ? JSON.parse(row.filter_layers) as unknown : null,
    filter_specialisations: row.filter_specialisations ? JSON.parse(row.filter_specialisations) as unknown : null,
    rotation_default: row.rotation_default ? JSON.parse(row.rotation_default) as unknown : null,
    is_preset: row.is_preset === 1,
  };
}

function parseViewElement(row: ViewElementRow) {
  return {
    ...row,
    style_overrides: row.style_overrides ? JSON.parse(row.style_overrides) as unknown : null,
  };
}

function parseViewRelationship(row: ViewRelationshipRow) {
  return {
    ...row,
    route_points: row.route_points ? JSON.parse(row.route_points) as unknown : null,
    style_overrides: row.style_overrides ? JSON.parse(row.style_overrides) as unknown : null,
  };
}

const router = Router();

// GET /api/views — return all views
router.get('/views', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM views ORDER BY name ASC').all() as ViewRow[];
  res.json(rows.map(parseView));
});

// POST /api/views — create a new view
router.post('/views', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const stmt = db.prepare(`
    INSERT INTO views (id, name, viewpoint_type, description, render_mode,
      filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    INSERT OR REPLACE INTO view_elements (view_id, element_id, x, y, width, height, sublayer_override, style_overrides)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      );
    }
  });

  batchUpsert(items);

  const updated = db.prepare('SELECT * FROM view_elements WHERE view_id = ?').all(id) as ViewElementRow[];
  res.json(updated.map(parseViewElement));
});

// DELETE /api/views/:id — delete a view (cascade handles view_elements and view_relationships)
router.delete('/views/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM views WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

export default router;
