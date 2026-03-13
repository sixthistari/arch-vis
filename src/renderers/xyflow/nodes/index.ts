import type { NodeTypes } from '@xyflow/react';
import { ArchimateNode } from './ArchimateNode';
import { UmlClassNode } from './uml/UmlClassNode';
import { UmlComponentNode } from './uml/UmlComponentNode';
import { UmlStateNode } from './uml/UmlStateNode';
import { UmlLifelineNode, UmlActivationNode, UmlFragmentNode } from './uml/UmlSequenceNodes';
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
  'uml-state': UmlStateNode,
  'uml-lifeline': UmlLifelineNode,
  'uml-activation': UmlActivationNode,
  'uml-fragment': UmlFragmentNode,
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
export { UmlStateNode } from './uml/UmlStateNode';
export type { UmlStateNodeData } from './uml/UmlStateNode';
export { UmlLifelineNode, UmlActivationNode, UmlFragmentNode } from './uml/UmlSequenceNodes';
export type { UmlLifelineNodeData, UmlActivationNodeData, UmlFragmentNodeData } from './uml/UmlSequenceNodes';

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
