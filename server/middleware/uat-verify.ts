import { Request, Response, NextFunction } from 'express';
import { appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '..', '..', 'data', 'uat-log.jsonl');

interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

interface LogEntry {
  ts: string;
  method: string;
  path: string;
  status: number;
  checks: CheckResult[];
  passed: boolean;
}

function log(entry: LogEntry): void {
  appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

function rowExists(table: string, id: string): boolean {
  const row = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
  return row != null;
}

function verifyCreateElement(body: Record<string, unknown>, resBody: Record<string, unknown>): CheckResult[] {
  const checks: CheckResult[] = [];
  const id = resBody.id as string;

  checks.push({ name: 'row_exists', pass: rowExists('elements', id) });

  // Verify key fields match payload
  const row = db.prepare('SELECT * FROM elements WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (row) {
    const nameMatch = row.name === (body.name ?? resBody.name);
    checks.push({ name: 'name_matches', pass: nameMatch, detail: nameMatch ? undefined : `expected "${body.name}", got "${row.name}"` });
    const typeMatch = row.archimate_type === (body.archimate_type ?? resBody.archimate_type);
    checks.push({ name: 'type_matches', pass: typeMatch });
  }

  return checks;
}

function verifyUpdateElement(id: string): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push({ name: 'row_exists', pass: rowExists('elements', id) });

  const row = db.prepare('SELECT updated_at FROM elements WHERE id = ?').get(id) as { updated_at: string } | undefined;
  checks.push({ name: 'updated_at_set', pass: row?.updated_at != null });

  return checks;
}

function verifyDeleteElement(id: string): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push({ name: 'row_gone', pass: !rowExists('elements', id) });

  // Check cascades
  const relCount = (db.prepare('SELECT COUNT(*) as cnt FROM relationships WHERE source_id = ? OR target_id = ?').get(id, id) as { cnt: number }).cnt;
  checks.push({ name: 'relationships_cascaded', pass: relCount === 0, detail: relCount > 0 ? `${relCount} orphaned relationships` : undefined });

  const veCount = (db.prepare('SELECT COUNT(*) as cnt FROM view_elements WHERE element_id = ?').get(id) as { cnt: number }).cnt;
  checks.push({ name: 'view_elements_cascaded', pass: veCount === 0, detail: veCount > 0 ? `${veCount} orphaned view_elements` : undefined });

  return checks;
}

function verifyCreateRelationship(resBody: Record<string, unknown>): CheckResult[] {
  const checks: CheckResult[] = [];
  const id = resBody.id as string;

  checks.push({ name: 'row_exists', pass: rowExists('relationships', id) });

  // Verify source and target exist
  const sourceId = resBody.source_id as string;
  const targetId = resBody.target_id as string;
  checks.push({ name: 'source_exists', pass: rowExists('elements', sourceId) });
  checks.push({ name: 'target_exists', pass: rowExists('elements', targetId) });

  return checks;
}

function verifyUpdateRelationship(id: string): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push({ name: 'row_exists', pass: rowExists('relationships', id) });

  const row = db.prepare('SELECT updated_at, source_id, target_id FROM relationships WHERE id = ?').get(id) as
    { updated_at: string; source_id: string; target_id: string } | undefined;
  checks.push({ name: 'updated_at_set', pass: row?.updated_at != null });
  if (row) {
    checks.push({ name: 'source_exists', pass: rowExists('elements', row.source_id) });
    checks.push({ name: 'target_exists', pass: rowExists('elements', row.target_id) });
  }

  return checks;
}

function verifyDeleteRelationship(id: string): CheckResult[] {
  return [{ name: 'row_gone', pass: !rowExists('relationships', id) }];
}

function verifyCreateView(resBody: Record<string, unknown>): CheckResult[] {
  const checks: CheckResult[] = [];
  const id = resBody.id as string;

  checks.push({ name: 'row_exists', pass: rowExists('views', id) });

  const row = db.prepare('SELECT viewpoint_type FROM views WHERE id = ?').get(id) as { viewpoint_type: string | null } | undefined;
  checks.push({ name: 'viewpoint_type_set', pass: row?.viewpoint_type != null });

  return checks;
}

