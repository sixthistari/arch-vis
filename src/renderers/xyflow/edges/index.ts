import type { EdgeTypes } from '@xyflow/react';
import { ArchimateEdge } from './ArchimateEdge';
import { UmlEdge } from './uml/UmlEdge';

export const edgeTypes: EdgeTypes = {
  archimate: ArchimateEdge,
  'uml-edge': UmlEdge,
};

export { ArchimateEdge } from './ArchimateEdge';
export type { ArchimateEdgeData } from './ArchimateEdge';
export { UmlEdge } from './uml/UmlEdge';
export type { UmlEdgeData } from './uml/UmlEdge';
