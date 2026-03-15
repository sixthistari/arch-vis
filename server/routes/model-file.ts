import { Router, Request, Response } from 'express';
import db from '../db.js';
import seed from '../seed.js';
import type {
  ElementRow,
  RelationshipRow,
} from '../../shared/types.js';

const router = Router();

// ═══════════════════════════════════════
// Model-full file format
// ═══════════════════════════════════════

interface ModelFileFormat {
  version: number;
  exportedAt: string;
  domains: DomainRow[];
  elements: ElementRow[];
  relationships: RelationshipRow[];
  views: ViewDbRow[];
  viewElements: ViewElementRow[];
  viewRelationships: ViewRelationshipRow[];
}

interface DomainRow {
  id: string;
  name: string;
  description: string | null;
  priority: number | null;
  maturity: string | null;
  autonomy_ceiling: string | null;
  track_default: string | null;
  owner_role: string | null;
  created_at: string;
  updated_at: string;
}

interface ViewDbRow {
  id: string;
  name: string;
  viewpoint_type: string;
  description: string | null;
  render_mode: string | null;
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

// ─── GET /api/export/model-full ──────────────────────────────────────────────
// Export the entire model as a single JSON document (.archvis format)

router.get('/export/model-full', (_req: Request, res: Response) => {
  try {
    const domains = db.prepare('SELECT * FROM domains').all() as DomainRow[];
    const elements = db.prepare('SELECT * FROM elements ORDER BY name ASC').all() as ElementRow[];
    const relationships = db.prepare('SELECT * FROM relationships').all() as RelationshipRow[];
    const views = db.prepare('SELECT * FROM views').all() as ViewDbRow[];
    const viewElements = db.prepare('SELECT * FROM view_elements').all() as ViewElementRow[];
    const viewRelationships = db.prepare('SELECT * FROM view_relationships').all() as ViewRelationshipRow[];

    const payload: ModelFileFormat = {
      version: 1,
      exportedAt: new Date().toISOString(),
      domains,
      elements,
      relationships,
      views,
      viewElements,
      viewRelationships,
    };

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/import/model-full ─────────────────────────────────────────────
// Replace the entire model with the contents of an .archvis file

router.post('/import/model-full', (req: Request, res: Response) => {
  const body = req.body as Partial<ModelFileFormat>;

  if (!body.version || body.version !== 1) {
    res.status(400).json({ error: 'Invalid or unsupported model file version.' });
    return;
  }

  if (!Array.isArray(body.elements)) {
    res.status(400).json({ error: 'Model file must contain an elements array.' });
    return;
  }

  try {
    db.transaction(() => {
      // Clear all model data (order matters for foreign keys)
      db.exec('DELETE FROM view_relationships');
      db.exec('DELETE FROM view_elements');
      db.exec('DELETE FROM views');
      db.exec('DELETE FROM relationships');
      db.exec('DELETE FROM elements');
      db.exec('DELETE FROM domains');
      db.exec('DELETE FROM reasoning_summaries');
      db.exec('DELETE FROM process_steps');

      // 1. Domains
      if (body.domains && body.domains.length > 0) {
        const insertDomain = db.prepare(`
          INSERT INTO domains (id, name, description, priority, maturity, autonomy_ceiling, track_default, owner_role, created_at, updated_at)
          VALUES (@id, @name, @description, @priority, @maturity, @autonomy_ceiling, @track_default, @owner_role, @created_at, @updated_at)
        `);
        for (const d of body.domains) {
          insertDomain.run(d);
        }
      }

      // 2. Elements
      const insertElement = db.prepare(`
        INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer, domain_id, status, description, properties, confidence, source_session_id, parent_id, created_by, source, folder, created_at, updated_at)
        VALUES (@id, @name, @archimate_type, @specialisation, @layer, @sublayer, @domain_id, @status, @description, @properties, @confidence, @source_session_id, @parent_id, @created_by, @source, @folder, @created_at, @updated_at)
      `);
      for (const e of body.elements!) {
        // Backward compat: older .archvis files may lack the folder field
        const row = e as unknown as Record<string, unknown>;
        if (!('folder' in row)) row.folder = null;
        insertElement.run(row);
      }

      // 3. Relationships
      if (body.relationships && body.relationships.length > 0) {
        const insertRel = db.prepare(`
          INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id, label, description, properties, confidence, created_by, source, created_at, updated_at)
          VALUES (@id, @archimate_type, @specialisation, @source_id, @target_id, @label, @description, @properties, @confidence, @created_by, @source, @created_at, @updated_at)
        `);
        for (const r of body.relationships) {
          insertRel.run(r);
        }
      }

      // 4. Views
      if (body.views && body.views.length > 0) {
        const insertView = db.prepare(`
          INSERT INTO views (id, name, viewpoint_type, description, render_mode, filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset, created_at, updated_at)
          VALUES (@id, @name, @viewpoint_type, @description, @render_mode, @filter_domain, @filter_layers, @filter_specialisations, @rotation_default, @is_preset, @created_at, @updated_at)
        `);
        for (const v of body.views) {
          insertView.run(v);
        }
      }

      // 5. View elements
      if (body.viewElements && body.viewElements.length > 0) {
        const insertVE = db.prepare(`
          INSERT INTO view_elements (view_id, element_id, x, y, width, height, sublayer_override, style_overrides, z_index)
          VALUES (@view_id, @element_id, @x, @y, @width, @height, @sublayer_override, @style_overrides, @z_index)
        `);
        for (const ve of body.viewElements) {
          insertVE.run(ve);
        }
      }

      // 6. View relationships
      if (body.viewRelationships && body.viewRelationships.length > 0) {
        const insertVR = db.prepare(`
          INSERT INTO view_relationships (view_id, relationship_id, route_points, style_overrides)
          VALUES (@view_id, @relationship_id, @route_points, @style_overrides)
        `);
        for (const vr of body.viewRelationships) {
          insertVR.run(vr);
        }
      }
    })();

    const elementCount = (db.prepare('SELECT COUNT(*) AS cnt FROM elements').get() as { cnt: number }).cnt;
    const relCount = (db.prepare('SELECT COUNT(*) AS cnt FROM relationships').get() as { cnt: number }).cnt;
    const viewCount = (db.prepare('SELECT COUNT(*) AS cnt FROM views').get() as { cnt: number }).cnt;

    res.json({
      success: true,
      elementsImported: elementCount,
      relationshipsImported: relCount,
      viewsImported: viewCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// ─── POST /api/model/reset ───────────────────────────────────────────────────
// Clear the model. If ?seed=true (default), reload seed data afterwards.

router.post('/model/reset', (req: Request, res: Response) => {
  const seedParam = req.query['seed'];
  const shouldSeed = seedParam !== 'false';

  try {
    db.transaction(() => {
      db.exec('DELETE FROM view_relationships');
      db.exec('DELETE FROM view_elements');
      db.exec('DELETE FROM views');
      db.exec('DELETE FROM relationships');
      db.exec('DELETE FROM elements');
      db.exec('DELETE FROM domains');
      db.exec('DELETE FROM reasoning_summaries');
      db.exec('DELETE FROM process_steps');
    })();

    if (shouldSeed) {
      seed();
    }

    const elementCount = (db.prepare('SELECT COUNT(*) AS cnt FROM elements').get() as { cnt: number }).cnt;
    res.json({ success: true, seeded: shouldSeed, elements: elementCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
