import {
  type Domain,
  type CreateDomainInput,
  type Element,
  type CreateElementInput,
  type UpdateElementInput,
  type Relationship,
  type CreateRelationshipInput,
  type View,
  type CreateViewInput,
  type ViewElement,
  type SublayerConfig,
  type ValidRelationship,
  type HealthResponse,
  type ElementFilters,
  type RelationshipFilters,
  type Project,
  type CreateProjectInput,
  type UpdateProjectInput,
  DomainSchema,
  ElementSchema,
  RelationshipSchema,
  ViewSchema,
  ViewElementSchema,
  ViewRelationshipSchema,
  SublayerConfigSchema,
  ValidRelationshipSchema,
  HealthResponseSchema,
  ProjectSchema,
} from '../model/types';
import { z } from 'zod';
import { notifySuccess, notifyError } from '../store/notification';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, `${response.status}: ${body}`);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}

async function requestVoid(
  path: string,
  options?: RequestInit,
): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, `${response.status}: ${body}`);
  }
}

function toastMutationError(operation: string, err: unknown, payload?: unknown): void {
  const isApi = err instanceof ApiError;
  notifyError(`${operation} failed`, {
    operation,
    status: isApi ? err.status : undefined,
    errorMessage: err instanceof Error ? err.message : String(err),
    payload: payload ? JSON.stringify(payload).slice(0, 300) : undefined,
  });
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (pair): pair is [string, string] => pair[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ═══════════════════════════════════════
// Health
// ═══════════════════════════════════════

export function fetchHealth(): Promise<HealthResponse> {
  return request('/health', HealthResponseSchema);
}

// ═══════════════════════════════════════
// Domains
// ═══════════════════════════════════════

export function fetchDomains(): Promise<Domain[]> {
  return request('/domains', z.array(DomainSchema));
}

export async function createDomain(data: CreateDomainInput): Promise<Domain> {
  try {
    const result = await request('/domains', DomainSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('Domain created', result.name);
    return result;
  } catch (err) {
    toastMutationError('Create domain', err, data);
    throw err;
  }
}

// ═══════════════════════════════════════
// Elements
// ═══════════════════════════════════════

export function fetchElements(filters?: ElementFilters): Promise<Element[]> {
  const query = filters
    ? buildQuery({
        layer: filters.layer,
        domain: filters.domain,
        specialisation: filters.specialisation,
      })
    : '';
  return request(`/elements${query}`, z.array(ElementSchema));
}

export async function createElement(data: CreateElementInput): Promise<Element> {
  try {
    const result = await request('/elements', ElementSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('Element created', result.name);
    return result;
  } catch (err) {
    toastMutationError('Create element', err, data);
    throw err;
  }
}

export async function updateElement(
  id: string,
  data: Omit<UpdateElementInput, 'id'>,
): Promise<Element> {
  try {
    const result = await request(`/elements/${encodeURIComponent(id)}`, ElementSchema, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    notifySuccess('Element updated', result.name);
    return result;
  } catch (err) {
    toastMutationError('Update element', err, data);
    throw err;
  }
}

export async function bulkRenameSpecialisation(
  oldValue: string,
  newValue: string | null,
): Promise<{ updated: number }> {
  try {
    const result = await request('/elements/bulk-specialisation', z.object({ updated: z.number() }), {
      method: 'POST',
      body: JSON.stringify({ oldValue, newValue }),
    });
    notifySuccess('Specialisations renamed', `${result.updated} elements updated`);
    return result;
  } catch (err) {
    toastMutationError('Bulk rename specialisation', err, { oldValue, newValue });
    throw err;
  }
}

export function fetchDistinctSpecialisations(): Promise<Array<{ specialisation: string; count: number }>> {
  return request(
    '/elements/distinct-specialisations',
    z.array(z.object({ specialisation: z.string(), count: z.number() })),
  );
}

export async function deleteElement(id: string): Promise<void> {
  try {
    await requestVoid(`/elements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    notifySuccess('Element deleted');
  } catch (err) {
    toastMutationError('Delete element', err);
    throw err;
  }
}

// ═══════════════════════════════════════
// Relationships
// ═══════════════════════════════════════

export function fetchRelationships(
  filters?: RelationshipFilters,
): Promise<Relationship[]> {
  const query = filters
    ? buildQuery({
        source_id: filters.source_id,
        target_id: filters.target_id,
        archimate_type: filters.archimate_type,
      })
    : '';
  return request(`/relationships${query}`, z.array(RelationshipSchema));
}

export async function createRelationship(
  data: CreateRelationshipInput,
): Promise<Relationship> {
  try {
    const result = await request('/relationships', RelationshipSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('Relationship created', result.label || result.archimate_type);
    return result;
  } catch (err) {
    toastMutationError('Create relationship', err, data);
    throw err;
  }
}

export async function updateRelationship(
  id: string,
  data: Partial<Omit<Relationship, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Relationship> {
  try {
    const result = await request(`/relationships/${encodeURIComponent(id)}`, RelationshipSchema, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    notifySuccess('Relationship updated', result.label || result.archimate_type);
    return result;
  } catch (err) {
    toastMutationError('Update relationship', err, data);
    throw err;
  }
}

export async function deleteRelationship(id: string): Promise<void> {
  try {
    await requestVoid(`/relationships/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    notifySuccess('Relationship deleted');
  } catch (err) {
    toastMutationError('Delete relationship', err);
    throw err;
  }
}

// ═══════════════════════════════════════
// Views
// ═══════════════════════════════════════

export function fetchViews(): Promise<View[]> {
  return request('/views', z.array(ViewSchema));
}

export const ViewDetailSchema = z.object({
  view: ViewSchema,
  viewElements: z.array(ViewElementSchema),
  viewRelationships: z.array(ViewRelationshipSchema),
});

export type ViewDetail = z.infer<typeof ViewDetailSchema>;

export function fetchView(id: string): Promise<ViewDetail> {
  return request(`/views/${encodeURIComponent(id)}`, ViewDetailSchema as z.ZodType<ViewDetail>);
}

export async function createView(data: CreateViewInput): Promise<View> {
  try {
    const result = await request('/views', ViewSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('View created', result.name);
    return result;
  } catch (err) {
    toastMutationError('Create view', err, data);
    throw err;
  }
}

export async function duplicateView(id: string): Promise<View> {
  try {
    const result = await request(`/views/${encodeURIComponent(id)}/duplicate`, ViewSchema, {
      method: 'POST',
    });
    notifySuccess('View duplicated', result.name);
    return result;
  } catch (err) {
    toastMutationError('Duplicate view', err);
    throw err;
  }
}

export async function removeViewElements(
  viewId: string,
  elementIds: string[],
): Promise<void> {
  try {
    await requestVoid(`/views/${encodeURIComponent(viewId)}/elements`, {
      method: 'DELETE',
      body: JSON.stringify({ element_ids: elementIds }),
    });
    notifySuccess('Removed from view', `${elementIds.length} element${elementIds.length !== 1 ? 's' : ''}`);
  } catch (err) {
    toastMutationError('Remove from view', err);
    throw err;
  }
}

export function updateViewElements(
  viewId: string,
  elements: ViewElement[],
): Promise<ViewElement[]> {
  return request(
    `/views/${encodeURIComponent(viewId)}/elements`,
    z.array(ViewElementSchema) as z.ZodType<ViewElement[]>,
    {
      method: 'PUT',
      body: JSON.stringify(elements),
    },
  );
}

// ═══════════════════════════════════════
// Sublayer Config
// ═══════════════════════════════════════

export function fetchSublayerConfig(): Promise<SublayerConfig> {
  return request('/sublayer-config', SublayerConfigSchema);
}

// ═══════════════════════════════════════
// Valid Relationships
// ═══════════════════════════════════════

export function fetchValidRelationships(): Promise<ValidRelationship[]> {
  return request(
    '/valid-relationships',
    z.array(ValidRelationshipSchema),
  );
}

// ═══════════════════════════════════════
// Batch Import / Export
// ═══════════════════════════════════════

export type { BatchElementInput, BatchRelationshipInput } from '../../shared/types.js';
import type { BatchElementInput, BatchRelationshipInput } from '../../shared/types.js';

export interface BatchImportPayload {
  notation?: 'archimate' | 'uml' | 'wireframe';
  elements: BatchElementInput[];
  relationships?: BatchRelationshipInput[];
  view?: {
    id?: string;
    name: string;
    viewpoint?: string;
    render_mode?: string;
  };
}

export interface BatchImportResult {
  success: boolean;
  elementsCreated: number;
  relationshipsCreated: number;
  viewId: string | null;
}

export async function importModelBatch(payload: BatchImportPayload): Promise<BatchImportResult> {
  try {
    const result = await request('/import/model-batch', z.object({
      success: z.boolean(),
      elementsCreated: z.number(),
      relationshipsCreated: z.number(),
      viewId: z.string().nullable(),
    }) as z.ZodType<BatchImportResult>, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    notifySuccess('Batch import complete', `${result.elementsCreated} elements, ${result.relationshipsCreated} relationships`);
    return result;
  } catch (err) {
    toastMutationError('Batch import', err);
    throw err;
  }
}

export function exportModelBatch(viewId?: string): Promise<unknown> {
  const query = viewId ? `?view=${encodeURIComponent(viewId)}` : '';
  return request(`/export/model-batch${query}`, z.unknown());
}

// ═══════════════════════════════════════
// ArchiMate XML Import / Export
// ═══════════════════════════════════════

export interface ArchimateImportResult {
  elementsCreated: number;
  relationshipsCreated: number;
}

const ArchimateImportResultSchema = z.object({
  elementsCreated: z.number(),
  relationshipsCreated: z.number(),
});

export async function importArchimateXml(xml: string): Promise<ArchimateImportResult> {
  try {
    const result = await request('/import/archimate-xml', ArchimateImportResultSchema, {
      method: 'POST',
      body: JSON.stringify({ xml }),
    });
    notifySuccess('ArchiMate XML imported', `${result.elementsCreated} elements, ${result.relationshipsCreated} relationships`);
    return result;
  } catch (err) {
    toastMutationError('Import ArchiMate XML', err);
    throw err;
  }
}

export async function exportArchimateXml(): Promise<string> {
  const response = await fetch(`${API_BASE}/export/archimate-xml`);
  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, `${response.status}: ${body}`);
  }
  return response.text();
}

// ═══════════════════════════════════════
// CSV Import / Export
// ═══════════════════════════════════════

export interface CsvImportPayload {
  elements: string;
  relations: string;
  properties?: string;
}

export interface CsvImportResult {
  elementsCreated: number;
  relationshipsCreated: number;
}

const CsvImportResultSchema = z.object({
  elementsCreated: z.number(),
  relationshipsCreated: z.number(),
});

export async function importCsv(data: CsvImportPayload): Promise<CsvImportResult> {
  try {
    const result = await request('/import/csv', CsvImportResultSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('CSV imported', `${result.elementsCreated} elements, ${result.relationshipsCreated} relationships`);
    return result;
  } catch (err) {
    toastMutationError('Import CSV', err);
    throw err;
  }
}

export interface CsvExportResult {
  elements: string;
  relations: string;
  properties: string;
}

const CsvExportResultSchema = z.object({
  elements: z.string(),
  relations: z.string(),
  properties: z.string(),
});

export function exportCsv(): Promise<CsvExportResult> {
  return request('/export/csv', CsvExportResultSchema);
}

// ═══════════════════════════════════════
// HTML Report Export
// ═══════════════════════════════════════

export async function exportHtmlReport(): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/html`);
  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new ApiError(response.status, `${response.status}: ${body}`);
  }
  const html = await response.text();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'architecture-report.html';
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════
// Model File Operations (Open / Save / Close)
// ═══════════════════════════════════════

export interface ModelFileData {
  version: number;
  exportedAt: string;
  domains: unknown[];
  elements: unknown[];
  relationships: unknown[];
  views: unknown[];
  viewElements: unknown[];
  viewRelationships: unknown[];
}

const ModelFileDataSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  domains: z.array(z.unknown()),
  elements: z.array(z.unknown()),
  relationships: z.array(z.unknown()),
  views: z.array(z.unknown()),
  viewElements: z.array(z.unknown()),
  viewRelationships: z.array(z.unknown()),
});

export interface ModelImportResult {
  success: boolean;
  elementsImported: number;
  relationshipsImported: number;
  viewsImported: number;
}

const ModelImportResultSchema = z.object({
  success: z.boolean(),
  elementsImported: z.number(),
  relationshipsImported: z.number(),
  viewsImported: z.number(),
});

export interface ModelResetResult {
  success: boolean;
  seeded: boolean;
  elements: number;
}

const ModelResetResultSchema = z.object({
  success: z.boolean(),
  seeded: z.boolean(),
  elements: z.number(),
});

/** GET /api/export/model-full — full model export for .archvis file */
export function exportModelFull(): Promise<ModelFileData> {
  return request('/export/model-full', ModelFileDataSchema);
}

/** POST /api/import/model-full — replace model with .archvis file contents */
export async function importModelFull(data: ModelFileData): Promise<ModelImportResult> {
  try {
    const result = await request('/import/model-full', ModelImportResultSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('Model imported', `${result.elementsImported} elements, ${result.relationshipsImported} relationships, ${result.viewsImported} views`);
    return result;
  } catch (err) {
    toastMutationError('Import model', err);
    throw err;
  }
}

/** POST /api/model/reset — clear the model; optionally reload seed data */
export function resetModel(seed: boolean = true): Promise<ModelResetResult> {
  return request(`/model/reset?seed=${seed}`, ModelResetResultSchema, {
    method: 'POST',
  });
}

/** Trigger browser download of model as .archvis file */
export async function saveModelFile(): Promise<void> {
  const data = await exportModelFull();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().slice(0, 10);
  a.download = `model-${timestamp}.archvis`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open file picker, read .archvis file, import to server, reload state */
export function openModelFile(): Promise<ModelImportResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.archvis';
    input.onchange = async () => {
      if (!input.files?.[0]) {
        reject(new Error('No file selected'));
        return;
      }
      try {
        const text = await input.files[0].text();
        const data = JSON.parse(text) as ModelFileData;
        const result = await importModelFull(data);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

// ═══════════════════════════════════════
// Element → Views lookup
// ═══════════════════════════════════════

export function fetchElementViews(elementId: string): Promise<View[]> {
  return request(
    `/elements/${encodeURIComponent(elementId)}/views`,
    z.array(ViewSchema),
  );
}

// ═══════════════════════════════════════
// Process Steps
// ═══════════════════════════════════════

import { ProcessStepSchema, type ProcessStep, type CreateProcessStepInput } from '../model/types';

export function fetchProcessSteps(processId: string): Promise<ProcessStep[]> {
  return request(
    `/process-steps/${encodeURIComponent(processId)}`,
    z.array(ProcessStepSchema),
  );
}

export async function createProcessStep(data: CreateProcessStepInput): Promise<ProcessStep & { element_id: string }> {
  try {
    const result = await request(
      '/process-steps',
      ProcessStepSchema.extend({ element_id: z.string() }) as z.ZodType<ProcessStep & { element_id: string }>,
      { method: 'POST', body: JSON.stringify(data) },
    );
    notifySuccess('Process step created', result.name);
    return result;
  } catch (err) {
    toastMutationError('Create process step', err, data);
    throw err;
  }
}

export async function updateProcessStep(
  id: string,
  data: Partial<Omit<ProcessStep, 'id' | 'process_id' | 'sequence'>>,
): Promise<ProcessStep> {
  try {
    const result = await request(
      `/process-steps/${encodeURIComponent(id)}`,
      ProcessStepSchema,
      { method: 'PUT', body: JSON.stringify(data) },
    );
    notifySuccess('Process step updated', result.name);
    return result;
  } catch (err) {
    toastMutationError('Update process step', err, data);
    throw err;
  }
}

export async function deleteProcessStep(id: string): Promise<void> {
  try {
    await requestVoid(`/process-steps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    notifySuccess('Process step deleted');
  } catch (err) {
    toastMutationError('Delete process step', err);
    throw err;
  }
}

export async function reorderProcessSteps(stepIds: string[]): Promise<{ success: boolean; count: number }> {
  try {
    const result = await request(
      '/process-steps/reorder',
      z.object({ success: z.boolean(), count: z.number() }),
      { method: 'POST', body: JSON.stringify({ step_ids: stepIds }) },
    );
    notifySuccess('Process steps reordered', `${result.count} steps`);
    return result;
  } catch (err) {
    toastMutationError('Reorder process steps', err);
    throw err;
  }
}

// ═══════════════════════════════════════
// Projects
// ═══════════════════════════════════════

export function fetchProjects(): Promise<Project[]> {
  return request('/projects', z.array(ProjectSchema));
}

export function fetchCurrentProject(): Promise<Project> {
  return request('/projects/current', ProjectSchema);
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  try {
    const result = await request('/projects', ProjectSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifySuccess('Project created', result.name);
    return result;
  } catch (err) {
    toastMutationError('Create project', err, data);
    throw err;
  }
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
  try {
    const result = await request(`/projects/${encodeURIComponent(id)}`, ProjectSchema, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    notifySuccess('Project updated', result.name);
    return result;
  } catch (err) {
    toastMutationError('Update project', err, data);
    throw err;
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await requestVoid(`/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    notifySuccess('Project deleted');
  } catch (err) {
    toastMutationError('Delete project', err);
    throw err;
  }
}

export async function switchProject(id: string): Promise<Project> {
  try {
    const result = await request('/projects/current', ProjectSchema, {
      method: 'PUT',
      body: JSON.stringify({ id }),
    });
    notifySuccess('Switched to project', result.name);
    return result;
  } catch (err) {
    toastMutationError('Switch project', err);
    throw err;
  }
}

// ═══════════════════════════════════════
// Promote / Demote
// ═══════════════════════════════════════

const AreaResultSchema = z.object({ id: z.string(), area: z.string() });

export async function promoteElement(id: string): Promise<{ id: string; area: string }> {
  return request(`/elements/${encodeURIComponent(id)}/promote`, AreaResultSchema, { method: 'POST' });
}

export async function demoteElement(id: string): Promise<{ id: string; area: string }> {
  return request(`/elements/${encodeURIComponent(id)}/demote`, AreaResultSchema, { method: 'POST' });
}

export async function promoteRelationship(id: string): Promise<{ id: string; area: string }> {
  return request(`/relationships/${encodeURIComponent(id)}/promote`, AreaResultSchema, { method: 'POST' });
}

export async function demoteRelationship(id: string): Promise<{ id: string; area: string }> {
  return request(`/relationships/${encodeURIComponent(id)}/demote`, AreaResultSchema, { method: 'POST' });
}

export async function promoteView(id: string): Promise<{ id: string; area: string }> {
  return request(`/views/${encodeURIComponent(id)}/promote`, AreaResultSchema, { method: 'POST' });
}

export async function demoteView(id: string): Promise<{ id: string; area: string }> {
  return request(`/views/${encodeURIComponent(id)}/demote`, AreaResultSchema, { method: 'POST' });
}

export { ApiError };
