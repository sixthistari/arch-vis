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
      INSERT INTO elements (id, name, archimate_type, specialisation, layer, sublayer, domain_id, status, description, properties, parent_id)
      VALUES (@id, @name, @archimate_type, @specialisation, @layer, @sublayer, @domain_id, @status, @description, @properties, @parent_id)
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
      });
    }

    // 3. Relationships
    const insertRel = db.prepare(`
      INSERT INTO relationships (id, archimate_type, specialisation, source_id, target_id, label, description, properties)
      VALUES (@id, @archimate_type, @specialisation, @source_id, @target_id, @label, @description, @properties)
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
      });
    }

    // 4. Views
    const insertView = db.prepare(`
      INSERT INTO views (id, name, viewpoint_type, description, render_mode, filter_domain, filter_layers, filter_specialisations, rotation_default, is_preset)
      VALUES (@id, @name, @viewpoint_type, @description, @render_mode, @filter_domain, @filter_layers, @filter_specialisations, @rotation_default, @is_preset)
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
      });
    }

    // 5. Auto-populate view_elements and view_relationships for preset views
    const insertVE = db.prepare(`
      INSERT INTO view_elements (view_id, element_id) VALUES (@view_id, @element_id)
    `);
    const insertVR = db.prepare(`
      INSERT INTO view_relationships (view_id, relationship_id) VALUES (@view_id, @relationship_id)
    `);

    for (const v of viewsFile.views) {
      if (!v.is_preset) continue;

      // Build the element filter query dynamically
      const conditions: string[] = [];
      const params: Record<string, string> = {};

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

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const matchingElements = db.prepare(`SELECT id FROM elements ${whereClause}`).all(params) as { id: string }[];

      const elementIds = new Set(matchingElements.map((e) => e.id));

      for (const eid of elementIds) {
        insertVE.run({ view_id: v.id, element_id: eid });
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
