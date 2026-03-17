import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Seed-data JSON shape types
// ---------------------------------------------------------------------------

interface SeedDomain {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  maturity?: string;
  autonomy_ceiling?: string;
  track_default?: string;
  owner_role?: string;
}

interface SeedElement {
  id: string;
  name: string;
  archimate_type: string;
  specialisation?: string;
  layer: string;
  sublayer?: string;
  domain_id?: string;
  status?: string;
  description?: string;
  properties?: Record<string, unknown>;
  parent_id?: string;
}

interface SeedRelationship {
  id: string;
  archimate_type: string;
  specialisation?: string;
  source_id: string;
  target_id: string;
  label?: string;
  description?: string;
  properties?: Record<string, unknown>;
}

interface SeedView {
  id: string;
  name: string;
  viewpoint_type: string;
  description?: string;
  render_mode?: string;
  filter_domain?: string;
  filter_layers?: string[];
  filter_specialisations?: string[];
  rotation_default?: Record<string, number>;
  is_preset?: number;
  /** Explicit element inclusion list — overrides auto-filter when present. */
  element_ids?: string[];
  /** Explicit element positions — overrides element_ids when present. */
  element_positions?: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonOrNull(val: unknown): string | null {
  return val != null ? JSON.stringify(val) : null;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export default function seed(): void {
  // Always load the valid relationship matrix (idempotent via INSERT OR IGNORE)
  const validRelSql = readFileSync(resolve(PROJECT_ROOT, 'data', 'valid-relationships.sql'), 'utf-8');
  db.exec(validRelSql);
  const vrMatrixCount = (db.prepare('SELECT COUNT(*) AS cnt FROM valid_relationships').get() as { cnt: number }).cnt;
  console.log(`[seed] Loaded ${vrMatrixCount} valid relationship rules`);

  // Skip main seed data if already present
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM elements').get() as { cnt: number };
  if (row.cnt > 0) {
    console.log('[seed] Data already present — skipping seed.');
    return;
  }

  const elementsFile = JSON.parse(
    readFileSync(resolve(PROJECT_ROOT, 'data', 'seed-elements.json'), 'utf-8'),
  ) as { domains: SeedDomain[]; elements: SeedElement[] };

  const relationshipsFile = JSON.parse(
    readFileSync(resolve(PROJECT_ROOT, 'data', 'seed-relationships.json'), 'utf-8'),
  ) as { relationships: SeedRelationship[] };

  const viewsFile = JSON.parse(
    readFileSync(resolve(PROJECT_ROOT, 'data', 'seed-views.json'), 'utf-8'),
  ) as { views: SeedView[] };

  const insertAll = db.transaction(() => {
    // 0. Ensure default project exists
    db.prepare(`
      INSERT OR IGNORE INTO projects (id, name, description)
      VALUES ('proj-default', 'Default Project', 'Auto-created default project')
    `).run();

    // 1. Domains
    const insertDomain = db.prepare(`
      INSERT INTO domains (id, name, description, priority, maturity, autonomy_ceiling, track_default, owner_role)
      VALUES (@id, @name, @description, @priority, @maturity, @autonomy_ceiling, @track_default, @owner_role)
    `);
    for (const d of elementsFile.domains) {
      insertDomain.run({
        id: d.id,
        name: d.name,
        description: d.description ?? null,
        priority: d.priority ?? null,
        maturity: d.maturity ?? null,
        autonomy_ceiling: d.autonomy_ceiling ?? null,
        track_default: d.track_default ?? null,
        owner_role: d.owner_role ?? null,
      });
    }

    // 2. Elements
    const insertElement = db.prepare(`
      INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer, domain_id, status, description, properties, parent_id, project_id, area)
      VALUES (@id, @name, @archimate_type, @specialisation, @layer, @sublayer, @domain_id, @status, @description, @properties, @parent_id, @project_id, @area)
    `);
    for (const e of elementsFile.elements) {
      insertElement.run({
        id: e.id,
        name: e.name,
        archimate_type: e.archimate_type,
        specialisation: e.specialisation ?? null,
        layer: e.layer,
        sublayer: e.sublayer ?? null,
        domain_id: e.domain_id ?? null,
        status: e.status ?? 'active',
        description: e.description ?? null,
        properties: jsonOrNull(e.properties),
        parent_id: e.parent_id ?? null,
        project_id: 'proj-default',
        area: 'governed',
      });
    }

    // 3. Relationships
    const insertRel = db.prepare(`
      INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id, label, description, properties, project_id, area)
      VALUES (@id, @archimate_type, @specialisation, @source_id, @target_id, @label, @description, @properties, @project_id, @area)
    `);
    for (const r of relationshipsFile.relationships) {
      insertRel.run({
        id: r.id,
        archimate_type: r.archimate_type,
        specialisation: r.specialisation ?? null,
        source_id: r.source_id,
        target_id: r.target_id,
        label: r.label ?? null,
        description: r.description ?? null,
        properties: jsonOrNull(r.properties),
        project_id: 'proj-default',
        area: 'governed',
      });
    }

    // 4. Views
    const insertView = db.prepare(`
      INSERT INTO views (id, name, viewpoint_type, description, render_mode, filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset, project_id, area)
      VALUES (@id, @name, @viewpoint_type, @description, @render_mode, @filter_domain, @filter_layers, @filter_specialisations, @rotation_default, @is_preset, @project_id, @area)
    `);
    for (const v of viewsFile.views) {
      insertView.run({
        id: v.id,
        name: v.name,
        viewpoint_type: v.viewpoint_type,
        description: v.description ?? null,
        render_mode: v.render_mode ?? 'spatial',
        filter_domain: v.filter_domain ?? null,
        filter_layers: jsonOrNull(v.filter_layers),
        filter_specialisations: jsonOrNull(v.filter_specialisations),
        rotation_default: jsonOrNull(v.rotation_default),
        is_preset: v.is_preset ?? 0,
        project_id: 'proj-default',
        area: 'governed',
      });
    }

    // 5. Auto-populate view_elements and view_relationships for preset views
    const insertVE = db.prepare(`
      INSERT INTO view_elements (view_id, element_id) VALUES (@view_id, @element_id)
    `);
    const insertVEPos = db.prepare(`
      INSERT INTO view_elements (view_id, element_id, x, y, width, height) VALUES (@view_id, @element_id, @x, @y, @width, @height)
    `);
    const insertVR = db.prepare(`
      INSERT INTO view_relationships (view_id, relationship_id) VALUES (@view_id, @relationship_id)
    `);

    // Viewpoint → archimate_type mapping for UML views
    const viewpointTypeFilter: Record<string, string[]> = {
      uml_class: ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum'],
      uml_component: ['uml-component'],
      uml_usecase: ['uml-actor', 'uml-use-case'],
      uml_sequence: ['uml-lifeline', 'uml-activation', 'uml-fragment'],
      uml_activity: ['uml-activity', 'uml-state', 'uml-action', 'uml-decision', 'uml-merge', 'uml-fork', 'uml-join', 'uml-initial-node', 'uml-final-node', 'uml-flow-final'],
      process_flow: ['pf-start', 'pf-end', 'pf-human-task', 'pf-agent-task', 'pf-system-call', 'pf-decision', 'pf-gateway', 'pf-approval-gate', 'pf-timer', 'pf-swimlane', 'pf-subprocess'],
      process_detail: ['pf-start', 'pf-end', 'pf-human-task', 'pf-agent-task', 'pf-system-call', 'pf-decision', 'pf-gateway', 'pf-approval-gate', 'pf-timer', 'pf-swimlane', 'pf-subprocess'],
      data_conceptual: ['dm-entity', 'dm-attribute'],
      data_logical: ['dm-entity', 'dm-table', 'dm-attribute', 'dm-column', 'dm-primary-key', 'dm-foreign-key'],
      data_physical: ['dm-table', 'dm-column', 'dm-primary-key', 'dm-foreign-key', 'dm-index'],
    };

    for (const v of viewsFile.views) {
      if (!v.is_preset) continue;

      let elementIds: Set<string>;
      const positionMap = new Map<string, { x: number; y: number }>();

      if (v.element_positions && v.element_positions.length > 0) {
        // Explicit positions — use directly (verify they exist)
        const allIds = new Set(
          (db.prepare('SELECT id FROM elements').all() as { id: string }[]).map(e => e.id),
        );
        elementIds = new Set<string>();
        for (const ep of v.element_positions) {
          if (allIds.has(ep.id)) {
            elementIds.add(ep.id);
            positionMap.set(ep.id, { x: ep.x, y: ep.y, ...(ep.width != null && { width: ep.width }), ...(ep.height != null && { height: ep.height }) });
          }
        }
      } else if (v.element_ids && v.element_ids.length > 0) {
        // Explicit element list without positions
        const allIds = new Set(
          (db.prepare('SELECT id FROM elements').all() as { id: string }[]).map(e => e.id),
        );
        elementIds = new Set(v.element_ids.filter(id => allIds.has(id)));
      } else {
        // Build the element filter query dynamically
        const conditions: string[] = [];
        const params: Record<string, string> = {};

        // UML viewpoint type filter takes precedence
        const umlTypes = viewpointTypeFilter[v.viewpoint_type];
        if (umlTypes) {
          const placeholders = umlTypes.map((_, i) => `@umlType${i}`).join(', ');
          conditions.push(`archimate_type IN (${placeholders})`);
          umlTypes.forEach((t, i) => {
            params[`umlType${i}`] = t;
          });
        } else {
          // ArchiMate viewpoints exclude UML, wireframe, and data-model elements
          const archimateViewpoints = [
            'layered', 'knowledge_cognition', 'domain_slice', 'governance_matrix',
            'process_detail', 'infrastructure', 'information', 'application_landscape',
          ];
          if (archimateViewpoints.includes(v.viewpoint_type)) {
            conditions.push("archimate_type NOT LIKE 'uml-%'");
            conditions.push("archimate_type NOT LIKE 'wf-%'");
            conditions.push("archimate_type NOT LIKE 'dm-%'");
            conditions.push("archimate_type NOT LIKE 'pf-%'");
          }

          if (v.filter_domain) {
            conditions.push('domain_id = @domain');
            params['domain'] = v.filter_domain;
          }

          if (v.filter_layers && v.filter_layers.length > 0) {
            const placeholders = v.filter_layers.map((_, i) => `@layer${i}`).join(', ');
            conditions.push(`layer IN (${placeholders})`);
            v.filter_layers.forEach((layer, i) => {
              params[`layer${i}`] = layer;
            });
          }

          // Specialisation filter: ["*"] = any non-null specialisation, or specific values
          if (v.filter_specialisations && v.filter_specialisations.length > 0) {
            if (v.filter_specialisations.length === 1 && v.filter_specialisations[0] === '*') {
              conditions.push('specialisation IS NOT NULL');
            } else {
              const placeholders = v.filter_specialisations.map((_, i) => `@spec${i}`).join(', ');
              conditions.push(`specialisation IN (${placeholders})`);
              v.filter_specialisations.forEach((s, i) => {
                params[`spec${i}`] = s;
              });
            }
          }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const matchingElements = db.prepare(`SELECT id FROM elements ${whereClause}`).all(params) as { id: string }[];
        elementIds = new Set(matchingElements.map((e) => e.id));
      }

      for (const eid of elementIds) {
        const pos = positionMap.get(eid) as { x: number; y: number; width?: number; height?: number } | undefined;
        if (pos) {
          insertVEPos.run({ view_id: v.id, element_id: eid, x: pos.x, y: pos.y, width: pos.width ?? null, height: pos.height ?? null });
        } else {
          insertVE.run({ view_id: v.id, element_id: eid });
        }
      }

      // Auto-populate relationships where both endpoints are in the view
      const allRels = db.prepare('SELECT id, source_id, target_id FROM relationships').all() as {
        id: string;
        source_id: string;
        target_id: string;
      }[];

      for (const rel of allRels) {
        if (elementIds.has(rel.source_id) && elementIds.has(rel.target_id)) {
          insertVR.run({ view_id: v.id, relationship_id: rel.id });
        }
      }
    }
  });

  insertAll();

  const domainCount = (db.prepare('SELECT COUNT(*) AS cnt FROM domains').get() as { cnt: number }).cnt;
  const elementCount = (db.prepare('SELECT COUNT(*) AS cnt FROM elements').get() as { cnt: number }).cnt;
  const relCount = (db.prepare('SELECT COUNT(*) AS cnt FROM relationships').get() as { cnt: number }).cnt;
  const viewCount = (db.prepare('SELECT COUNT(*) AS cnt FROM views').get() as { cnt: number }).cnt;
  const veCount = (db.prepare('SELECT COUNT(*) AS cnt FROM view_elements').get() as { cnt: number }).cnt;
  const vrCount = (db.prepare('SELECT COUNT(*) AS cnt FROM view_relationships').get() as { cnt: number }).cnt;

  console.log(`[seed] Loaded ${domainCount} domains, ${elementCount} elements, ${relCount} relationships, ${viewCount} views`);
  console.log(`[seed] Auto-populated ${veCount} view_elements, ${vrCount} view_relationships`);
}
