/**
 * Unified edge style registry — single source of truth for all notation edge styles.
 *
 * Merges ArchiMate, UML (class/component/sequence), and wireframe edge styles
 * into one lookup. Pure data, no React.
 */

export type MarkerType =
  | 'filled-diamond'
  | 'open-diamond'
  | 'filled-circle'
  | 'filled-arrow'
  | 'open-arrow'
  | 'open-triangle'
  | 'uml-hollow-triangle'
  | 'uml-filled-diamond'
  | 'uml-hollow-diamond'
  | 'uml-open-arrow'
  | 'uml-filled-arrow'
  | 'dm-one'
  | 'dm-many'
  | 'none';

export interface UnifiedEdgeStyle {
  strokeStyle: 'solid' | 'dashed';
  dashArray: string;
  width: number;
  sourceMarker: MarkerType | null;
  targetMarker: MarkerType | null;
  /** If true, render as a straight horizontal line (sequence messages). */
  isMessage?: boolean;
  /** If true, self-message uses loop-back arc. */
  isSelfMessage?: boolean;
  /** If true, render inline arrowhead instead of SVG marker (sequence). */
  inlineArrow?: boolean;
  /** Filled or open arrowhead for inline rendering. */
  filledArrow?: boolean;
}

const STYLES: Record<string, UnifiedEdgeStyle> = {
  // ── ArchiMate ──────────────────────────────────────────────────────────
  composition: {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'filled-diamond', targetMarker: null,
  },
  aggregation: {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'open-diamond', targetMarker: null,
  },
  assignment: {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'filled-circle', targetMarker: 'filled-arrow',
  },
  realisation: {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'open-triangle',
  },
  serving: {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: 'open-arrow',
  },
  access: {
    strokeStyle: 'dashed', dashArray: '4 3', width: 1.0,
    sourceMarker: null, targetMarker: 'open-arrow',
  },
  influence: {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'open-arrow',
  },
  triggering: {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  flow: {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  specialisation: {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: 'open-triangle',
  },
  association: {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: null,
  },

  // ── UML class / component ──────────────────────────────────────────────
  'uml-inheritance': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: null, targetMarker: 'uml-hollow-triangle',
  },
  'uml-realisation': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-hollow-triangle',
  },
  'uml-composition': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'uml-filled-diamond', targetMarker: null,
  },
  'uml-aggregation': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'uml-hollow-diamond', targetMarker: null,
  },
  'uml-association': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
  },
  'uml-dependency': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
  },
  'uml-assembly': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: null,
  },

  // ── UML sequence messages ──────────────────────────────────────────────
  'sync-message': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: null, targetMarker: null,
    isMessage: true, inlineArrow: true, filledArrow: true,
  },
  'async-message': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: null,
    isMessage: true, inlineArrow: true, filledArrow: false,
  },
  'return-message': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: null,
    isMessage: true, inlineArrow: true, filledArrow: false,
  },
  'create-message': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: null,
    isMessage: true, inlineArrow: true, filledArrow: false,
  },
  'destroy-message': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: null, targetMarker: null,
    isMessage: true, inlineArrow: true, filledArrow: true,
  },
  'self-message': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: null,
    isMessage: true, isSelfMessage: true, inlineArrow: true, filledArrow: true,
  },

  // ── UML activity ────────────────────────────────────────────────────────
  'uml-control-flow': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
  },
  'uml-object-flow': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
  },

  // ── Wireframe ──────────────────────────────────────────────────────────
  'wf-navigates-to': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  'wf-binds-to': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: 'open-arrow',
  },
  'wf-contains': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: null,
  },

  // ── Data Modelling ──────────────────────────────────────────────
  'dm-has-attribute': {
    strokeStyle: 'solid', dashArray: '', width: 1.0,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  'dm-references': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'open-arrow',
  },
  'dm-one-to-one': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'dm-one', targetMarker: 'dm-one',
  },
  'dm-one-to-many': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'dm-one', targetMarker: 'dm-many',
  },
  'dm-many-to-many': {
    strokeStyle: 'solid', dashArray: '', width: 1.2,
    sourceMarker: 'dm-many', targetMarker: 'dm-many',
  },

  // ── Process Flow ────────────────────────────────────────────────────
  'pf-sequence-flow': {
    strokeStyle: 'solid', dashArray: '', width: 1.4,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  'pf-conditional-flow': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.2,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
  'pf-error-flow': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.2,
    sourceMarker: null, targetMarker: 'filled-arrow',
  },
};

/** Default fallback style (plain association line). */
const DEFAULT_STYLE = STYLES['association']!;

/**
 * Look up the unified edge style for a given relationship type.
 * Falls back to a plain association line for unknown types.
 */
export function getUnifiedEdgeStyle(relationshipType: string): UnifiedEdgeStyle {
  return STYLES[relationshipType] ?? DEFAULT_STYLE;
}
