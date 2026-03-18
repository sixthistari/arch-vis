import { Router, Request, Response } from 'express';
import db from '../db.js';
import seed from '../seed.js';
import type {
  ElementRow,
  RelationshipRow,
} from '../../shared/types.js';

function getCurrentProjectId(req: Request): string {
  const qp = req.query.project_id;
  if (typeof qp === 'string' && qp) return qp;
  const pref = db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string } | undefined;
  return pref?.value ?? 'proj-default';
}

const router = Router();

// ═══════════════════════════════════════
// Model-full file format
// ═══════════════════════════════════════

interface ModelFileFormat {
  version: number;
  exportedAt: string;
  projectId?: string;
  projectName?: string;
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

router.get('/export/model-full', (req: Request, res: Response) => {
  try {
    const projectId = getCurrentProjectId(req);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as { id: string; name: string } | undefined;
    const domains = db.prepare('SELECT * FROM domains').all() as DomainRow[];
    const elements = db.prepare('SELECT * FROM elements WHERE project_id = ? ORDER BY name ASC').all(projectId) as ElementRow[];
    const relationships = db.prepare('SELECT * FROM relationships WHERE project_id = ?').all(projectId) as RelationshipRow[];
    const views = db.prepare('SELECT * FROM views WHERE project_id = ?').all(projectId) as ViewDbRow[];
    const viewIds = views.map(v => v.id);
    const viewElements = viewIds.length > 0
      ? db.prepare(`SELECT * FROM view_elements WHERE view_id IN (${viewIds.map(() => '?').join(',')})`).all(...viewIds) as ViewElementRow[]
      : [];
    const viewRelationships = viewIds.length > 0
      ? db.prepare(`SELECT * FROM view_relationships WHERE view_id IN (${viewIds.map(() => '?').join(',')})`).all(...viewIds) as ViewRelationshipRow[]
      : [];

    const payload: ModelFileFormat = {
      version: 1,
      exportedAt: new Date().toISOString(),
      projectId,
      projectName: project?.name ?? 'Unknown',
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
  const projectId = getCurrentProjectId(req);
  const body = req.body as Partial<ModelFileFormat>;

  if (!body.version || body.version !== 1) {
    res.status(400).json({ error: 'Invalid or unsupported model file version.', code: 'VALIDATION_ERROR' });
    return;
  }

  if (!Array.isArray(body.elements)) {
    res.status(400).json({ error: 'Model file must contain an elements array.', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    db.transaction(() => {
      // Clear only current project's data (order matters for foreign keys)
      db.prepare(`DELETE FROM view_relationships WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)`).run(projectId);
      db.prepare(`DELETE FROM view_elements WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)`).run(projectId);
      db.prepare('DELETE FROM views WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM relationships WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM elements WHERE project_id = ?').run(projectId);
      // Domains are shared across projects — use INSERT OR IGNORE for imported domains

      // 1. Domains (merge — don't delete shared domains)
      if (body.domains && body.domains.length > 0) {
        const insertDomain = db.prepare(`
          INSERT OR IGNORE INTO domains (id, name, description, priority, maturity, autonomy_ceiling, track_default, owner_role, created_at, updated_at)
          VALUES (@id, @name, @description, @priority, @maturity, @autonomy_ceiling, @track_default, @owner_role, @created_at, @updated_at)
        `);
        for (const d of body.domains) {
          insertDomain.run(d);
        }
      }

      // 2. Elements
      const insertElement = db.prepare(`
        INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer, domain_id, status, description, properties, confidence, source_session_id, parent_id, created_by, source, folder, project_id, area, created_at, updated_at)
        VALUES (@id, @name, @archimate_type, @specialisation, @layer, @sublayer, @domain_id, @status, @description, @properties, @confidence, @source_session_id, @parent_id, @created_by, @source, @folder, @project_id, @area, @created_at, @updated_at)
      `);
      for (const e of body.elements!) {
        // Backward compat: older .archvis files may lack folder/project_id/area fields
        const row = e as unknown as Record<string, unknown>;
        if (!('folder' in row)) row.folder = null;
        if (!('project_id' in row) || !row.project_id) row.project_id = projectId;
        if (!('area' in row) || !row.area) row.area = 'working';
        insertElement.run(row);
      }

      // 3. Relationships
      if (body.relationships && body.relationships.length > 0) {
        const insertRel = db.prepare(`
          INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id, label, description, properties, confidence, created_by, source, project_id, area, created_at, updated_at)
          VALUES (@id, @archimate_type, @specialisation, @source_id, @target_id, @label, @description, @properties, @confidence, @created_by, @source, @project_id, @area, @created_at, @updated_at)
        `);
        for (const r of body.relationships) {
          const row = r as unknown as Record<string, unknown>;
          if (!('project_id' in row) || !row.project_id) row.project_id = projectId;
          if (!('area' in row) || !row.area) row.area = 'working';
          insertRel.run(row);
        }
      }

      // 4. Views
      if (body.views && body.views.length > 0) {
        const insertView = db.prepare(`
          INSERT INTO views (id, name, viewpoint_type, description, render_mode, filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset, project_id, area, created_at, updated_at)
          VALUES (@id, @name, @viewpoint_type, @description, @render_mode, @filter_domain, @filter_layers, @filter_specialisations, @rotation_default, @is_preset, @project_id, @area, @created_at, @updated_at)
        `);
        for (const v of body.views) {
          const row = v as unknown as Record<string, unknown>;
          if (!('project_id' in row) || !row.project_id) row.project_id = projectId;
          if (!('area' in row) || !row.area) row.area = 'working';
          insertView.run(row);
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
    res.status(400).json({ error: message, code: 'VALIDATION_ERROR' });
  }
});

// ─── POST /api/model/reset ───────────────────────────────────────────────────
// Clear the model. If ?seed=true (default), reload seed data afterwards.

router.post('/model/reset', (req: Request, res: Response) => {
  const seedParam = req.query['seed'];
  const shouldSeed = seedParam !== 'false';

  try {
    const projectId = (db.prepare("SELECT value FROM preferences WHERE key = 'current_project_id'").get() as { value: string })?.value || 'proj-default';

    db.transaction(() => {
      db.prepare(`DELETE FROM view_relationships WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)`).run(projectId);
      db.prepare(`DELETE FROM view_elements WHERE view_id IN (SELECT id FROM views WHERE project_id = ?)`).run(projectId);
      db.prepare('DELETE FROM views WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM relationships WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM elements WHERE project_id = ?').run(projectId);
      // Only delete domains not referenced by elements in other projects
      db.prepare(`DELETE FROM domains WHERE id NOT IN (SELECT DISTINCT domain_id FROM elements WHERE domain_id IS NOT NULL)`).run();
      db.prepare('DELETE FROM reasoning_summaries').run();
      db.prepare('DELETE FROM process_steps').run();
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
