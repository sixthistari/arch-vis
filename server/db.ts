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

export default db;
