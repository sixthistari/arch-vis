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
// Migrations: add columns to existing databases
// SQLite has no ADD COLUMN IF NOT EXISTS, so catch duplicate-column errors silently
// ═══════════════════════════════════════

const migrations = [
  "ALTER TABLE elements ADD COLUMN created_by TEXT DEFAULT 'manual'",
  "ALTER TABLE elements ADD COLUMN source TEXT DEFAULT 'manual'",
  "ALTER TABLE relationships ADD COLUMN created_by TEXT DEFAULT 'manual'",
  "ALTER TABLE relationships ADD COLUMN source TEXT DEFAULT 'manual'",
  "ALTER TABLE relationships ADD COLUMN updated_at TEXT DEFAULT NULL",
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (err: unknown) {
    // Ignore "duplicate column name" errors — column already exists
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('duplicate column')) {
      throw err;
    }
  }
}

// ═══════════════════════════════════════
// Migration: update views table CHECK constraint for new viewpoint types
// SQLite cannot ALTER CHECK constraints — must recreate the table
// ═══════════════════════════════════════

try {
  // Check if the current CHECK constraint is missing new types
  const testStmt = db.prepare("INSERT INTO views (id, name, viewpoint_type) VALUES ('__test_migration__', '__test__', 'uml_sequence')");
  try {
    testStmt.run();
    // If it succeeded, constraint already allows it — clean up
    db.prepare("DELETE FROM views WHERE id = '__test_migration__'").run();
  } catch {
    // Constraint rejected it — need to recreate the table
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
  }
} catch {
  // Migration already applied or table structure differs — skip
}

// Same for relationships CHECK constraint (new UML message types)
try {
  const testRel = db.prepare("INSERT INTO relationships (id, archimate_type, source_id, target_id) VALUES ('__test_rel_migration__', 'uml-sync-message', '__fake__', '__fake__')");
  try {
    testRel.run();
    db.prepare("DELETE FROM relationships WHERE id = '__test_rel_migration__'").run();
  } catch {
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
  }
} catch {
  // Migration already applied or skip
}

export default db;