function verifyCreateProcessStep(resBody: Record<string, unknown>): CheckResult[] {
  const checks: CheckResult[] = [];
  const id = resBody.id as string | undefined;
  if (!id) return [{ name: 'response_has_id', pass: false, detail: 'No id in response' }];

  checks.push({ name: 'row_exists', pass: rowExists('process_steps', id) });

  // Verify linked element was created
  const elementId = resBody.element_id as string | undefined;
  if (elementId) {
    checks.push({ name: 'linked_element_exists', pass: rowExists('elements', elementId) });
  }

  return checks;
}

function verifyUpdateProcessStep(id: string): CheckResult[] {
  return [{ name: 'row_exists', pass: rowExists('process_steps', id) }];
}

function verifyDeleteProcessStep(id: string): CheckResult[] {
  return [{ name: 'row_gone', pass: !rowExists('process_steps', id) }];
}

function verifyUpdateViewElements(viewId: string): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push({ name: 'view_exists', pass: rowExists('views', viewId) });

  const veCount = (db.prepare('SELECT COUNT(*) as cnt FROM view_elements WHERE view_id = ?').get(viewId) as { cnt: number }).cnt;
  checks.push({ name: 'view_has_elements', pass: veCount > 0, detail: `${veCount} view_elements` });

  return checks;
}

/** Express middleware — intercepts POST/PUT/DELETE responses and runs verification */
export function uatVerifyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only intercept mutation methods
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  // Capture original json method to read response body
  const originalJson = res.json.bind(res);
  let capturedBody: unknown = undefined;

  res.json = function (body: unknown) {
    capturedBody = body;
    return originalJson(body);
  };

  // Run verification after response is sent
  res.on('finish', () => {
    try {
      const path = req.originalUrl.replace(/\?.*$/, '');
      const method = req.method;
      const status = res.statusCode;

      // Only verify successful mutations
      if (status >= 400) return;

      let checks: CheckResult[] = [];
      const body = req.body as Record<string, unknown>;
      const resBody = (capturedBody ?? {}) as Record<string, unknown>;

      // Route-specific verification
      if (method === 'POST' && /^\/api\/elements\/?$/.test(path)) {
        checks = verifyCreateElement(body, resBody);
      } else if (method === 'PUT' && /^\/api\/elements\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyUpdateElement(decodeURIComponent(id));
      } else if (method === 'DELETE' && /^\/api\/elements\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyDeleteElement(decodeURIComponent(id));
      } else if (method === 'POST' && /^\/api\/relationships\/?$/.test(path)) {
        checks = verifyCreateRelationship(resBody);
      } else if (method === 'PUT' && /^\/api\/relationships\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyUpdateRelationship(decodeURIComponent(id));
      } else if (method === 'DELETE' && /^\/api\/relationships\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyDeleteRelationship(decodeURIComponent(id));
      } else if (method === 'POST' && /^\/api\/views\/?$/.test(path)) {
        checks = verifyCreateView(resBody);
      } else if (method === 'PUT' && /^\/api\/views\/[^/]+\/elements\/?$/.test(path)) {
        const segments = path.split('/');
        const viewId = decodeURIComponent(segments[segments.indexOf('views') + 1] ?? '');
        checks = verifyUpdateViewElements(viewId);
      } else if (method === 'POST' && /^\/api\/process-steps\/?$/.test(path)) {
        checks = verifyCreateProcessStep(resBody);
      } else if (method === 'PUT' && /^\/api\/process-steps\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyUpdateProcessStep(decodeURIComponent(id));
      } else if (method === 'DELETE' && /^\/api\/process-steps\/[^/]+$/.test(path)) {
        const id = path.split('/').pop()!;
        checks = verifyDeleteProcessStep(decodeURIComponent(id));
      }

      if (checks.length > 0) {
        log({
          ts: new Date().toISOString(),
          method,
          path,
          status,
          checks,
          passed: checks.every(c => c.pass),
        });
      }
    } catch (err) {
      console.error('[uat-verify] Verification error:', err);
    }
  });

  next();
}
