import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const router = Router();

interface ProcessStepRow {
  id: string;
  process_id: string;
  sequence: number;
  name: string;
  step_type: string | null;
  role_id: string | null;
  agent_id: string | null;
  agent_autonomy: string | null;
  description: string | null;
  input_objects: string | null;
  output_objects: string | null;
  approval_required: number;
  track_crossing: number;
}

function parseStep(row: ProcessStepRow) {
  return {
    ...row,
    input_objects: row.input_objects ? JSON.parse(row.input_objects) : null,
    output_objects: row.output_objects ? JSON.parse(row.output_objects) : null,
    approval_required: !!row.approval_required,
    track_crossing: !!row.track_crossing,
  };
}

// GET /api/process-steps/:process_id — list steps for a process
router.get('/process-steps/:process_id', (req: Request, res: Response) => {
  const rows = db.prepare(
    'SELECT * FROM process_steps WHERE process_id = ? ORDER BY sequence ASC'
  ).all(req.params.process_id) as ProcessStepRow[];

  res.json(rows.map(parseStep));
});

// POST /api/process-steps — create step + element in a transaction
router.post('/process-steps', (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const { process_id, name, step_type, archimate_type } = body;

  if (!process_id || !name || !archimate_type) {
    res.status(400).json({ error: 'process_id, name, and archimate_type are required' });
    return;
  }

  try {
    const result = db.transaction(() => {
      const elementId = `el-${crypto.randomUUID()}`;
      const stepId = `ps-${crypto.randomUUID()}`;

      // Get next sequence number
      const maxSeq = db.prepare(
        'SELECT MAX(sequence) AS max_seq FROM process_steps WHERE process_id = ?'
      ).get(process_id as string) as { max_seq: number | null };
      const sequence = (maxSeq?.max_seq ?? -1) + 1;

      // Create element for canvas presence
      db.prepare(`
        INSERT INTO elements (id, name, archimate_type, layer, status, parent_id)
        VALUES (?, ?, ?, 'none', 'active', ?)
      `).run(elementId, name, archimate_type, process_id);

      // Create process step with execution metadata
      db.prepare(`
        INSERT INTO process_steps (id, process_id, sequence, name, step_type, role_id, agent_id, agent_autonomy, description, input_objects, output_objects, approval_required, track_crossing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        stepId,
        process_id,
        sequence,
        name as string,
        (step_type as string) ?? null,
        (body.role_id as string) ?? null,
        (body.agent_id as string) ?? null,
        (body.agent_autonomy as string) ?? null,
        (body.description as string) ?? null,
        body.input_objects ? JSON.stringify(body.input_objects) : null,
        body.output_objects ? JSON.stringify(body.output_objects) : null,
        body.approval_required ? 1 : 0,
        body.track_crossing ? 1 : 0,
      );

      return { stepId, elementId, sequence };
    })();

    const row = db.prepare('SELECT * FROM process_steps WHERE id = ?').get(result.stepId) as ProcessStepRow;
    res.status(201).json({
      ...parseStep(row),
      element_id: result.elementId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// PUT /api/process-steps/:id — update step metadata
router.put('/process-steps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  const existing = db.prepare('SELECT * FROM process_steps WHERE id = ?').get(id) as ProcessStepRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Process step not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatable = ['name', 'step_type', 'role_id', 'agent_id', 'agent_autonomy', 'description', 'approval_required', 'track_crossing'] as const;
  for (const field of updatable) {
    if (field in body) {
      if (field === 'approval_required' || field === 'track_crossing') {
        fields.push(`${field} = ?`);
        values.push(body[field] ? 1 : 0);
      } else {
        fields.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }
  }

  // JSON fields
  if ('input_objects' in body) {
    fields.push('input_objects = ?');
    values.push(body.input_objects ? JSON.stringify(body.input_objects) : null);
  }
  if ('output_objects' in body) {
    fields.push('output_objects = ?');
    values.push(body.output_objects ? JSON.stringify(body.output_objects) : null);
  }

  if (fields.length === 0) {
    res.json(parseStep(existing));
    return;
  }

  values.push(id);
  db.prepare(`UPDATE process_steps SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  // Also update the element name if name changed
  if ('name' in body && body.name) {
    const step = db.prepare('SELECT process_id FROM process_steps WHERE id = ?').get(id) as { process_id: string };
    if (existing.name !== body.name) {
      db.prepare('UPDATE elements SET name = ?, updated_at = datetime(\'now\') WHERE name = ? AND parent_id = ?')
        .run(body.name as string, existing.name, step.process_id);
    }
  }

  const updated = db.prepare('SELECT * FROM process_steps WHERE id = ?').get(id) as ProcessStepRow;
  res.json(parseStep(updated));
});

// DELETE /api/process-steps/:id — delete step (element cascades via FK)
router.delete('/process-steps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM process_steps WHERE id = ?').get(id) as ProcessStepRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Process step not found' });
    return;
  }

  db.prepare('DELETE FROM process_steps WHERE id = ?').run(id);
  res.status(204).send();
});

// POST /api/process-steps/reorder — update sequence numbers
router.post('/process-steps/reorder', (req: Request, res: Response) => {
  const { step_ids } = req.body as { step_ids: string[] };
  if (!Array.isArray(step_ids)) {
    res.status(400).json({ error: 'step_ids array required' });
    return;
  }

  db.transaction(() => {
    const update = db.prepare('UPDATE process_steps SET sequence = ? WHERE id = ?');
    for (let i = 0; i < step_ids.length; i++) {
      update.run(i, step_ids[i]);
    }
  })();

  res.json({ success: true, count: step_ids.length });
});

export default router;
