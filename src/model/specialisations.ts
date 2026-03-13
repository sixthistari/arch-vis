import type { ArchimateLayer, ArchimateType, Specialisation } from './types';

export interface SpecialisationInfo {
  code: string;
  label: string;
  baseType: ArchimateType;
  layer: ArchimateLayer;
}

/**
 * All 55 specialisation entries from reference/specialisation-profile.md.
 * Code is the short badge code (e.g., 'A1', 'DA1', 'M1').
 */
export const specialisationMap: Record<Specialisation, SpecialisationInfo> = {
  // ── Motivation (M1–M7) ─────────────────────────
  'ai-guardrail': {
    code: 'M1',
    label: 'AI Guardrail',
    baseType: 'constraint',
    layer: 'motivation',
  },
  'autonomy-level': {
    code: 'M2',
    label: 'Autonomy Level',
    baseType: 'constraint',
    layer: 'motivation',
  },
  'explanation-requirement': {
    code: 'M3',
    label: 'Explanation Requirement',
    baseType: 'requirement',
    layer: 'motivation',
  },
  'track-crossing-protocol': {
    code: 'M4',
    label: 'Track-Crossing Protocol',
    baseType: 'principle',
    layer: 'motivation',
  },
  'human-in-the-loop-gate': {
    code: 'M5',
    label: 'Human-in-the-Loop Gate',
    baseType: 'requirement',
    layer: 'motivation',
  },
  'safety-case': {
    code: 'M6',
    label: 'Safety Case',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'data-classification-policy': {
    code: 'M7',
    label: 'Data Classification Policy',
    baseType: 'constraint',
    layer: 'motivation',
  },

  // ── Strategy (ST1–ST3) ─────────────────────────
  'knowledge-capability': {
    code: 'ST1',
    label: 'Knowledge Capability',
    baseType: 'capability',
    layer: 'strategy',
  },
  'domain-boundary': {
    code: 'ST2',
    label: 'Domain Boundary',
    baseType: 'capability',
    layer: 'strategy',
  },
  'ai-use-case': {
    code: 'ST3',
    label: 'AI Use Case',
    baseType: 'course-of-action',
    layer: 'strategy',
  },

  // ── Business (B1–B8) ───────────────────────────
  'authority-rule': {
    code: 'B1',
    label: 'Authority Rule',
    baseType: 'contract',
    layer: 'business',
  },
  'domain-vocabulary': {
    code: 'B2',
    label: 'Domain Vocabulary',
    baseType: 'business-object',
    layer: 'business',
  },
  'ground-truth-dataset': {
    code: 'B3',
    label: 'Ground Truth Dataset',
    baseType: 'business-object',
    layer: 'business',
  },
  'scoring-profile': {
    code: 'B4',
    label: 'Scoring Profile',
    baseType: 'contract',
    layer: 'business',
  },
  'extraction-rule': {
    code: 'B5',
    label: 'Extraction Rule',
    baseType: 'contract',
    layer: 'business',
  },
  'chunking-strategy': {
    code: 'B6',
    label: 'Chunking Strategy',
    baseType: 'contract',
    layer: 'business',
  },
  'content-type-registry': {
    code: 'B7',
    label: 'Content Type Registry',
    baseType: 'business-object',
    layer: 'business',
  },
  'review-cycle-policy': {
    code: 'B8',
    label: 'Review Cycle Policy',
    baseType: 'contract',
    layer: 'business',
  },

  // ── Application (A1–A11) ───────────────────────
  'domain-agent': {
    code: 'A1',
    label: 'Domain Agent',
    baseType: 'application-component',
    layer: 'application',
  },
  'orchestration-engine': {
    code: 'A2',
    label: 'Orchestration Engine',
    baseType: 'application-component',
    layer: 'application',
  },
  'query-router': {
    code: 'A3',
    label: 'Query Router',
    baseType: 'application-service',
    layer: 'application',
  },
  'knowledge-retrieval-service': {
    code: 'A4',
    label: 'Knowledge Retrieval Service',
    baseType: 'application-service',
    layer: 'application',
  },
  'context-engine': {
    code: 'A5',
    label: 'Context Engine',
    baseType: 'application-component',
    layer: 'application',
  },
  'entity-resolution-service': {
    code: 'A6',
    label: 'Entity Resolution Service',
    baseType: 'application-service',
    layer: 'application',
  },
  'reasoning-trace': {
    code: 'A7',
    label: 'Reasoning Trace',
    baseType: 'application-function',
    layer: 'application',
  },
  'ingestion-pipeline': {
    code: 'A8',
    label: 'Ingestion Pipeline',
    baseType: 'application-process',
    layer: 'application',
  },
  'reflection-loop': {
    code: 'A9',
    label: 'Reflection Loop',
    baseType: 'application-function',
    layer: 'application',
  },
  'plan-execute-split': {
    code: 'A10',
    label: 'Plan-Execute Split',
    baseType: 'application-collaboration',
    layer: 'application',
  },
  'compliance-assessment': {
    code: 'A11',
    label: 'Compliance Assessment',
    baseType: 'application-function',
    layer: 'application',
  },

  // ── Technology (T1–T8) ─────────────────────────
  'search-engine': {
    code: 'T1',
    label: 'Search Engine',
    baseType: 'system-software',
    layer: 'technology',
  },
  'graph-database': {
    code: 'T2',
    label: 'Graph Database',
    baseType: 'system-software',
    layer: 'technology',
  },
  'llm-gateway': {
    code: 'T3',
    label: 'LLM Gateway',
    baseType: 'system-software',
    layer: 'technology',
  },
  'embedding-service': {
    code: 'T4',
    label: 'Embedding Service',
    baseType: 'system-software',
    layer: 'technology',
  },
  'document-intelligence': {
    code: 'T5',
    label: 'Document Intelligence',
    baseType: 'system-software',
    layer: 'technology',
  },
  'guardrail-engine': {
    code: 'T6',
    label: 'Guardrail Engine',
    baseType: 'system-software',
    layer: 'technology',
  },
  'observability-platform': {
    code: 'T7',
    label: 'Observability Platform',
    baseType: 'system-software',
    layer: 'technology',
  },
  'agent-framework': {
    code: 'T8',
    label: 'Agent Framework',
    baseType: 'system-software',
    layer: 'technology',
  },

  // ── Data (DA1–DA12) ────────────────────────────
  'knowledge-store': {
    code: 'DA1',
    label: 'Knowledge Store',
    baseType: 'data-object',
    layer: 'data',
  },
  'core-ontology': {
    code: 'DA2',
    label: 'Core Ontology',
    baseType: 'data-object',
    layer: 'data',
  },
  'ontology-extension': {
    code: 'DA3',
    label: 'Ontology Extension',
    baseType: 'data-object',
    layer: 'data',
  },
  'vector-index': {
    code: 'DA4',
    label: 'Vector Index',
    baseType: 'artifact',
    layer: 'data',
  },
  'medallion-store': {
    code: 'DA5',
    label: 'Medallion Store',
    baseType: 'artifact',
    layer: 'data',
  },
  'graph-instance': {
    code: 'DA6',
    label: 'Graph Instance',
    baseType: 'artifact',
    layer: 'data',
  },
  'source-connector': {
    code: 'DA7',
    label: 'Source Connector',
    baseType: 'artifact',
    layer: 'data',
  },
  'fallback-path': {
    code: 'DA8',
    label: 'Fallback Path',
    baseType: 'artifact',
    layer: 'data',
  },
  'prompt-library': {
    code: 'DA9',
    label: 'Prompt Library',
    baseType: 'data-object',
    layer: 'data',
  },
  'decision-trace-log': {
    code: 'DA10',
    label: 'Decision Trace Log',
    baseType: 'data-object',
    layer: 'data',
  },
  'session-memory-store': {
    code: 'DA11',
    label: 'Session Memory Store',
    baseType: 'artifact',
    layer: 'data',
  },
  'model-catalogue': {
    code: 'DA12',
    label: 'Model Catalogue',
    baseType: 'data-object',
    layer: 'data',
  },

  // ── Quality (Q1–Q6) ────────────────────────────
  'retrieval-quality': {
    code: 'Q1',
    label: 'Retrieval Quality',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'generation-quality': {
    code: 'Q2',
    label: 'Generation Quality',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'graph-quality': {
    code: 'Q3',
    label: 'Graph Quality',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'extraction-quality': {
    code: 'Q4',
    label: 'Extraction Quality',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'end-to-end-quality': {
    code: 'Q5',
    label: 'End-to-End Quality',
    baseType: 'assessment',
    layer: 'motivation',
  },
  'quality-gate': {
    code: 'Q6',
    label: 'Quality Gate',
    baseType: 'assessment',
    layer: 'motivation',
  },
};

/**
 * Look up specialisation info by specialisation key.
 */
export function getSpecialisationInfo(spec: Specialisation): SpecialisationInfo {
  return specialisationMap[spec];
}

/**
 * Get the badge code for rendering on the canvas.
 */
export function getSpecialisationCode(spec: Specialisation): string {
  return specialisationMap[spec].code;
}
