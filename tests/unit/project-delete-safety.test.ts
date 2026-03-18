/**
 * Unit tests for project deletion safety fixes.
 *
 * Verifies four specific fixes:
 *  1. proj-default cannot be deleted (returns 400)
 *  2. Null safety on project switch after delete
 *  3. Import no longer globally deletes other projects' data
 *  4. /api/model/reset is now project-scoped
 *
 * Requires a running API server at 192.168.10.150:3001.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://192.168.10.150:3001/api';
const RUN = Date.now().toString(36);

const cleanupProjectIds: string[] = [];
const cleanupElementIds: string[] = [];

async function json(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createProject(name: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: `Test project ${name}` }),
  });
  expect(res.status).toBe(201);
  const project = await json(res);
  cleanupProjectIds.push(project.id);
  return project;
}

async function createElement(projectId: string, suffix: string): Promise<string> {
  const id = `el-unit-${RUN}-${suffix}`;
  const res = await fetch(`${BASE}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name: `Unit Element ${suffix}`,
      archimate_type: 'application-component',
      layer: 'application',
      specialisation: null,
      project_id: projectId,
    }),
  });
  expect(res.status).toBe(201);
  cleanupElementIds.push(id);
  return id;
}

async function switchProject(projectId: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: projectId }),
  });
  expect(res.ok).toBe(true);
}

async function getElementCount(projectId: string): Promise<number> {
  const res = await fetch(`${BASE}/elements?project_id=${encodeURIComponent(projectId)}`);
  const data = await json(res) as unknown[];
  return data.length;
}

// ═══════════════════════════════════════
// Setup and cleanup
// ═══════════════════════════════════════

beforeAll(async () => {
  // Clean up any stale test projects from prior runs
  const projectsRes = await fetch(`${BASE}/projects`);
  const allProjects = await json(projectsRes) as { id: string; name: string }[];
  for (const p of allProjects) {
    if (p.id !== 'proj-default') {
      await fetch(`${BASE}/projects/${encodeURIComponent(p.id)}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  // Ensure default project is current and has seed data
  await fetch(`${BASE}/projects/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'proj-default' }),
  });
  const resetRes = await fetch(`${BASE}/model/reset?seed=true`, { method: 'POST' });
  const resetBody = await json(resetRes);
  if (!resetRes.ok || !resetBody?.success) {
    throw new Error(`Failed to seed default project: ${JSON.stringify(resetBody)}`);
  }
}, 10_000);

afterAll(async () => {
  for (const id of cleanupElementIds) {
    await fetch(`${BASE}/elements/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of cleanupProjectIds) {
    await fetch(`${BASE}/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
  // Restore default project as current and reseed to leave DB clean
  await fetch(`${BASE}/projects/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'proj-default' }),
  }).catch(() => {});
  await fetch(`${BASE}/model/reset?seed=true`, { method: 'POST' }).catch(() => {});
});

// ═══════════════════════════════════════
// Fix 1: proj-default cannot be deleted
// ═══════════════════════════════════════

describe('Fix 1: proj-default cannot be deleted', () => {
  it('DELETE /api/projects/proj-default returns 400', async () => {
    const res = await fetch(`${BASE}/projects/proj-default`, { method: 'DELETE' });
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toMatch(/cannot delete the default project/i);
  });

  it('proj-default still exists after rejected delete', async () => {
    const res = await fetch(`${BASE}/projects`);
    const projects = await json(res) as { id: string }[];
    expect(projects.some(p => p.id === 'proj-default')).toBe(true);
  });

  it('proj-default data is intact after rejected delete', async () => {
    const count = await getElementCount('proj-default');
    expect(count).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
// Fix 2: Null safety on project switch after delete
// ═══════════════════════════════════════

describe('Fix 2: preferences point to valid project after delete', () => {
  it('deleting the current project switches preference to a valid project', async () => {
    // Create and switch to a temp project
    const proj = await createProject(`Switch Safety ${RUN}`);
    await switchProject(proj.id);

    // Verify it is current
    const beforeRes = await fetch(`${BASE}/projects/current`);
    const before = await json(beforeRes);
    expect(before.id).toBe(proj.id);

    // Delete it
    const delRes = await fetch(`${BASE}/projects/${encodeURIComponent(proj.id)}`, { method: 'DELETE' });
    expect(delRes.status).toBe(204);

    // Remove from cleanup
    const idx = cleanupProjectIds.indexOf(proj.id);
    if (idx !== -1) cleanupProjectIds.splice(idx, 1);

    // Current project must now be a different, existing project
    const afterRes = await fetch(`${BASE}/projects/current`);
    expect(afterRes.ok).toBe(true);
    const after = await json(afterRes);
    expect(after.id).not.toBe(proj.id);
    expect(after.id).toBeTruthy();

    // That project must actually exist
    const projectsRes = await fetch(`${BASE}/projects`);
    const projects = await json(projectsRes) as { id: string }[];
    expect(projects.some(p => p.id === after.id)).toBe(true);
  });
});

// ═══════════════════════════════════════
// Fix 3: Import is project-scoped (does not globally delete)
// ═══════════════════════════════════════

describe('Fix 3: import does not wipe other projects', () => {
  it('importing into project A does not delete project B elements', async () => {
    // Create two projects with their own data
    const projA = await createProject(`Import A ${RUN}`);
    const projB = await createProject(`Import B ${RUN}`);

    await createElement(projA.id, 'import-a');
    const elB = await createElement(projB.id, 'import-b');

    // Snapshot default project element count before import
    const defaultCountBefore = await getElementCount('proj-default');

    // Switch to project A and import a minimal model (replaces A's data)
    await switchProject(projA.id);
    const importRes = await fetch(`${BASE}/import/model-full?project_id=${encodeURIComponent(projA.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        elements: [{
          id: `el-unit-${RUN}-imported`,
          name: 'Imported Element',
          archimate_type: 'application-component',
          specialisation: null,
          layer: 'application',
          sublayer: null,
          domain_id: null,
          status: 'active',
          description: null,
          properties: null,
          confidence: null,
          source_session_id: null,
          parent_id: null,
          created_by: 'test',
          source: null,
          folder: null,
          project_id: projA.id,
          area: 'working',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        relationships: [],
        views: [],
        viewElements: [],
        viewRelationships: [],
      }),
    });
    expect(importRes.ok).toBe(true);
    cleanupElementIds.push(`el-unit-${RUN}-imported`);

    // Remove the original projA element from cleanup (import replaced it)
    const origIdx = cleanupElementIds.indexOf(`el-unit-${RUN}-import-a`);
    if (origIdx !== -1) cleanupElementIds.splice(origIdx, 1);

    // Project B element must still exist
    const bCount = await getElementCount(projB.id);
    expect(bCount).toBe(1);

    // Verify the specific element
    const bRes = await fetch(`${BASE}/elements?project_id=${encodeURIComponent(projB.id)}`);
    const bElements = await json(bRes) as { id: string }[];
    expect(bElements.some(e => e.id === elB)).toBe(true);

    // Default project data must also survive
    const defaultCountAfter = await getElementCount('proj-default');
    expect(defaultCountAfter).toBe(defaultCountBefore);
  });
});

// ═══════════════════════════════════════
// Fix 4: /api/model/reset is project-scoped
// ═══════════════════════════════════════

describe('Fix 4: model reset is project-scoped', () => {
  it('POST /api/model/reset only clears current project data', async () => {
    // Create two projects with their own data
    const scratch = await createProject(`Reset Scope ${RUN}`);
    const bystander = await createProject(`Bystander ${RUN}`);

    const scratchEl = await createElement(scratch.id, 'reset-scratch');
    const bystanderEl = await createElement(bystander.id, 'reset-bystander');

    // Snapshot default project before reset
    const defaultCountBefore = await getElementCount('proj-default');
    const bystanderCountBefore = await getElementCount(bystander.id);
    expect(bystanderCountBefore).toBe(1);

    // Switch to scratch project and reset (without seed)
    await switchProject(scratch.id);

    const resetRes = await fetch(`${BASE}/model/reset?seed=false`, { method: 'POST' });
    const resetBody = await json(resetRes);
    expect(resetRes.ok, `Reset failed: ${JSON.stringify(resetBody)}`).toBe(true);

    // Scratch project data should be gone
    const scratchCountAfter = await getElementCount(scratch.id);
    expect(scratchCountAfter).toBe(0);

    // Remove deleted elements from cleanup
    const idx = cleanupElementIds.indexOf(scratchEl);
    if (idx !== -1) cleanupElementIds.splice(idx, 1);

    // Bystander project data must be fully intact
    const bystanderCountAfter = await getElementCount(bystander.id);
    expect(bystanderCountAfter).toBe(bystanderCountBefore);

    // Verify the specific bystander element survived
    const bRes = await fetch(`${BASE}/elements?project_id=${encodeURIComponent(bystander.id)}`);
    const bElements = await json(bRes) as { id: string }[];
    expect(bElements.some(e => e.id === bystanderEl)).toBe(true);

    // Default project data must be fully intact
    const defaultCountAfter = await getElementCount('proj-default');
    expect(defaultCountAfter).toBe(defaultCountBefore);

    // Restore current project to default
    await switchProject('proj-default');
  });
});
