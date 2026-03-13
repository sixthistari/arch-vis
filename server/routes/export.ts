import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const router = Router();

// GET /api/sublayer-config — read sublayer-config.yaml and return as JSON
router.get('/sublayer-config', (_req: Request, res: Response) => {
  const configPath = resolve(PROJECT_ROOT, 'reference', 'sublayer-config.yaml');
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(raw);
  res.json(parsed);
});

// GET /api/valid-relationships — return all rows from valid_relationships table
router.get('/valid-relationships', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM valid_relationships').all();
  res.json(rows);
});

export default router;
