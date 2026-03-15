/**
 * Feature Registry — maps every user-facing feature for help, tooltips,
 * and audit traceability.
 *
 * Each entry carries an audit ID from the requirements plan, a display name,
 * optional keyboard shortcut, category grouping, description, help text
 * (populated post-testing), and a code reference for developer traceability.
 */

export interface FeatureEntry {
  id: string;
  name: string;
  shortcut?: string;
  category: string;
  description: string;
  helpText: string;
  codeRef: string;
}

export const FEATURE_CATEGORIES = [
  'Model Management',
  'Views',
  'Canvas',
  'Elements',
  'Relationships',
  'ArchiMate',
  'UML',
  'Data Modelling',
  'Layout',
  'Import/Export',
  'Reporting',
  'Analysis',
  'Appearance',
] as const;

export type FeatureCategory = (typeof FEATURE_CATEGORIES)[number];

export const featureRegistry: readonly FeatureEntry[] = [
  // ── Model Management ──
  {
    id: '1.1',
    name: 'Create Model',
    shortcut: 'Ctrl+N',
    category: 'Model Management',
    description: 'Create a new blank model, replacing the current one.',
    helpText: '',
    codeRef: 'src/ui/Shell.tsx: FileMenu handleNew',
  },
  {
    id: '1.2',
    name: 'Open / Save / Close',
    shortcut: 'Ctrl+O / Ctrl+S',
    category: 'Model Management',
    description: 'Open a saved model file, save the current model, or close and reload seed data.',
    helpText: '',
    codeRef: 'src/ui/Shell.tsx: FileMenu handleOpen / handleSave / handleClose',
  },
  {
    id: '1.3',
    name: 'Model Tree',
    category: 'Model Management',
    description: 'Hierarchical tree showing all elements grouped by ArchiMate layer.',
    helpText: '',
    codeRef: 'src/ui/ModelTree.tsx: ModelTree',
  },
  {
    id: '1.4',
    name: 'Sub-folders',
    category: 'Model Management',
    description: 'Organise tree items into collapsible sub-folders by layer and type.',
    helpText: '',
    codeRef: 'src/ui/ModelTree.tsx: ModelTree',
  },
  {
    id: '1.5',
    name: 'Search / Filter Tree',
    category: 'Model Management',
    description: 'Filter the model tree by typing a search term to find elements.',
    helpText: '',
    codeRef: 'src/ui/ModelTree.tsx: ModelTree',
  },
  {
    id: '1.6',
    name: 'Find & Replace',
    shortcut: 'Ctrl+H',
    category: 'Model Management',
    description: 'Search element names model-wide and replace text in bulk or individually.',
    helpText: '',
    codeRef: 'src/ui/FindReplace.tsx: FindReplace',
  },
  {
    id: '1.7',
    name: 'Drag Tree to Canvas',
    category: 'Model Management',
    description: 'Drag an element from the model tree onto the canvas to add it to the current view.',
    helpText: '',
    codeRef: 'src/ui/ModelTree.tsx: ModelTree (drag handlers)',
  },
  {
    id: '1.8',
    name: 'Tree / Canvas Sync',
    category: 'Model Management',
    description: 'Selecting an element in the tree highlights it on the canvas and vice versa.',
    helpText: '',
    codeRef: 'src/store/interaction.ts: useInteractionStore',
  },
  {
    id: '1.9',
    name: 'Orphan Detection',
    category: 'Model Management',
    description: 'Identify elements that are not referenced in any view.',
    helpText: '',
    codeRef: 'src/ui/ValidationPanel.tsx: ValidationPanel',
  },
  {
    id: '1.10',
    name: 'Duplicate Element / View',
    category: 'Model Management',
    description: 'Create a copy of an element or an entire view.',
    helpText: '',
    codeRef: 'src/ui/ContextMenu.tsx: NodeContextMenu',
  },
  {
    id: '1.11',
    name: 'Change Element Type',
    category: 'Model Management',
    description: 'Change the ArchiMate or UML type of an existing element.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel',
  },

  // ── Views ──
  {
    id: '2.1',
    name: 'Create / Open / Rename / Delete View',
    category: 'Views',
    description: 'Manage views — create new, open existing, rename, or delete views.',
    helpText: '',
    codeRef: 'src/ui/ViewSwitcher.tsx: ViewSwitcher',
  },
  {
    id: '2.2',
    name: 'View Tabs',
    category: 'Views',
    description: 'Open multiple views as tabs and switch between them.',
    helpText: '',
    codeRef: 'src/ui/TabBar.tsx: TabBar',
  },
  {
    id: '2.3',
    name: 'Viewpoints',
    category: 'Views',
    description: 'Assign an ArchiMate or UML viewpoint type to a view, filtering allowed elements.',
    helpText: '',
    codeRef: 'src/notation/archimate-viewpoints.ts: viewpoints',
  },
  {
    id: '2.5',
    name: 'Generate from Selection',
    category: 'Views',
    description: 'Generate a new view from the currently selected elements.',
    helpText: '',
    codeRef: 'src/ui/ContextMenu.tsx: NodeContextMenu',
  },

  // ── Canvas ──
  {
    id: '3.1',
    name: 'Pan',
    category: 'Canvas',
    description: 'Pan the canvas by dragging the background or using scroll.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas',
  },
  {
    id: '3.2',
    name: 'Zoom',
    category: 'Canvas',
    description: 'Zoom in and out using scroll wheel or zoom controls.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas',
  },
  {
    id: '3.3',
    name: 'Minimap',
    category: 'Canvas',
    description: 'Overview minimap for navigating large diagrams.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas (MiniMap)',
  },
  {
    id: '3.4',
    name: 'Select / Multi-select',
    shortcut: 'Shift+Click / Shift+Drag',
    category: 'Canvas',
    description: 'Select individual elements or box-select multiple with shift-drag.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas',
  },
  {
    id: '3.5',
    name: 'Select All',
    shortcut: 'Ctrl+A',
    category: 'Canvas',
    description: 'Select all elements on the current canvas.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useCanvasKeyboard.ts: useCanvasKeyboard',
  },
  {
    id: '3.6',
    name: 'Alignment Tools',
    category: 'Canvas',
    description: 'Align selected elements by their edges or centres.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/AlignmentToolbar.tsx: AlignmentToolbar',
  },
  {
    id: '3.7',
    name: 'Snap to Grid',
    category: 'Canvas',
    description: 'Snap element positions to a configurable grid.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas (snapToGrid)',
  },
  {
    id: '3.8',
    name: 'Snaplines',
    category: 'Canvas',
    description: 'Visual guides that appear when aligning elements during drag.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/SnaplineOverlay.tsx: SnaplineOverlay',
  },
  {
    id: '3.9',
    name: 'Undo / Redo',
    shortcut: 'Ctrl+Z / Ctrl+Y',
    category: 'Canvas',
    description: 'Undo and redo canvas changes including moves, adds, and deletes.',
    helpText: '',
    codeRef: 'src/interaction/undo-redo.ts: useUndoRedoStore',
  },
  {
    id: '3.10',
    name: 'Copy / Paste',
    shortcut: 'Ctrl+C / Ctrl+V',
    category: 'Canvas',
    description: 'Copy selected elements and paste them onto the canvas.',
    helpText: '',
    codeRef: 'src/interaction/clipboard.ts: clipboard',
  },
  {
    id: '3.11',
    name: 'Delete from View vs Model',
    shortcut: 'Del / Ctrl+Del',
    category: 'Canvas',
    description: 'Delete removes from the current view; Ctrl+Delete removes from the model entirely.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useCanvasKeyboard.ts: useCanvasKeyboard',
  },
  {
    id: '3.12',
    name: 'Z-order',
    category: 'Canvas',
    description: 'Bring elements forward or send backward in the stacking order.',
    helpText: '',
    codeRef: 'src/ui/ContextMenu.tsx: NodeContextMenu',
  },
  {
    id: '3.13',
    name: 'Full Screen',
    shortcut: 'F11',
    category: 'Canvas',
    description: 'Toggle full-screen mode, hiding all panels for maximum canvas area.',
    helpText: '',
    codeRef: 'src/store/panel.ts: usePanelStore toggleFullScreen',
  },
  {
    id: '3.14',
    name: 'Keyboard Nudge',
    shortcut: 'Arrow keys',
    category: 'Canvas',
    description: 'Nudge selected elements by a small increment using arrow keys.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useCanvasKeyboard.ts: useCanvasKeyboard',
  },
  {
    id: '3.15',
    name: 'Inline Editing',
    category: 'Canvas',
    description: 'Double-click an element to edit its name directly on the canvas.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useEditableNode.ts: useEditableNode',
  },
  {
    id: '3.16',
    name: 'Resize',
    category: 'Canvas',
    description: 'Drag element handles to resize shapes on the canvas.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useNodeBehaviour.ts: useNodeBehaviour',
  },
  {
    id: '3.17',
    name: 'Format Painter',
    category: 'Canvas',
    description: 'Copy the appearance of one element and apply it to others.',
    helpText: '',
    codeRef: 'src/ui/Shell.tsx: handleFormatPainterClick',
  },

  // ── Elements ──
  {
    id: '4.1',
    name: 'Create from Palette',
    category: 'Elements',
    description: 'Click an element type in the palette to add it to the canvas.',
    helpText: '',
    codeRef: 'src/ui/Palette.tsx: Palette',
  },
  {
    id: '4.2',
    name: 'Create from Tree',
    category: 'Elements',
    description: 'Drag an existing element from the model tree onto the canvas.',
    helpText: '',
    codeRef: 'src/ui/ModelTree.tsx: ModelTree (drag handlers)',
  },
  {
    id: '4.3',
    name: 'Properties Panel',
    category: 'Elements',
    description: 'View and edit element properties in the detail panel.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel',
  },
  {
    id: '4.4',
    name: 'Custom Properties',
    category: 'Elements',
    description: 'Add key-value custom properties to any element.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel',
  },
  {
    id: '4.5',
    name: 'Per-element Appearance',
    category: 'Elements',
    description: 'Override colours and styles on individual elements in a view.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel (style overrides)',
  },
  {
    id: '4.6',
    name: 'Specialisations',
    category: 'Elements',
    description: 'Assign a specialisation sub-type to an ArchiMate element.',
    helpText: '',
    codeRef: 'src/model/specialisations.ts: specialisations',
  },
  {
    id: '4.7',
    name: 'Annotation Notes',
    category: 'Elements',
    description: 'Add free-text annotation notes to the canvas.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/AnnotationNode.tsx: AnnotationNode',
  },
  {
    id: '4.8',
    name: 'Groups',
    category: 'Elements',
    description: 'Create visual groups to organise related elements on the canvas.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/GroupNode.tsx: GroupNode',
  },
  {
    id: '4.9',
    name: 'Legend',
    category: 'Elements',
    description: 'Display a legend showing the colour and shape meaning for the current view.',
    helpText: '',
    codeRef: 'src/ui/Legend.tsx: Legend',
  },
  {
    id: '4.10',
    name: 'Container Nesting',
    category: 'Elements',
    description: 'Nest elements inside container shapes (groups, packages, boundaries).',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas (onNodeDrag nesting)',
  },

  // ── Relationships ──
  {
    id: '5.1',
    name: 'Drag-to-Connect',
    category: 'Relationships',
    description: 'Drag from a handle on one element to another to create a relationship.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/hooks/useCanvasConnection.ts: useCanvasConnection',
  },
  {
    id: '5.2',
    name: 'Type Picker',
    category: 'Relationships',
    description: 'Choose the relationship type when connecting two elements.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/RelationshipTypePicker.tsx: RelationshipTypePicker',
  },
  {
    id: '5.3',
    name: 'Magic Connector',
    category: 'Relationships',
    description: 'Automatically suggest valid relationship types based on the connected element types.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/MagicConnectorDialog.tsx: MagicConnectorDialog',
  },
  {
    id: '5.4',
    name: 'Waypoints',
    category: 'Relationships',
    description: 'Add intermediate waypoints to route connection lines.',
    helpText: '',
    codeRef: 'src/layout/edge-routing.ts: edge-routing',
  },
  {
    id: '5.5',
    name: 'Routing Modes',
    category: 'Relationships',
    description: 'Switch between straight, orthogonal, and curved edge routing.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/edge-routing-integration.ts: edge-routing-integration',
  },
  {
    id: '5.6',
    name: 'Connector Labels',
    category: 'Relationships',
    description: 'Add text labels to relationship connectors.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/edges/UnifiedEdge.tsx: UnifiedEdge',
  },
  {
    id: '5.7',
    name: 'Change Type',
    category: 'Relationships',
    description: 'Change the type of an existing relationship via the edge context menu.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/EdgeContextMenu.tsx: EdgeContextMenu',
  },
  {
    id: '5.8',
    name: 'Reverse Direction',
    category: 'Relationships',
    description: 'Swap source and target of a relationship.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/EdgeContextMenu.tsx: EdgeContextMenu',
  },
  {
    id: '5.9',
    name: 'Tooltip',
    category: 'Relationships',
    description: 'Hover over a relationship to see its type, source, and target.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/edges/UnifiedEdge.tsx: UnifiedEdge',
  },

  // ── ArchiMate ──
  {
    id: '6.1',
    name: 'All Element Types',
    category: 'ArchiMate',
    description: 'Full set of ArchiMate 3.2 element types across all layers.',
    helpText: '',
    codeRef: 'src/model/archetypes.ts: archetypes',
  },
  {
    id: '6.2',
    name: 'All Relationship Types',
    category: 'ArchiMate',
    description: 'Full set of ArchiMate relationship types (composition, aggregation, serving, etc.).',
    helpText: '',
    codeRef: 'src/notation/edges.ts: edges',
  },
  {
    id: '6.3',
    name: 'Notation Shapes',
    category: 'ArchiMate',
    description: 'Visual shapes matching ArchiMate 3.2 notation specification.',
    helpText: '',
    codeRef: 'src/notation/registry.ts: shapeRegistry',
  },
  {
    id: '6.4',
    name: 'Layer Colours',
    category: 'ArchiMate',
    description: 'Standard ArchiMate layer colour coding (Strategy, Business, Application, Technology, etc.).',
    helpText: '',
    codeRef: 'src/notation/colors.ts: layerColors',
  },
  {
    id: '6.5',
    name: 'Junctions',
    category: 'ArchiMate',
    description: 'And/Or junction elements for branching relationships.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/ArchimateNode.tsx: ArchimateNode',
  },
  {
    id: '6.6',
    name: 'Named Viewpoints',
    category: 'ArchiMate',
    description: 'Predefined ArchiMate viewpoints that filter element types for a view.',
    helpText: '',
    codeRef: 'src/notation/archimate-viewpoints.ts: ARCHIMATE_VIEWPOINTS',
  },
  {
    id: '6.7',
    name: 'Validation UI',
    category: 'ArchiMate',
    description: 'Validate the model against ArchiMate rules and display violations.',
    helpText: '',
    codeRef: 'src/ui/ValidationPanel.tsx: ValidationPanel',
  },
  {
    id: '6.8',
    name: 'Specialisations Manager',
    category: 'ArchiMate',
    description: 'Manage custom specialisation sub-types for ArchiMate elements.',
    helpText: '',
    codeRef: 'src/ui/SpecialisationsManager.tsx: SpecialisationsManager',
  },

  // ── UML ──
  {
    id: '7.1',
    name: 'Class Diagram',
    category: 'UML',
    description: 'UML class diagram with attributes, operations, and visibility.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlClassNode.tsx: UmlClassNode',
  },
  {
    id: '7.2',
    name: 'Inheritance',
    category: 'UML',
    description: 'UML generalisation/inheritance relationships between classes.',
    helpText: '',
    codeRef: 'src/notation/edge-styles.ts: uml-inheritance',
  },
  {
    id: '7.3',
    name: 'Association',
    category: 'UML',
    description: 'UML association relationships with multiplicity labels.',
    helpText: '',
    codeRef: 'src/notation/edge-styles.ts: uml-association',
  },
  {
    id: '7.4',
    name: 'Abstract / Interface / Enum',
    category: 'UML',
    description: 'Stereotyped class nodes for abstract classes, interfaces, and enumerations.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlClassNode.tsx: UmlClassNode (stereotypes)',
  },
  {
    id: '7.5',
    name: 'Use Case Diagram',
    category: 'UML',
    description: 'Use case diagram with actors, use cases, and system boundaries.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlUseCaseNode.tsx: UmlUseCaseNode',
  },
  {
    id: '7.6',
    name: 'Include / Extend',
    category: 'UML',
    description: 'Include and extend relationships between use cases.',
    helpText: '',
    codeRef: 'src/notation/edge-styles.ts: uml-include / uml-extend',
  },
  {
    id: '7.7',
    name: 'Activity Diagram',
    category: 'UML',
    description: 'Activity diagram with actions, decisions, forks, joins, and flow.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlActivityNode.tsx: UmlActivityNode',
  },
  {
    id: '7.8',
    name: 'Swimlanes',
    category: 'UML',
    description: 'Horizontal or vertical swimlanes to partition activity diagrams by actor.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlSwimlaneNode.tsx: UmlSwimlaneNode',
  },
  {
    id: '7.9',
    name: 'Sequence Diagram',
    category: 'UML',
    description: 'Sequence diagram with lifelines, messages, and activations.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlSequenceNodes.tsx: UmlSequenceNodes',
  },
  {
    id: '7.10',
    name: 'Combined Fragments',
    category: 'UML',
    description: 'Alt, opt, loop, and other combined fragments in sequence diagrams.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/sequence/SequenceFragmentNode.tsx: SequenceFragmentNode',
  },
  {
    id: '7.11',
    name: 'State Machine',
    category: 'UML',
    description: 'State machine diagram with states, transitions, initial/final pseudostates.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlStateNode.tsx: UmlStateNode',
  },
  {
    id: '7.12',
    name: 'Composite States',
    category: 'UML',
    description: 'Nested composite states containing sub-state machines.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlStateNode.tsx: UmlStateNode (composite)',
  },
  {
    id: '7.13',
    name: 'Component Diagram',
    category: 'UML',
    description: 'UML component diagram with provided/required interfaces.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlComponentNode.tsx: UmlComponentNode',
  },
  {
    id: '7.14',
    name: 'Package Diagram',
    category: 'UML',
    description: 'UML packages for organising model elements with dependency arrows.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/uml/UmlPackageNode.tsx: UmlPackageNode',
  },

  // ── Data Modelling ──
  {
    id: '8.1',
    name: 'Conceptual Data Model',
    category: 'Data Modelling',
    description: 'High-level entity-relationship diagram without implementation detail.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/data/DmEntityNode.tsx: DmEntityNode',
  },
  {
    id: '8.2',
    name: 'Logical Data Model',
    category: 'Data Modelling',
    description: 'Normalised entities with attributes and relationships.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/data/DmEntityNode.tsx: DmEntityNode',
  },
  {
    id: '8.3',
    name: 'Physical Data Model',
    category: 'Data Modelling',
    description: 'Database tables with columns, data types, and constraints.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/data/DmEntityNode.tsx: DmEntityNode',
  },
  {
    id: '8.4',
    name: 'Data Types',
    category: 'Data Modelling',
    description: 'Assign SQL/logical data types to entity attributes.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/data/DmEntityNode.tsx: DmEntityNode',
  },
  {
    id: '8.5',
    name: 'PK / FK',
    category: 'Data Modelling',
    description: 'Mark primary keys and foreign key relationships between entities.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/nodes/data/DmEntityNode.tsx: DmEntityNode',
  },

  // ── Layout ──
  {
    id: '10.1',
    name: 'Auto-layout',
    category: 'Layout',
    description: 'Automatically arrange elements using ELK or Dagre layout algorithms.',
    helpText: '',
    codeRef: 'src/layout/elk.ts: elkLayout / src/layout/dagre.ts: dagreLayout',
  },
  {
    id: '10.4',
    name: 'Manual Positioning',
    category: 'Layout',
    description: 'Drag elements freely and positions are saved per-view.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas (onNodeDragStop)',
  },
  {
    id: '10.5',
    name: 'Auto-route Connections',
    category: 'Layout',
    description: 'Automatically route connection paths to avoid overlapping elements.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/edge-routing-integration.ts: edge-routing-integration',
  },

  // ── Import/Export ──
  {
    id: '11.1',
    name: 'ArchiMate XML Import',
    category: 'Import/Export',
    description: 'Import an ArchiMate Open Exchange file (.xml).',
    helpText: '',
    codeRef: 'src/io/archimate-xml.ts: importArchimateXml',
  },
  {
    id: '11.2',
    name: 'ArchiMate XML Export',
    category: 'Import/Export',
    description: 'Export the model as an ArchiMate Open Exchange XML file.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.3',
    name: 'CSV Import',
    category: 'Import/Export',
    description: 'Import elements and relationships from Archi-format CSV files.',
    helpText: '',
    codeRef: 'src/io/csv.ts: importCsv',
  },
  {
    id: '11.4',
    name: 'CSV Export',
    category: 'Import/Export',
    description: 'Export elements and relationships to CSV files.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.7',
    name: 'PNG Export',
    category: 'Import/Export',
    description: 'Export the current view as a PNG image.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.8',
    name: 'SVG Export',
    category: 'Import/Export',
    description: 'Export the current view as a scalable SVG file.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.9',
    name: 'PDF Export',
    category: 'Import/Export',
    description: 'Export the current view as a PDF document.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.10',
    name: 'Copy to Clipboard',
    category: 'Import/Export',
    description: 'Copy the current view image to the system clipboard.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },
  {
    id: '11.12',
    name: 'Print',
    shortcut: 'Ctrl+P',
    category: 'Import/Export',
    description: 'Print the current diagram via the browser print dialog.',
    helpText: '',
    codeRef: 'src/ui/Shell.tsx: UndoRedoKeyHandler (Ctrl+P)',
  },

  // ── Reporting ──
  {
    id: '12.1',
    name: 'HTML Report',
    category: 'Reporting',
    description: 'Generate an HTML report of the model with diagrams and element details.',
    helpText: '',
    codeRef: 'src/ui/ExportMenu.tsx: ExportMenu',
  },

  // ── Analysis ──
  {
    id: '13.1',
    name: 'Relationship Navigator',
    category: 'Analysis',
    description: 'Navigate from an element to its related elements via relationships.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel (relationships section)',
  },
  {
    id: '13.2',
    name: 'Visual Explorer',
    category: 'Analysis',
    description: 'Interactively explore the model graph starting from a selected element.',
    helpText: '',
    codeRef: 'src/ui/ImpactAnalysisPanel.tsx: ImpactAnalysisPanel',
  },
  {
    id: '13.3',
    name: 'Relationship Matrix',
    category: 'Analysis',
    description: 'View a cross-reference matrix of elements and their relationships.',
    helpText: '',
    codeRef: 'src/ui/RelationshipMatrix.tsx: RelationshipMatrix',
  },
  {
    id: '13.4',
    name: 'Diagram Filters',
    category: 'Analysis',
    description: 'Filter which layers and element types are visible on the canvas.',
    helpText: '',
    codeRef: 'src/ui/LayerControls.tsx: LayerControls',
  },
  {
    id: '13.5',
    name: 'Impact Analysis',
    category: 'Analysis',
    description: 'Trace upstream and downstream impact of changes to an element.',
    helpText: '',
    codeRef: 'src/ui/ImpactAnalysisPanel.tsx: ImpactAnalysisPanel',
  },

  // ── Appearance ──
  {
    id: '14.1',
    name: 'Dark / Light Theme',
    category: 'Appearance',
    description: 'Toggle between dark and light colour themes.',
    helpText: '',
    codeRef: 'src/ui/ThemeToggle.tsx: ThemeToggle',
  },
  {
    id: '14.2',
    name: 'Per-element Override',
    category: 'Appearance',
    description: 'Override colours and font on individual elements within a view.',
    helpText: '',
    codeRef: 'src/ui/DetailPanel.tsx: DetailPanel (style overrides)',
  },
  {
    id: '14.3',
    name: 'Conditional Formatting',
    category: 'Appearance',
    description: 'Apply data-driven colour overlays based on element properties.',
    helpText: '',
    codeRef: 'src/ui/DataOverlayControls.tsx: DataOverlayControls',
  },
  {
    id: '14.4',
    name: 'Progressive Zoom',
    category: 'Appearance',
    description: 'Show more detail as you zoom in, less when zoomed out.',
    helpText: '',
    codeRef: 'src/renderers/xyflow/Canvas.tsx: XyFlowCanvas (zoom level detail)',
  },
] as const;

// ── Lookup helpers ──

const _byId = new Map<string, FeatureEntry>();
for (const entry of featureRegistry) {
  _byId.set(entry.id, entry);
}

/** Look up a feature by its audit ID (e.g. "3.9"). */
export function getFeature(id: string): FeatureEntry | undefined {
  return _byId.get(id);
}

/**
 * Return a tooltip string for a feature: "Name (Shortcut)" or just "Name".
 * Useful for toolbar button title attributes.
 */
export function getFeatureTooltip(id: string): string {
  const entry = _byId.get(id);
  if (!entry) return '';
  return entry.shortcut ? `${entry.name} (${entry.shortcut})` : entry.name;
}

/** Return all features in a given category. */
export function getFeaturesByCategory(category: string): FeatureEntry[] {
  return featureRegistry.filter(e => e.category === category);
}

/** Search features by a query string (matches name, description, shortcut, category). */
export function searchFeatures(query: string): FeatureEntry[] {
  if (!query.trim()) return [...featureRegistry];
  const q = query.toLowerCase();
  return featureRegistry.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    (e.shortcut && e.shortcut.toLowerCase().includes(q)) ||
    e.id.includes(q),
  );
}
