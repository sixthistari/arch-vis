import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const DB_PATH = resolve(PROJECT_ROOT, 'data', 'arch-vis.db');
const SCHEMA_PATH = resolve(PROJECT_ROOT, 'schema', 'schema.sql');

const db = new Database(DB_PATH);

// WAL mode for concurrent read performance; enforce foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Execute the full schema (CREATE IF NOT EXISTS, so safe to re-run)
const schemaSql = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schemaSql);

// ═══════════════════════════════════════
// Schema version tracking
// ═══════════════════════════════════════

db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0)');
const versionRow = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
if (!versionRow) {
  db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
}
let currentVersion = versionRow?.version ?? 0;

// ═══════════════════════════════════════
// Versioned migrations
// Each entry: [version_number, migration_fn]
// Migrations run in a transaction; version updates after success
// ═══════════════════════════════════════

type MigrationEntry = [number, () => void];

const versionedMigrations: MigrationEntry[] = [
  // Version 1: add created_by / source columns to elements and relationships
  [1, () => {
    const alters = [
      "ALTER TABLE elements ADD COLUMN created_by TEXT DEFAULT 'manual'",
      "ALTER TABLE elements ADD COLUMN source TEXT DEFAULT 'manual'",
      "ALTER TABLE relationships ADD COLUMN created_by TEXT DEFAULT 'manual'",
      "ALTER TABLE relationships ADD COLUMN source TEXT DEFAULT 'manual'",
      "ALTER TABLE relationships ADD COLUMN updated_at TEXT DEFAULT NULL",
    ];
    for (const sql of alters) {
      try {
        db.exec(sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('duplicate column')) throw err;
      }
    }
  }],

  // Version 2: update views CHECK constraint for UML/wireframe viewpoint types
  [2, () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS views_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        viewpoint_type TEXT NOT NULL CHECK(viewpoint_type IN (
          'layered','knowledge_cognition','domain_slice','governance_matrix',
          'process_detail','infrastructure','information','application_landscape','custom',
          'uml_class','uml_component','wireframe',
          'uml_sequence','uml_activity','uml_usecase'
        )),
        description TEXT,
        render_mode TEXT DEFAULT 'spatial' CHECK(render_mode IN ('flat','spatial')),
        filter_domain TEXT,
        filter_layers JSON,
        filter_specialisations JSON,
        rotation_default JSON,
        is_preset INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO views_new SELECT * FROM views;
      DROP TABLE views;
      ALTER TABLE views_new RENAME TO views;
    `);
  }],

  // Version 3: update relationships CHECK constraint for UML message types
  [3, () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships_new (
        id TEXT PRIMARY KEY,
        archimate_type TEXT NOT NULL CHECK(archimate_type IN (
          'composition','aggregation','assignment','realisation','serving',
          'access','influence','triggering','flow','specialisation','association',
          'uml-inheritance','uml-realisation','uml-composition','uml-aggregation',
          'uml-association','uml-dependency','uml-assembly',
          'wf-contains','wf-navigates-to','wf-binds-to',
          'uml-sync-message','uml-async-message','uml-return-message',
          'uml-create-message','uml-destroy-message','uml-self-message'
        )),
        specialisation TEXT,
        source_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
        label TEXT,
        description TEXT,
        properties JSON,
        confidence REAL,
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT DEFAULT 'manual',
        source TEXT DEFAULT 'manual',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO relationships_new SELECT id, archimate_type, specialisation, source_id, target_id, label, description, properties, confidence, created_at, created_by, source, updated_at FROM relationships;
      DROP TABLE relationships;
      ALTER TABLE relationships_new RENAME TO relationships;
      CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_id);
    `);
  }],
  // Version 4: add z_index column to view_elements
  [4, () => {
    try {
      db.exec("ALTER TABLE view_elements ADD COLUMN z_index INTEGER DEFAULT 0");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate column')) throw err;
    }
  }],
  // Version 5: add folder column to elements for user sub-folders in model tree
  [5, () => {
    try {
      db.exec("ALTER TABLE elements ADD COLUMN folder TEXT DEFAULT NULL");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate column')) throw err;
    }
  }],
  // Version 6: add pf-* relationship types and process_flow viewpoint
  [6, () => {
    // Recreate relationships table with expanded CHECK constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS relationships_new (
        id TEXT PRIMARY KEY,
        archimate_type TEXT NOT NULL CHECK(archimate_type IN (
          'composition','aggregation','assignment','realisation','serving',
          'access','influence','triggering','flow','specialisation','association',
          'uml-inheritance','uml-realisation','uml-composition','uml-aggregation',
          'uml-association','uml-dependency','uml-assembly',
          'uml-sync-message','uml-async-message','uml-return-message',
          'uml-create-message','uml-destroy-message','uml-self-message',
          'wf-contains','wf-navigates-to','wf-binds-to',
          'pf-sequence-flow','pf-conditional-flow','pf-error-flow'
        )),
        specialisation TEXT,
        source_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
        label TEXT,
        description TEXT,
        properties JSON,
        confidence REAL,
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT DEFAULT 'manual',
        source TEXT DEFAULT 'manual',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO relationships_new SELECT id, archimate_type, specialisation, source_id, target_id, label, description, properties, confidence, created_at, created_by, source, updated_at FROM relationships;
      DROP TABLE relationships;
      ALTER TABLE relationships_new RENAME TO relationships;
      CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_id);
    `);
    // Recreate views table with process_flow viewpoint
    db.exec(`
      CREATE TABLE IF NOT EXISTS views_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        viewpoint_type TEXT NOT NULL CHECK(viewpoint_type IN (
          'layered','knowledge_cognition','domain_slice','governance_matrix',
          'process_detail','infrastructure','information','application_landscape','custom',
          'uml_class','uml_component','wireframe',
          'uml_sequence','uml_activity','uml_usecase',
          'process_flow'
        )),
        description TEXT,
        render_mode TEXT DEFAULT 'spatial' CHECK(render_mode IN ('flat','spatial')),
        filter_domain TEXT,
        filter_layers JSON,
        filter_specialisations JSON,
        rotation_default JSON,
        is_preset INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO views_new SELECT * FROM views;
      DROP TABLE views;
      ALTER TABLE views_new RENAME TO views;
    `);
  }],
];

for (const [version, migrate] of versionedMigrations) {
  if (currentVersion >= version) continue;
  db.transaction(() => {
    migrate();
    db.prepare('UPDATE schema_version SET version = ?').run(version);
  })();
  currentVersion = version;
}

export default db;
