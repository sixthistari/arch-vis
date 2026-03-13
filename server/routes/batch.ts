import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchElementInput {
  id?: string;
  name: string;
  archimate_type: string;
  layer: string;
  specialisation?: string | null;
  sublayer?: string | null;
  description?: string | null;
  children?: BatchElementInput[];
}

interface BatchRelationshipInput {
  id?: string;
  archimate_type: string;
  source_id?: string;
  source_name?: string;
  target_id?: string;
  target_name?: string;
  label?: string | null;
  specialisation?: string | null;
}

interface BatchImportBody {
  notation?: string;
  elements?: BatchElementInput[];
  relationships?: BatchRelationshipInput[];
  view?: {
    id?: string;
    name: string;
    viewpoint?: string;
    render_mode?: string;
  };
}

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

interface ViewRow {
  view_id: string;
  element_id: string;
}

// ─── Layer ordering for grid layout ──────────────────────────────────────────

const LAYER_ORDER = [
  'motivation',
  'strategy',
  'business',
  'application',
  'technology',
  'data',
  'implementation',
];

const GRID_COLS = 8;
const COL_WIDTH = 210;
const ROW_HEIGHT = 80;
const PADDING = 30;
const LAYER_GAP = 60;

// ─── POST /api/import/model-batch ────────────────────────────────────────────

router.post('/import/model-batch', (req: Request, res: Response) => {
  const body = req.body as BatchImportBody;

  try {
    const result = db.transaction(() => {
      const nameToId = new Map<string, string>();
      const insertedElementIds: string[] = [];

      const insertElement = db.prepare(`
        INSERT OR REPLACE INTO elements
          (id, name, archimate_type, specialisation, layer, sublayer, description, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      function processElement(el: BatchElementInput, parentId: string | null): string {
        const id = el.id ?? `el-${crypto.randomUUID()}`;
        insertElement.run(
          id,
          el.name,
          el.archimate_type,
          el.specialisation ?? null,
          el.layer,
          el.sublayer ?? null,
          el.description ?? null,
          parentId,
        );
        nameToId.set(el.name, id);
        insertedElementIds.push(id);

        if (Array.isArray(el.children)) {
          for (const child of el.children) {
            processElement(child, id);
          }
        }

        return id;
      }

      for (const el of body.elements ?? []) {
        processElement(el, null);
      }

      const insertRelationship = db.prepare(`
        INSERT OR REPLACE INTO relationships
          (id, archimate_type, specialisation, source_id, target_id, label)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      let relationshipsCreated = 0;

      for (const rel of body.relationships ?? []) {
        const sourceId = rel.source_id ?? (rel.source_name ? nameToId.get(rel.source_name) : undefined);
        const targetId = rel.target_id ?? (rel.target_name ? nameToId.get(rel.target_name) : undefined);

        if (!sourceId || !targetId) {
          // Skip unresolvable relationships
          continue;
        }

        const id = rel.id ?? `rel-${crypto.randomUUID()}`;
        insertRelationship.run(
          id,
          rel.archimate_type,
          rel.specialisation ?? null,
          sourceId,
          targetId,
          rel.label ?? null,
        );
        relationshipsCreated++;
      }

      let viewId: string | null = null;

      if (body.view) {
        const v = body.view;
        viewId = v.id ?? `view-${crypto.randomUUID()}`;
        const viewpointType = v.viewpoint ?? 'custom';
        const renderMode = v.render_mode ?? 'flat';

        db.prepare(`
          INSERT OR REPLACE INTO views (id, name, viewpoint_type, render_mode)
          VALUES (?, ?, ?, ?)
        `).run(viewId, v.name, viewpointType, renderMode);

        // Group elements by layer in LAYER_ORDER order
        const layerGroups = new Map<string, string[]>();
        for (const id of insertedElementIds) {
          const row = db.prepare('SELECT layer FROM elements WHERE id = ?').get(id) as { layer: string } | undefined;
          if (!row) continue;
          const group = layerGroups.get(row.layer) ?? [];
          group.push(id);
          layerGroups.set(row.layer, group);
        }

        const insertViewElement = db.prepare(`
          INSERT OR REPLACE INTO view_elements (view_id, element_id, x, y)
          VALUES (?, ?, ?, ?)
        `);

        let currentY = PADDING;

        for (const layer of LAYER_ORDER) {
          const ids = layerGroups.get(layer);
          if (!ids || ids.length === 0) continue;

          for (let i = 0; i < ids.length; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const x = PADDING + col * COL_WIDTH;
            const y = currentY + row * ROW_HEIGHT;
            insertViewElement.run(viewId, ids[i], x, y);
          }

          const rows = Math.ceil(ids.length / GRID_COLS);
          currentY += rows * ROW_HEIGHT + LAYER_GAP;
        }
      }

      return {
        success: true,
        elementsCreated: insertedElementIds.length,
        relationshipsCreated,
        viewId,
      };
    })();

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// ─── GET /api/export/model-batch ─────────────────────────────────────────────

router.get('/export/model-batch', (req: Request, res: Response) => {
  const viewParam = req.query['view'];

  if (typeof viewParam === 'string' && viewParam.length > 0) {
    const viewRow = db.prepare('SELECT * FROM views WHERE id = ?').get(viewParam);
    if (!viewRow) {
      res.status(404).json({ error: 'View not found' });
      return;
    }

    const viewElements = db
      .prepare('SELECT * FROM view_elements WHERE view_id = ?')
      .all(viewParam) as ViewRow[];

    const elementIds = viewElements.map((r) => r.element_id);

    if (elementIds.length === 0) {
      res.json({
        notation: 'archimate',
        elements: [],
        relationships: [],
        view: viewRow,
        viewElements,
      });
      return;
    }

    const placeholders = elementIds.map(() => '?').join(', ');

    const elements = db
      .prepare(`SELECT * FROM elements WHERE id IN (${placeholders})`)
      .all(...elementIds) as ElementRow[];

    const relationships = db
      .prepare(
        `SELECT * FROM relationships
         WHERE source_id IN (${placeholders})
           AND target_id IN (${placeholders})`,
      )
      .all(...elementIds, ...elementIds) as RelationshipRow[];

    res.json({
      notation: 'archimate',
      elements,
      relationships,
      view: viewRow,
      viewElements,
    });
  } else {
    const elements = db.prepare('SELECT * FROM elements ORDER BY name ASC').all() as ElementRow[];
    const relationships = db.prepare('SELECT * FROM relationships').all() as RelationshipRow[];

    res.json({
      notation: 'archimate',
      elements,
      relationships,
    });
  }
});

export default router;
