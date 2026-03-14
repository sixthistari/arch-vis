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
  DomainSchema,
  ElementSchema,
  RelationshipSchema,
  ViewSchema,
  ViewElementSchema,
  ViewRelationshipSchema,
  SublayerConfigSchema,
  ValidRelationshipSchema,
  HealthResponseSchema,
} from '../model/types';
import { z } from 'zod';

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

export function createDomain(data: CreateDomainInput): Promise<Domain> {
  return request('/domains', DomainSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

export function createElement(data: CreateElementInput): Promise<Element> {
  return request('/elements', ElementSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateElement(
  id: string,
  data: Omit<UpdateElementInput, 'id'>,
): Promise<Element> {
  return request(`/elements/${encodeURIComponent(id)}`, ElementSchema, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteElement(id: string): Promise<void> {
  return requestVoid(`/elements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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

export function createRelationship(
  data: CreateRelationshipInput,
): Promise<Relationship> {
  return request('/relationships', RelationshipSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteRelationship(id: string): Promise<void> {
  return requestVoid(`/relationships/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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
  return request(`/views/${encodeURIComponent(id)}`, ViewDetailSchema);
}

export function createView(data: CreateViewInput): Promise<View> {
  return request('/views', ViewSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateViewElements(
  viewId: string,
  elements: ViewElement[],
): Promise<ViewElement[]> {
  return request(
    `/views/${encodeURIComponent(viewId)}/elements`,
    z.array(ViewElementSchema),
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

export interface BatchElementInput {
  id?: string;
  name: string;
  archimate_type: string;
  layer: string;
  specialisation?: string | null;
  sublayer?: string | null;
  description?: string | null;
  children?: BatchElementInput[];
}

export interface BatchRelationshipInput {
  id?: string;
  archimate_type: string;
  source_id?: string;
  source_name?: string;
  target_id?: string;
  target_name?: string;
  label?: string | null;
  specialisation?: string | null;
}

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

export function importModelBatch(payload: BatchImportPayload): Promise<BatchImportResult> {
  return request('/import/model-batch', z.object({
    success: z.boolean(),
    elementsCreated: z.number(),
    relationshipsCreated: z.number(),
    viewId: z.string().nullable(),
  }) as z.ZodType<BatchImportResult>, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

export function importArchimateXml(xml: string): Promise<ArchimateImportResult> {
  return request('/import/archimate-xml', ArchimateImportResultSchema, {
    method: 'POST',
    body: JSON.stringify({ xml }),
  });
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

export function importCsv(data: CsvImportPayload): Promise<CsvImportResult> {
  return request('/import/csv', CsvImportResultSchema, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
// Element → Views lookup
// ═══════════════════════════════════════

export function fetchElementViews(elementId: string): Promise<View[]> {
  return request(
    `/elements/${encodeURIComponent(elementId)}/views`,
    z.array(ViewSchema),
  );
}

export { ApiError };
