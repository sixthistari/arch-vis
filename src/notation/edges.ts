export interface EdgeStyle {
  strokeStyle: 'solid' | 'dashed';
  dashArray: string;
  width: number;
  sourceMarker: MarkerType | null;
  targetMarker: MarkerType | null;
}

export type MarkerType =
  | 'filled-diamond'
  | 'open-diamond'
  | 'filled-circle'
  | 'filled-arrow'
  | 'open-arrow'
  | 'open-triangle'
  | 'none';

const EDGE_STYLES: Record<string, EdgeStyle> = {
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
};

export function getEdgeStyle(relationshipType: string): EdgeStyle {
  return EDGE_STYLES[relationshipType] ?? EDGE_STYLES['association']!;
}

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
