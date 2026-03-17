import { Router, Request, Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const router = Router();

// GET /api/uat/report — UAT verification summary
router.get('/uat/report', (_req: Request, res: Response) => {
  if (!existsSync(LOG_PATH)) {
    res.json({
      total: 0,
      passed: 0,
      failed: 0,
      recentFailures: [],
    });
    return;
  }

  const lines = readFileSync(LOG_PATH, 'utf-8').trim().split('\n').filter(Boolean);
  const entries: LogEntry[] = [];
  let parseErrors = 0;
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as LogEntry);
    } catch {
      parseErrors++;
    }
  }

  const total = entries.length;
  const passed = entries.filter(e => e.passed).length;
  const failed = total - passed;

  // Recent failures — last 20
  const recentFailures = entries
    .filter(e => !e.passed)
    .slice(-20)
    .map(e => ({
      ts: e.ts,
      method: e.method,
      path: e.path,
      failedChecks: e.checks.filter(c => !c.pass),
    }));

  // Breakdown by operation
  const byOperation: Record<string, { total: number; passed: number }> = {};
  for (const entry of entries) {
    const key = `${entry.method} ${entry.path.replace(/\/[0-9a-f-]{36}/g, '/:id')}`;
    if (!byOperation[key]) byOperation[key] = { total: 0, passed: 0 };
    byOperation[key].total++;
    if (entry.passed) byOperation[key].passed++;
  }

  res.json({
    total,
    passed,
    failed,
    parseErrors,
    byOperation,
    recentFailures,
  });
});

export default router;
