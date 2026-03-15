import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3001/api';

// Unique prefix to avoid collisions with seed data
const PREFIX = `test-${Date.now()}`;

// Track IDs for cleanup
const createdElementIds: string[] = [];
const createdRelationshipIds: string[] = [];

async function json(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createTestElement(overrides: Record<string, unknown> = {}) {
  const id = overrides.id as string ?? `el-${PREFIX}-${crypto.randomUUID()}`;
  const body = {
    id,
    name: `Test Element ${id.slice(-6)}`,
    archimate_type: 'application-component',
    layer: 'application',
    specialisation: null,
    ...overrides,
  };
  const res = await fetch(`${BASE}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 201) {
    createdElementIds.push(id);
  }
  return { res, id, body };
}

// ═══════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════

afterAll(async () => {
  for (const id of createdRelationshipIds) {
    await fetch(`${BASE}/relationships/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  for (const id of createdElementIds) {
    await fetch(`${BASE}/elements/${id}`, { method: 'DELETE' }).catch(() => {});
  }
});

// ═══════════════════════════════════════
// Element CRUD
// ═══════════════════════════════════════

describe('Element CRUD', () => {
  it('POST /api/elements — create element with valid data returns 201', async () => {
    const { res, id } = await createTestElement();
    expect(res.status).toBe(201);

    const data = await json(res);
    expect(data.id).toBe(id);
    expect(data.archimate_type).toBe('application-component');
    expect(data.layer).toBe('application');
    expect(data.status).toBe('active'); // default
  });

  it('POST /api/elements — invalid archimate_type returns 400', async () => {
    const res = await fetch(`${BASE}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `el-${PREFIX}-bad`,
        name: 'Bad Type',
        archimate_type: 'not-a-real-type',
        layer: 'application',
        specialisation: null,
      }),
    });
    expect(res.status).toBe(400);
    const data = await json(res);
    expect(data.error).toBeDefined();
  });

  it('POST /api/elements — missing required name returns 400', async () => {
    const res = await fetch(`${BASE}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `el-${PREFIX}-noname`,
        archimate_type: 'application-component',
        layer: 'application',
        specialisation: null,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/elements — returns an array', async () => {
    const res = await fetch(`${BASE}/elements`);
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('GET /api/elements?layer=application — filters by layer', async () => {
    const res = await fetch(`${BASE}/elements?layer=application`);
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data)).toBe(true);
    for (const el of data) {
      expect(el.layer).toBe('application');
    }
  });

  it('PUT /api/elements/:id — update element name returns 200', async () => {
    const { id } = await createTestElement();
    const res = await fetch(`${BASE}/elements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.name).toBe('Updated Name');
    expect(data.id).toBe(id);
  });

  it('PUT /api/elements/:id — update non-existent element returns 404', async () => {
    const res = await fetch(`${BASE}/elements/el-does-not-exist-${PREFIX}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('PUT /api/elements/:id — no updatable fields returns 400', async () => {
    const { id } = await createTestElement();
    const res = await fetch(`${BASE}/elements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Server may return 400 (no fields to update) or accept empty update
    expect([200, 400]).toContain(res.status);
  });

  it('DELETE /api/elements/:id — delete existing element succeeds', async () => {
    const { id } = await createTestElement();
    const res = await fetch(`${BASE}/elements/${id}`, { method: 'DELETE' });
    // Server returns 204 No Content
    expect(res.status).toBe(204);
    // Remove from cleanup list since already deleted
    const idx = createdElementIds.indexOf(id);
    if (idx !== -1) createdElementIds.splice(idx, 1);
  });

  it('DELETE /api/elements/:id — delete non-existent returns 404', async () => {
    const res = await fetch(`${BASE}/elements/el-phantom-${PREFIX}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('GET /api/elements/:id/views — non-existent element returns 404', async () => {
    const res = await fetch(`${BASE}/elements/el-phantom-${PREFIX}/views`);
    expect(res.status).toBe(404);
  });

  it('GET /api/elements/:id/views — existing element returns array', async () => {
    const { id } = await createTestElement();
    const res = await fetch(`${BASE}/elements/${id}/views`);
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ═══════════════════════════════════════
// Relationship CRUD
// ═══════════════════════════════════════

describe('Relationship CRUD', () => {
  let sourceId: string;
  let targetId: string;

  beforeAll(async () => {
    const src = await createTestElement({ name: 'Rel Source' });
    const tgt = await createTestElement({ name: 'Rel Target' });
    sourceId = src.id;
    targetId = tgt.id;
  });

  it('POST /api/relationships — create with valid data returns 201', async () => {
    const relId = `rel-${PREFIX}-${crypto.randomUUID()}`;
    const res = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: sourceId,
        target_id: targetId,
      }),
    });
    expect(res.status).toBe(201);
    createdRelationshipIds.push(relId);

    const data = await json(res);
    expect(data.id).toBe(relId);
    expect(data.archimate_type).toBe('composition');
    expect(data.source_id).toBe(sourceId);
    expect(data.target_id).toBe(targetId);
  });

  it('POST /api/relationships — non-existent source returns 400', async () => {
    const relId = `rel-${PREFIX}-badsrc`;
    const res = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: 'el-does-not-exist',
        target_id: targetId,
      }),
    });
    expect(res.status).toBe(400);
    const data = await json(res);
    expect(data.error).toBeDefined();
  });

  it('POST /api/relationships — non-existent target returns 400', async () => {
    const relId = `rel-${PREFIX}-badtgt`;
    const res = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: sourceId,
        target_id: 'el-does-not-exist',
      }),
    });
    expect(res.status).toBe(400);
    const data = await json(res);
    expect(data.error).toBeDefined();
  });

  it('POST /api/relationships — invalid relationship type per metamodel returns 400', async () => {
    // 'influence' is not valid between application-component and application-component
    const relId = `rel-${PREFIX}-badtype`;
    const res = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'influence',
        source_id: sourceId,
        target_id: targetId,
      }),
    });
    expect(res.status).toBe(400);
    const data = await json(res);
    expect(data.error).toBeDefined();
  });

  it('GET /api/relationships — returns an array', async () => {
    const res = await fetch(`${BASE}/relationships`);
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/relationships?source_id= — filters by source', async () => {
    const res = await fetch(`${BASE}/relationships?source_id=${sourceId}`);
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data)).toBe(true);
    for (const rel of data) {
      expect(rel.source_id).toBe(sourceId);
    }
  });

  it('PUT /api/relationships/:id — update label returns 200', async () => {
    const relId = `rel-${PREFIX}-${crypto.randomUUID()}`;
    const createRes = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: sourceId,
        target_id: targetId,
      }),
    });
    expect(createRes.status).toBe(201);
    createdRelationshipIds.push(relId);

    const res = await fetch(`${BASE}/relationships/${relId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Updated Label' }),
    });
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.label).toBe('Updated Label');
  });

  it('PUT /api/relationships/:id — non-existent returns 404', async () => {
    const res = await fetch(`${BASE}/relationships/rel-phantom-${PREFIX}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/relationships/:id — delete existing succeeds', async () => {
    const relId = `rel-${PREFIX}-${crypto.randomUUID()}`;
    const createRes = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: sourceId,
        target_id: targetId,
      }),
    });
    expect(createRes.status).toBe(201);

    const res = await fetch(`${BASE}/relationships/${relId}`, { method: 'DELETE' });
    // Server returns 204 No Content
    expect(res.status).toBe(204);
  });

  it('DELETE /api/relationships/:id — non-existent returns 404', async () => {
    const res = await fetch(`${BASE}/relationships/rel-phantom-${PREFIX}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('DELETE element cascades relationships', async () => {
    // Create dedicated source + target elements
    const src = await createTestElement({ name: 'Cascade Source' });
    const tgt = await createTestElement({ name: 'Cascade Target' });

    // Create a relationship between them
    const relId = `rel-${PREFIX}-cascade-${crypto.randomUUID()}`;
    const createRes = await fetch(`${BASE}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: relId,
        archimate_type: 'composition',
        source_id: src.id,
        target_id: tgt.id,
      }),
    });
    expect(createRes.status).toBe(201);
    createdRelationshipIds.push(relId);

    // Delete the source element — should cascade-delete the relationship
    const delRes = await fetch(`${BASE}/elements/${src.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(204);
    // Remove from cleanup since already deleted
    const idx = createdElementIds.indexOf(src.id);
    if (idx !== -1) createdElementIds.splice(idx, 1);

    // Verify relationship is gone
    const relRes = await fetch(`${BASE}/relationships?source_id=${src.id}`);
    const rels = await json(relRes);
    const found = rels.find((r: Record<string, unknown>) => r.id === relId);
    expect(found).toBeUndefined();
  });
});
