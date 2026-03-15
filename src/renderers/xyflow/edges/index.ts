import type { EdgeTypes } from '@xyflow/react';
import { UnifiedEdge } from './UnifiedEdge';

export const edgeTypes: EdgeTypes = {
  archimate: UnifiedEdge,
  'uml-edge': UnifiedEdge,
  'sequence-message': UnifiedEdge,
  'wireframe': UnifiedEdge,
  'data-edge': UnifiedEdge,
  'pf-edge': UnifiedEdge,
};

export { UnifiedEdge } from './UnifiedEdge';
export type { UnifiedEdgeData } from './UnifiedEdge';
export type { LineType } from './UnifiedEdge';

// Re-export legacy types for backward compatibility during transition
export type { UnifiedEdgeData as ArchimateEdgeData } from './UnifiedEdge';
