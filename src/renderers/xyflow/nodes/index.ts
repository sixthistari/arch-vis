import type { NodeTypes } from '@xyflow/react';
import { ArchimateNode } from './ArchimateNode';
import { UmlClassNode } from './uml/UmlClassNode';
import { UmlComponentNode } from './uml/UmlComponentNode';
import { UmlStateNode } from './uml/UmlStateNode';
import { UmlUseCaseNode } from './uml/UmlUseCaseNode';
import { UcdBoundaryNode } from './uml/UcdBoundaryNode';
import { UmlActivityNode } from './uml/UmlActivityNode';
import { UmlLifelineNode, UmlActivationNode, UmlFragmentNode } from './uml/UmlSequenceNodes';
import { SequenceLifelineNode } from './sequence/SequenceLifelineNode';
import { SequenceActivationNode } from './sequence/SequenceActivationNode';
import { SequenceFragmentNode } from './sequence/SequenceFragmentNode';
import { WfPageNode } from './wireframe/WfPageNode';
import { WfSectionNode } from './wireframe/WfSectionNode';
import { WfNavNode } from './wireframe/WfNavNode';
import { WfTableNode } from './wireframe/WfTableNode';
import { WfFormNode } from './wireframe/WfFormNode';
import { WfControlNode } from './wireframe/WfControlNode';
import { WfListNode } from './wireframe/WfListNode';
import { WfFeedbackNode } from './wireframe/WfFeedbackNode';
import { LayerBandNode } from './LayerBandNode';

export const nodeTypes: NodeTypes = {
  // ArchiMate
  archimate: ArchimateNode,
  'layer-band': LayerBandNode,
  // UML
  'uml-class': UmlClassNode,
  'uml-component': UmlComponentNode,
  'uml-use-case': UmlUseCaseNode,
  'ucd-boundary': UcdBoundaryNode,
  'uml-state': UmlStateNode,
  'uml-activity': UmlActivityNode,
  'uml-lifeline': UmlLifelineNode,
  'uml-activation': UmlActivationNode,
  'uml-fragment': UmlFragmentNode,
  // Sequence diagram (Phase 4)
  'sequence-lifeline': SequenceLifelineNode,
  'sequence-activation': SequenceActivationNode,
  'sequence-fragment': SequenceFragmentNode,
  // Wireframe
  'wf-page': WfPageNode,
  'wf-section': WfSectionNode,
  'wf-nav': WfNavNode,
  'wf-table': WfTableNode,
  'wf-form': WfFormNode,
  'wf-control': WfControlNode,
  'wf-list': WfListNode,
  'wf-feedback': WfFeedbackNode,
};

// ArchiMate exports
export { ArchimateNode } from './ArchimateNode';
export type { ArchimateNodeData } from './ArchimateNode';

// UML exports
export { UmlClassNode } from './uml/UmlClassNode';
export type { UmlClassNodeData } from './uml/UmlClassNode';
export { UmlComponentNode } from './uml/UmlComponentNode';
export type { UmlComponentNodeData } from './uml/UmlComponentNode';
export { UmlUseCaseNode } from './uml/UmlUseCaseNode';
export type { UmlUseCaseNodeData } from './uml/UmlUseCaseNode';
export { UcdBoundaryNode } from './uml/UcdBoundaryNode';
export type { UcdBoundaryNodeData } from './uml/UcdBoundaryNode';
export { UmlStateNode } from './uml/UmlStateNode';
export type { UmlStateNodeData } from './uml/UmlStateNode';
export { UmlActivityNode } from './uml/UmlActivityNode';
export type { UmlActivityNodeData } from './uml/UmlActivityNode';
export { UmlLifelineNode, UmlActivationNode, UmlFragmentNode } from './uml/UmlSequenceNodes';
export type { UmlLifelineNodeData, UmlActivationNodeData, UmlFragmentNodeData } from './uml/UmlSequenceNodes';
export { SequenceLifelineNode } from './sequence/SequenceLifelineNode';
export type { SequenceLifelineNodeData } from './sequence/SequenceLifelineNode';
export { SequenceActivationNode } from './sequence/SequenceActivationNode';
export type { SequenceActivationNodeData } from './sequence/SequenceActivationNode';
export { SequenceFragmentNode } from './sequence/SequenceFragmentNode';
export type { SequenceFragmentNodeData } from './sequence/SequenceFragmentNode';

// Wireframe exports
export { WfPageNode } from './wireframe/WfPageNode';
export type { WfPageNodeData } from './wireframe/WfPageNode';
export { WfSectionNode } from './wireframe/WfSectionNode';
export type { WfSectionNodeData } from './wireframe/WfSectionNode';
export { WfNavNode } from './wireframe/WfNavNode';
export type { WfNavNodeData } from './wireframe/WfNavNode';
export { WfTableNode } from './wireframe/WfTableNode';
export type { WfTableNodeData } from './wireframe/WfTableNode';
export { WfFormNode } from './wireframe/WfFormNode';
export type { WfFormNodeData } from './wireframe/WfFormNode';
export { WfControlNode } from './wireframe/WfControlNode';
export type { WfControlNodeData } from './wireframe/WfControlNode';
export { WfListNode } from './wireframe/WfListNode';
export type { WfListNodeData } from './wireframe/WfListNode';
export { WfFeedbackNode } from './wireframe/WfFeedbackNode';
export type { WfFeedbackNodeData } from './wireframe/WfFeedbackNode';
