/**
 * Shared database row interfaces used by both server routes and client code.
 * These represent the raw SQLite row shapes (properties as JSON string).
 */

// ═══════════════════════════════════════
// Database Row interfaces
// ═══════════════════════════════════════

export interface ElementRow {
  id: string;
  name: string;
  archimate_type: string;
  specialisation: string | null;
  layer: string;
  sublayer: string | null;
  domain_id: string | null;
  status: string;
  description: string | null;
  properties: string | null;
  confidence: number | null;
  source_session_id: string | null;
  parent_id: string | null;
  created_by: string | null;
  source: string | null;
  folder: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipRow {
  id: string;
  archimate_type: string;
  specialisation: string | null;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
  properties: string | null;
  confidence: number | null;
  created_by: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ViewRow {
  view_id: string;
  element_id: string;
}

// ═══════════════════════════════════════
// Batch import/export interfaces
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

export interface BatchImportBody {
  notation?: string;
  elements?: BatchElementInput[];
  relationships?: BatchRelationshipInput[];
  view?: {
    id?: string;
    name: string;
    viewpoint?: string;
    render_mode?: string;
  };
}
