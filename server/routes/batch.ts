import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import type {
  ElementRow,
  RelationshipRow,
  ViewRow,
} from '../../shared/types.js';
import { BatchImportBodySchema } from '../../src/model/types.js';
import type { BatchElementInputParsed } from '../../src/model/types.js';

const router = Router();

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

const UML_TYPES = new Set([
  'uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum',
  'uml-component', 'uml-actor', 'uml-use-case', 'uml-state',
  'uml-activity', 'uml-note', 'uml-package', 'uml-lifeline',
  'uml-activation', 'uml-fragment',
]);

const WF_TYPES = new Set([
  'wf-page', 'wf-section', 'wf-header', 'wf-nav', 'wf-button',
  'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio',
  'wf-table', 'wf-image', 'wf-icon', 'wf-text', 'wf-link',
  'wf-modal', 'wf-card', 'wf-list', 'wf-tab-group', 'wf-form',
  'wf-placeholder',
]);

function deriveNotation(elements: ElementRow[]): string {
  let hasUml = false;
  let hasWf = false;
  let hasArchimate = false;

  for (const el of elements) {
    if (UML_TYPES.has(el.archimate_type)) {
      hasUml = true;
    } else if (WF_TYPES.has(el.archimate_type)) {
      hasWf = true;
    } else {
      hasArchimate = true;
    }
    if ((hasUml ? 1 : 0) + (hasWf ? 1 : 0) + (hasArchimate ? 1 : 0) > 1) {
      return 'mixed';
    }
  }

  if (hasUml) return 'uml';
  if (hasWf) return 'wireframe';
  return 'archimate';
}

const GRID_COLS = 8;
const COL_WIDTH = 210;
const ROW_HEIGHT = 80;
const PADDING = 30;
const LAYER_GAP = 60;

// ─── POST /api/import/model-batch ────────────────────────────────────────────

router.post('/import/model-batch', (req: Request, res: Response) => {
  const parsed = BatchImportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const body = parsed.data;

  try {
    const result = db.transaction(() => {
      const nameToId = new Map<string, string>();
      const insertedElementIds: string[] = [];

      const insertElement = db.prepare(`
        INSERT INTO elements
          (id, name, archimate_type, specialisation, layer, sublayer, description, parent_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          archimate_type = excluded.archimate_type,
          specialisation = excluded.specialisation,
          layer = excluded.layer,
          sublayer = excluded.sublayer,
          description = excluded.description,
          parent_id = excluded.parent_id,
          updated_at = datetime('now')
      `);

      function processElement(el: BatchElementInputParsed, parentId: string | null): string {
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
        INSERT INTO relationships
          (id, archimate_type, specialisation, source_id, target_id, label)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          archimate_type = excluded.archimate_type,
          specialisation = excluded.specialisation,
          source_id = excluded.source_id,
          target_id = excluded.target_id,
          label = excluded.label,
          updated_at = datetime('now')
      `);

      let relationshipsCreated = 0;
      const warnings: string[] = [];

      const lookupElementType = db.prepare('SELECT archimate_type FROM elements WHERE id = ?');
      const checkValidRel = db.prepare(
        `SELECT 1 FROM valid_relationships
         WHERE source_archimate_type = ? AND target_archimate_type = ? AND relationship_type = ?`
      );

      for (const rel of body.relationships ?? []) {
        const sourceId = rel.source_id ?? (rel.source_name ? nameToId.get(rel.source_name) : undefined);
        const targetId = rel.target_id ?? (rel.target_name ? nameToId.get(rel.target_name) : undefined);

        if (!sourceId || !targetId) {
          // Skip unresolvable relationships
          continue;
        }

        // Validate against metamodel — warn but don't fail the batch
        const sourceEl = lookupElementType.get(sourceId) as { archimate_type: string } | undefined;
        const targetEl = lookupElementType.get(targetId) as { archimate_type: string } | undefined;

        if (sourceEl && targetEl) {
          const valid = checkValidRel.get(sourceEl.archimate_type, targetEl.archimate_type, rel.archimate_type);
          if (!valid) {
            warnings.push(
              `Skipped invalid relationship: '${rel.archimate_type}' from '${sourceEl.archimate_type}' to '${targetEl.archimate_type}'`
            );
            continue;
          }
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
          INSERT INTO views (id, name, viewpoint_type, render_mode)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            viewpoint_type = excluded.viewpoint_type,
            render_mode = excluded.render_mode,
            updated_at = datetime('now')
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
          INSERT INTO view_elements (view_id, element_id, x, y)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(view_id, element_id) DO UPDATE SET
            x = excluded.x,
            y = excluded.y
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
        ...(warnings.length > 0 ? { warnings } : {}),
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
      notation: deriveNotation(elements),
      elements,
      relationships,
      view: viewRow,
      viewElements,
    });
  } else {
    const elements = db.prepare('SELECT * FROM elements ORDER BY name ASC').all() as ElementRow[];
    const relationships = db.prepare('SELECT * FROM relationships').all() as RelationshipRow[];

    res.json({
      notation: deriveNotation(elements),
      elements,
      relationships,
    });
  }
});

export default router;
