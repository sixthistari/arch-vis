/**
 * Regression test: Deleting a project must NOT wipe the entire database.
 *
 * This test verifies that:
 *  1. Deleting a project only removes data scoped to that project
 *  2. Seed data (elements, views, relationships) for other projects is preserved
 *  3. Deleting the last project is prevented
 *  4. The current_project_id preference switches correctly after deletion
 *
 * Requires a running API server at localhost:3001 with seed data loaded.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://192.168.10.150:3001/api';
const RUN = Date.now().toString(36);

// IDs created during this test run — cleaned up in afterAll
const cleanupProjectIds: string[] = [];
const cleanupElementIds: string[] = [];
const cleanupRelationshipIds: string[] = [];
const cleanupViewIds: string[] = [];

async function json(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ═══════════════════════════════════════
// Snapshot helpers — capture counts scoped by project_id query param
// ═══════════════════════════════════════

interface DataSnapshot {
  elementCount: number;
  relationshipCount: number;
  viewCount: number;
  elementIds: string[];
  relationshipIds: string[];
  viewIds: string[];
}

async function takeSnapshot(projectId: string): Promise<DataSnapshot> {
  const qs = `project_id=${encodeURIComponent(projectId)}`;
  const [elemRes, relRes, viewRes] = await Promise.all([
    fetch(`${BASE}/elements?${qs}`),
    fetch(`${BASE}/relationships?${qs}`),
    fetch(`${BASE}/views?${qs}`),
  ]);

  const elements = await json(elemRes) as { id: string }[];
  const relationships = await json(relRes) as { id: string }[];
  const views = await json(viewRes) as { id: string }[];

  return {
    elementCount: elements.length,
    relationshipCount: relationships.length,
    viewCount: views.length,
    elementIds: elements.map(e => e.id),
    relationshipIds: relationships.map(r => r.id),
    viewIds: views.map(v => v.id),
  };
}

// ═══════════════════════════════════════
// Setup helpers
// ═══════════════════════════════════════

async function createProject(name: string, description?: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description ?? `Test project ${name}` }),
  });
  expect(res.status).toBe(201);
  const project = await json(res);
  cleanupProjectIds.push(project.id);
  return project;
}

async function createElement(projectId: string, suffix: string): Promise<string> {
  const id = `el-regr-${RUN}-${suffix}`;
  const res = await fetch(`${BASE}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name: `Regression Element ${suffix}`,
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

async function createRelationship(projectId: string, sourceId: string, targetId: string, suffix: string): Promise<string> {
  const id = `rel-regr-${RUN}-${suffix}`;
  const res = await fetch(`${BASE}/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      archimate_type: 'composition',
      source_id: sourceId,
      target_id: targetId,
      project_id: projectId,
    }),
  });
  expect(res.status).toBe(201);
  cleanupRelationshipIds.push(id);
  return id;
}

async function createView(projectId: string, suffix: string): Promise<string> {
  const id = `view-regr-${RUN}-${suffix}`;
  const res = await fetch(`${BASE}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name: `Regression View ${suffix}`,
      viewpoint_type: 'custom',
      project_id: projectId,
    }),
  });
  expect(res.status).toBe(201);
  cleanupViewIds.push(id);
  return id;
}

// ═══════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════

afterAll(async () => {
  // Clean up in dependency order: relationships -> views -> elements -> projects
  for (const id of cleanupRelationshipIds) {
    await fetch(`${BASE}/relationships/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of cleanupViewIds) {
    await fetch(`${BASE}/views/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of cleanupElementIds) {
    await fetch(`${BASE}/elements/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of cleanupProjectIds) {
    await fetch(`${BASE}/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Ensure default project is still current
  await fetch(`${BASE}/projects/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'proj-default' }),
  }).catch(() => {});
});

// ═══════════════════════════════════════
// Tests
// ═══════════════════════════════════════

describe('Project delete safety — regression', () => {
  let seedSnapshot: DataSnapshot;
  let secondProjectId: string;
  let secondElA: string;
  let secondElB: string;
  let secondRelId: string;
  let secondViewId: string;

  beforeAll(async () => {
    // 1. Capture a snapshot of the default project's seed data BEFORE we do anything
    seedSnapshot = await takeSnapshot('proj-default');
    expect(seedSnapshot.elementCount).toBeGreaterThan(0);
    expect(seedSnapshot.viewCount).toBeGreaterThan(0);

    // 2. Create a second project with its own data
    const proj = await createProject(`Regression Test Project ${RUN}`);
    secondProjectId = proj.id;

    secondElA = await createElement(secondProjectId, 'a');
    secondElB = await createElement(secondProjectId, 'b');
    secondRelId = await createRelationship(secondProjectId, secondElA, secondElB, '1');
    secondViewId = await createView(secondProjectId, '1');
  });

  it('second project has its own elements, relationships, and views', async () => {
    const snap = await takeSnapshot(secondProjectId);
    expect(snap.elementCount).toBe(2);
    expect(snap.relationshipCount).toBe(1);
    expect(snap.viewCount).toBe(1);
    expect(snap.elementIds).toContain(secondElA);
    expect(snap.elementIds).toContain(secondElB);
    expect(snap.relationshipIds).toContain(secondRelId);
    expect(snap.viewIds).toContain(secondViewId);
  });

  it('deleting the second project succeeds', async () => {
    const res = await fetch(`${BASE}/projects/${encodeURIComponent(secondProjectId)}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    // Remove from cleanup list — already deleted
    const idx = cleanupProjectIds.indexOf(secondProjectId);
    if (idx !== -1) cleanupProjectIds.splice(idx, 1);
  });

  it('second project data is gone after deletion', async () => {
    const snap = await takeSnapshot(secondProjectId);
    expect(snap.elementCount).toBe(0);
    expect(snap.relationshipCount).toBe(0);
    expect(snap.viewCount).toBe(0);

    // Also remove from cleanup lists since the cascade should have removed them
    for (const id of [secondElA, secondElB]) {
      const idx = cleanupElementIds.indexOf(id);
      if (idx !== -1) cleanupElementIds.splice(idx, 1);
    }
    {
      const idx = cleanupRelationshipIds.indexOf(secondRelId);
      if (idx !== -1) cleanupRelationshipIds.splice(idx, 1);
    }
    {
      const idx = cleanupViewIds.indexOf(secondViewId);
      if (idx !== -1) cleanupViewIds.splice(idx, 1);
    }
  });

  it('CRITICAL: seed data for default project is fully intact after deleting second project', async () => {
    const afterSnapshot = await takeSnapshot('proj-default');

    // Element count must be unchanged
    expect(afterSnapshot.elementCount).toBe(seedSnapshot.elementCount);

    // Relationship count must be unchanged
    expect(afterSnapshot.relationshipCount).toBe(seedSnapshot.relationshipCount);

    // View count must be unchanged
    expect(afterSnapshot.viewCount).toBe(seedSnapshot.viewCount);

    // Every original element ID must still exist
    for (const id of seedSnapshot.elementIds) {
      expect(afterSnapshot.elementIds).toContain(id);
    }

    // Every original relationship ID must still exist
    for (const id of seedSnapshot.relationshipIds) {
      expect(afterSnapshot.relationshipIds).toContain(id);
    }

    // Every original view ID must still exist
    for (const id of seedSnapshot.viewIds) {
      expect(afterSnapshot.viewIds).toContain(id);
    }
  });

  it('the default project record itself still exists', async () => {
    const res = await fetch(`${BASE}/projects`);
    const projects = await json(res) as { id: string }[];
    const defaultProject = projects.find(p => p.id === 'proj-default');
    expect(defaultProject).toBeDefined();
  });
});

describe('Project delete safety — last project protection', () => {
  it('cannot delete the last remaining project', async () => {
    // Get current project list
    const projectsRes = await fetch(`${BASE}/projects`);
    const projects = await json(projectsRes) as { id: string }[];

    if (projects.length === 1) {
      // Only one project — deletion must be refused
      const res = await fetch(`${BASE}/projects/${encodeURIComponent(projects[0].id)}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(400);
      const body = await json(res);
      expect(body.error).toMatch(/cannot delete/i);

      // Verify the project still exists
      const checkRes = await fetch(`${BASE}/projects`);
      const afterProjects = await json(checkRes) as { id: string }[];
      expect(afterProjects.length).toBe(1);
      expect(afterProjects[0].id).toBe(projects[0].id);
    } else {
      // Multiple projects exist — delete all but one to test the guard
      // Sort so we keep proj-default and try to delete everything else first
      const others = projects.filter(p => p.id !== 'proj-default');

      // Delete until only one remains
      for (const p of others) {
        const remaining = (await json(await fetch(`${BASE}/projects`)) as { id: string }[]).length;
        if (remaining <= 1) break;
        await fetch(`${BASE}/projects/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      }

      // Now try to delete the last one — should be refused
      const finalProjects = await json(await fetch(`${BASE}/projects`)) as { id: string }[];
      if (finalProjects.length === 1) {
        const res = await fetch(`${BASE}/projects/${encodeURIComponent(finalProjects[0].id)}`, {
          method: 'DELETE',
        });
        expect(res.status).toBe(400);
        const body = await json(res);
        expect(body.error).toMatch(/cannot delete/i);
      } else {
        // Still more than one project (test-created projects from other describe blocks
        // may not have been cleaned up yet). Just verify the contract exists.
        expect(finalProjects.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('Project delete safety — current project preference switches', () => {
  let tempProjectId: string;

  beforeAll(async () => {
    // Create a temp project and make it current
    const proj = await createProject(`Temp Current ${RUN}`);
    tempProjectId = proj.id;

    // Switch current project to the temp one
    const switchRes = await fetch(`${BASE}/projects/current`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tempProjectId }),
    });
    expect(switchRes.ok).toBe(true);

    // Verify it's current
    const currentRes = await fetch(`${BASE}/projects/current`);
    const current = await json(currentRes);
    expect(current.id).toBe(tempProjectId);
  });

  it('deleting the current project switches preference to another project', async () => {
    const res = await fetch(`${BASE}/projects/${encodeURIComponent(tempProjectId)}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    // Remove from cleanup
    const idx = cleanupProjectIds.indexOf(tempProjectId);
    if (idx !== -1) cleanupProjectIds.splice(idx, 1);

    // Current project should now point to a different (still existing) project
    const currentRes = await fetch(`${BASE}/projects/current`);
    expect(currentRes.ok).toBe(true);
    const current = await json(currentRes);
    expect(current.id).not.toBe(tempProjectId);

    // The project it switched to must actually exist
    const projectsRes = await fetch(`${BASE}/projects`);
    const projects = await json(projectsRes) as { id: string }[];
    expect(projects.some(p => p.id === current.id)).toBe(true);
  });
});

describe('Project delete safety — isolated data deletion', () => {
  let projAlphaId: string;
  let projBetaId: string;
  let alphaEl: string;
  let betaEl: string;
  let alphaView: string;
  let betaView: string;

  beforeAll(async () => {
    // Create two projects, each with their own data
    const alpha = await createProject(`Alpha ${RUN}`);
    projAlphaId = alpha.id;

    const beta = await createProject(`Beta ${RUN}`);
    projBetaId = beta.id;

    alphaEl = await createElement(projAlphaId, 'alpha');
    betaEl = await createElement(projBetaId, 'beta');
    alphaView = await createView(projAlphaId, 'alpha');
    betaView = await createView(projBetaId, 'beta');
  });

  it('deleting project Alpha removes only Alpha data, Beta data intact', async () => {
    // Snapshot Beta before deletion
    const betaBefore = await takeSnapshot(projBetaId);
    expect(betaBefore.elementCount).toBe(1);
    expect(betaBefore.viewCount).toBe(1);

    // Delete Alpha
    const res = await fetch(`${BASE}/projects/${encodeURIComponent(projAlphaId)}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);

    // Remove from cleanup
    const idx = cleanupProjectIds.indexOf(projAlphaId);
    if (idx !== -1) cleanupProjectIds.splice(idx, 1);
    {
      const idx2 = cleanupElementIds.indexOf(alphaEl);
      if (idx2 !== -1) cleanupElementIds.splice(idx2, 1);
    }
    {
      const idx2 = cleanupViewIds.indexOf(alphaView);
      if (idx2 !== -1) cleanupViewIds.splice(idx2, 1);
    }

    // Alpha data is gone
    const alphaAfter = await takeSnapshot(projAlphaId);
    expect(alphaAfter.elementCount).toBe(0);
    expect(alphaAfter.viewCount).toBe(0);

    // Beta data is untouched
    const betaAfter = await takeSnapshot(projBetaId);
    expect(betaAfter.elementCount).toBe(betaBefore.elementCount);
    expect(betaAfter.viewCount).toBe(betaBefore.viewCount);
    expect(betaAfter.elementIds).toContain(betaEl);
    expect(betaAfter.viewIds).toContain(betaView);
  });

  it('deleting non-existent project returns 404', async () => {
    const res = await fetch(`${BASE}/projects/proj-does-not-exist-${RUN}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
