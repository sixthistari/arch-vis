import type { EdgeTypes } from '@xyflow/react';
import { ArchimateEdge } from './ArchimateEdge';
import { UmlEdge } from './uml/UmlEdge';
import { SequenceMessageEdge } from './sequence/SequenceMessageEdge';

export const edgeTypes: EdgeTypes = {
  archimate: ArchimateEdge,
  'uml-edge': UmlEdge,
  'sequence-message': SequenceMessageEdge,
};

export { ArchimateEdge } from './ArchimateEdge';
export type { ArchimateEdgeData } from './ArchimateEdge';
export { UmlEdge } from './uml/UmlEdge';
export type { UmlEdgeData } from './uml/UmlEdge';
export { SequenceMessageEdge } from './sequence/SequenceMessageEdge';
export type { SequenceMessageEdgeData } from './sequence/SequenceMessageEdge';
