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
  /** Override stroke colour (e.g. red for error flows). */
  color?: string;
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
  'uml-include': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
  },
  'uml-extend': {
    strokeStyle: 'dashed', dashArray: '6 3', width: 1.0,
    sourceMarker: null, targetMarker: 'uml-open-arrow',
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
    color: '#EF4444',
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

/**
 * Legacy alias — flat/spatial SVG renderers use the simpler name.
 */
export const getEdgeStyle = getUnifiedEdgeStyle;

/**
 * SVG marker definitions for flat/spatial SVG renderers.
 * (xyflow uses AllMarkerDefs.tsx instead.)
 */
export function renderMarkerDefs(): string {
  return `
    <marker id="marker-filled-diamond" viewBox="0 0 12 8" refX="12" refY="4" markerWidth="12" markerHeight="8" orient="auto">
      <polygon points="0,4 6,0 12,4 6,8" fill="currentColor" />
    </marker>
    <marker id="marker-open-diamond" viewBox="0 0 12 8" refX="12" refY="4" markerWidth="12" markerHeight="8" orient="auto">
      <polygon points="0,4 6,0 12,4 6,8" fill="none" stroke="currentColor" stroke-width="1" />
    </marker>
    <marker id="marker-filled-circle" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="8" markerHeight="8" orient="auto">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </marker>
    <marker id="marker-filled-arrow" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="10" markerHeight="8" orient="auto">
      <polygon points="0,0 10,4 0,8" fill="currentColor" />
    </marker>
    <marker id="marker-open-arrow" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="10" markerHeight="8" orient="auto">
      <polyline points="0,0 10,4 0,8" fill="none" stroke="currentColor" stroke-width="1.2" />
    </marker>
    <marker id="marker-open-triangle" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" orient="auto">
      <polygon points="0,0 10,5 0,10" fill="none" stroke="currentColor" stroke-width="1" />
    </marker>
  `;
}
