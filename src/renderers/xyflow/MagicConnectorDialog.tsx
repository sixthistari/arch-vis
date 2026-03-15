/**
 * MagicConnectorDialog — create element + relationship in one step.
 *
 * Shown when the user drags a connection handle and drops on empty canvas.
 * Lets the user pick an element type, enter a name, and choose a relationship type,
 * then creates the new element, adds it to the view, and creates the relationship.
 */
import React, { useState, useMemo } from 'react';
import type { ValidRelationship } from '../../model/types';
import { getNotation } from '../../model/notation';
import {
  ARCHIMATE_REL_TYPES,
  UML_REL_TYPES,
  WF_REL_TYPES,
  DM_REL_TYPES,
  PF_REL_TYPES,
} from './RelationshipTypePicker';

export interface MagicConnectorState {
  sourceId: string;
  /** Screen-relative position within the canvas container */
  x: number;
  y: number;
  /** Flow-space position where the new element should be placed */
  flowX: number;
  flowY: number;
}

interface ElementTypeEntry {
  type: string;
  label: string;
  group: string;
  layer: string;
}

/**
 * Build a flat list of element types appropriate for a given notation,
 * using the same groupings as the Palette.
 */
function getElementTypesForNotation(notation: 'archimate' | 'uml' | 'wireframe' | 'data' | 'process-flow' | 'any', viewpointType?: string): ElementTypeEntry[] {
  const fmt = (t: string) => t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (notation === 'uml') {
    // Filter by viewpoint sub-type
    if (viewpointType === 'uml_activity') {
      return [
        { type: 'uml-action', label: 'Action', group: 'Action Nodes', layer: 'application' },
        { type: 'uml-decision', label: 'Decision', group: 'Action Nodes', layer: 'application' },
        { type: 'uml-merge', label: 'Merge', group: 'Action Nodes', layer: 'application' },
        { type: 'uml-initial-node', label: 'Initial Node', group: 'Control Nodes', layer: 'application' },
        { type: 'uml-final-node', label: 'Final Node', group: 'Control Nodes', layer: 'application' },
        { type: 'uml-flow-final', label: 'Flow Final', group: 'Control Nodes', layer: 'application' },
        { type: 'uml-fork', label: 'Fork', group: 'Control Nodes', layer: 'application' },
        { type: 'uml-join', label: 'Join', group: 'Control Nodes', layer: 'application' },
        { type: 'uml-swimlane', label: 'Swimlane', group: 'Partitions', layer: 'application' },
      ];
    }
    if (viewpointType === 'uml_usecase') {
      return [
        { type: 'uml-actor', label: 'Actor', group: 'Elements', layer: 'application' },
        { type: 'uml-use-case', label: 'Use Case', group: 'Elements', layer: 'application' },
      ];
    }
    if (viewpointType === 'uml_sequence') {
      return [
        { type: 'uml-lifeline', label: 'Lifeline', group: 'Elements', layer: 'application' },
        { type: 'uml-activation', label: 'Activation', group: 'Elements', layer: 'application' },
        { type: 'uml-fragment', label: 'Fragment', group: 'Elements', layer: 'application' },
      ];
    }
    // Default: class/component
    return [
      { type: 'uml-class', label: 'Class', group: 'Classes', layer: 'application' },
      { type: 'uml-abstract-class', label: 'Abstract Class', group: 'Classes', layer: 'application' },
      { type: 'uml-interface', label: 'Interface', group: 'Classes', layer: 'application' },
      { type: 'uml-enum', label: 'Enum', group: 'Classes', layer: 'application' },
      { type: 'uml-package', label: 'Package', group: 'Classes', layer: 'application' },
      { type: 'uml-component', label: 'Component', group: 'Components', layer: 'application' },
      { type: 'uml-actor', label: 'Actor', group: 'Other', layer: 'application' },
      { type: 'uml-use-case', label: 'Use Case', group: 'Other', layer: 'application' },
      { type: 'uml-note', label: 'Note', group: 'Other', layer: 'application' },
      { type: 'uml-state', label: 'State', group: 'Other', layer: 'application' },
    ];
  }

  if (notation === 'wireframe') {
    return [
      { type: 'wf-page', label: 'Page', group: 'Layout', layer: 'implementation' },
      { type: 'wf-section', label: 'Section', group: 'Layout', layer: 'implementation' },
      { type: 'wf-card', label: 'Card', group: 'Layout', layer: 'implementation' },
      { type: 'wf-modal', label: 'Modal', group: 'Layout', layer: 'implementation' },
      { type: 'wf-header', label: 'Header', group: 'Layout', layer: 'implementation' },
      { type: 'wf-button', label: 'Button', group: 'Controls', layer: 'implementation' },
      { type: 'wf-input', label: 'Input', group: 'Controls', layer: 'implementation' },
      { type: 'wf-textarea', label: 'Text Area', group: 'Controls', layer: 'implementation' },
      { type: 'wf-select', label: 'Select', group: 'Controls', layer: 'implementation' },
      { type: 'wf-table', label: 'Table', group: 'Data', layer: 'implementation' },
      { type: 'wf-list', label: 'List', group: 'Data', layer: 'implementation' },
      { type: 'wf-form', label: 'Form', group: 'Data', layer: 'implementation' },
      { type: 'wf-nav', label: 'Nav', group: 'Navigation', layer: 'implementation' },
      { type: 'wf-link', label: 'Link', group: 'Navigation', layer: 'implementation' },
      { type: 'wf-text', label: 'Text', group: 'Content', layer: 'implementation' },
      { type: 'wf-image', label: 'Image', group: 'Content', layer: 'implementation' },
    ];
  }

  if (notation === 'data') {
    if (viewpointType === 'data_physical') {
      return [
        { type: 'dm-table', label: 'Table', group: 'Tables', layer: 'data' },
        { type: 'dm-column', label: 'Column', group: 'Columns', layer: 'data' },
        { type: 'dm-primary-key', label: 'Primary Key', group: 'Columns', layer: 'data' },
        { type: 'dm-foreign-key', label: 'Foreign Key', group: 'Columns', layer: 'data' },
        { type: 'dm-index', label: 'Index', group: 'Columns', layer: 'data' },
      ];
    }
    if (viewpointType === 'data_logical') {
      return [
        { type: 'dm-entity', label: 'Entity', group: 'Entities', layer: 'data' },
        { type: 'dm-attribute', label: 'Attribute', group: 'Attributes', layer: 'data' },
        { type: 'dm-primary-key', label: 'Primary Key', group: 'Attributes', layer: 'data' },
        { type: 'dm-foreign-key', label: 'Foreign Key', group: 'Attributes', layer: 'data' },
      ];
    }
    // Conceptual
    return [
      { type: 'dm-entity', label: 'Entity', group: 'Entities', layer: 'data' },
    ];
  }

  if (notation === 'process-flow') {
    return [
      { type: 'pf-human-task', label: 'Human Task', group: 'Tasks', layer: 'none' },
      { type: 'pf-agent-task', label: 'Agent Task', group: 'Tasks', layer: 'none' },
      { type: 'pf-system-call', label: 'System Call', group: 'Tasks', layer: 'none' },
      { type: 'pf-start', label: 'Start', group: 'Control', layer: 'none' },
      { type: 'pf-end', label: 'End', group: 'Control', layer: 'none' },
      { type: 'pf-decision', label: 'Decision', group: 'Control', layer: 'none' },
      { type: 'pf-gateway', label: 'Parallel Gateway', group: 'Control', layer: 'none' },
      { type: 'pf-approval-gate', label: 'Approval Gate', group: 'Control', layer: 'none' },
      { type: 'pf-timer', label: 'Timer', group: 'Control', layer: 'none' },
      { type: 'pf-swimlane', label: 'Swimlane', group: 'Containers', layer: 'none' },
      { type: 'pf-subprocess', label: 'Subprocess', group: 'Containers', layer: 'none' },
    ];
  }

  // ArchiMate — common types grouped by layer
  return [
    // Business
    { type: 'business-actor', label: fmt('business-actor'), group: 'Business', layer: 'business' },
    { type: 'business-role', label: fmt('business-role'), group: 'Business', layer: 'business' },
    { type: 'business-process', label: fmt('business-process'), group: 'Business', layer: 'business' },
    { type: 'business-function', label: fmt('business-function'), group: 'Business', layer: 'business' },
    { type: 'business-service', label: fmt('business-service'), group: 'Business', layer: 'business' },
    { type: 'business-object', label: fmt('business-object'), group: 'Business', layer: 'business' },
    { type: 'business-event', label: fmt('business-event'), group: 'Business', layer: 'business' },
    { type: 'business-interface', label: fmt('business-interface'), group: 'Business', layer: 'business' },
    { type: 'business-collaboration', label: fmt('business-collaboration'), group: 'Business', layer: 'business' },
    { type: 'business-interaction', label: fmt('business-interaction'), group: 'Business', layer: 'business' },
    { type: 'contract', label: 'Contract', group: 'Business', layer: 'business' },
    { type: 'product', label: 'Product', group: 'Business', layer: 'business' },
    { type: 'representation', label: 'Representation', group: 'Business', layer: 'business' },
    // Application
    { type: 'application-component', label: fmt('application-component'), group: 'Application', layer: 'application' },
    { type: 'application-function', label: fmt('application-function'), group: 'Application', layer: 'application' },
    { type: 'application-process', label: fmt('application-process'), group: 'Application', layer: 'application' },
    { type: 'application-service', label: fmt('application-service'), group: 'Application', layer: 'application' },
    { type: 'application-interface', label: fmt('application-interface'), group: 'Application', layer: 'application' },
    { type: 'application-event', label: fmt('application-event'), group: 'Application', layer: 'application' },
    { type: 'application-collaboration', label: fmt('application-collaboration'), group: 'Application', layer: 'application' },
    { type: 'application-interaction', label: fmt('application-interaction'), group: 'Application', layer: 'application' },
    { type: 'data-object', label: 'Data Object', group: 'Application', layer: 'application' },
    // Technology
    { type: 'node', label: 'Node', group: 'Technology', layer: 'technology' },
    { type: 'device', label: 'Device', group: 'Technology', layer: 'technology' },
    { type: 'system-software', label: fmt('system-software'), group: 'Technology', layer: 'technology' },
    { type: 'technology-service', label: fmt('technology-service'), group: 'Technology', layer: 'technology' },
    { type: 'technology-function', label: fmt('technology-function'), group: 'Technology', layer: 'technology' },
    { type: 'technology-process', label: fmt('technology-process'), group: 'Technology', layer: 'technology' },
    { type: 'technology-interface', label: fmt('technology-interface'), group: 'Technology', layer: 'technology' },
    { type: 'artifact', label: 'Artifact', group: 'Technology', layer: 'technology' },
    { type: 'communication-network', label: fmt('communication-network'), group: 'Technology', layer: 'technology' },
    // Motivation
    { type: 'stakeholder', label: 'Stakeholder', group: 'Motivation', layer: 'motivation' },
    { type: 'driver', label: 'Driver', group: 'Motivation', layer: 'motivation' },
    { type: 'goal', label: 'Goal', group: 'Motivation', layer: 'motivation' },
    { type: 'requirement', label: 'Requirement', group: 'Motivation', layer: 'motivation' },
    { type: 'principle', label: 'Principle', group: 'Motivation', layer: 'motivation' },
    { type: 'constraint', label: 'Constraint', group: 'Motivation', layer: 'motivation' },
    // Strategy
    { type: 'capability', label: 'Capability', group: 'Strategy', layer: 'strategy' },
    { type: 'resource', label: 'Resource', group: 'Strategy', layer: 'strategy' },
    { type: 'value-stream', label: fmt('value-stream'), group: 'Strategy', layer: 'strategy' },
    { type: 'course-of-action', label: fmt('course-of-action'), group: 'Strategy', layer: 'strategy' },
    // Composite
    { type: 'grouping', label: 'Grouping', group: 'Other', layer: 'none' },
  ];
}

function getRelTypesForNotation(notation: 'archimate' | 'uml' | 'wireframe' | 'data' | 'process-flow' | 'any') {
  if (notation === 'uml') return UML_REL_TYPES;
  if (notation === 'wireframe') return WF_REL_TYPES;
  if (notation === 'data') return DM_REL_TYPES;
  if (notation === 'process-flow') return PF_REL_TYPES;
  return ARCHIMATE_REL_TYPES;
}

export function MagicConnectorDialog({
  state,
  onConfirm,
  onCancel,
  theme,
  sourceType,
  validRelationships,
  viewpointType,
}: {
  state: MagicConnectorState;
  onConfirm: (elementType: string, elementLayer: string, elementName: string, relType: string) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  sourceType: string;
  validRelationships: ValidRelationship[];
  viewpointType?: string;
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const mutedColour = isDark ? '#6B7280' : '#9CA3AF';
  const inputBg = isDark ? '#0F172A' : '#F8FAFC';
  const inputBorder = isDark ? '#475569' : '#CBD5E1';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';
  const accentColour = '#3B82F6';

  const sourceNotation = getNotation(sourceType);
  const notation = sourceNotation === 'any' ? 'archimate' : sourceNotation;

  const elementTypes = useMemo(
    () => getElementTypesForNotation(notation, viewpointType),
    [notation, viewpointType],
  );

  const [selectedType, setSelectedType] = useState<string>('');
  const [name, setName] = useState('');
  const [selectedRel, setSelectedRel] = useState<string>('');

  // Group element types for the dropdown
  const groups = useMemo(() => {
    const map = new Map<string, ElementTypeEntry[]>();
    for (const et of elementTypes) {
      const list = map.get(et.group) || [];
      list.push(et);
      map.set(et.group, list);
    }
    return map;
  }, [elementTypes]);

  // Determine valid relationship types for source → selected target type
  const relTypes = useMemo(() => getRelTypesForNotation(notation), [notation]);
  const validRelSet = useMemo(() => {
    if (!selectedType) return new Set<string>();
    const set = new Set<string>();
    // Association is universally valid
    if (notation === 'archimate') set.add('association');
    // Specialisation is valid between same-type elements
    if (sourceType === selectedType) {
      if (notation === 'archimate') set.add('specialisation');
    }
    // Check valid_relationships table
    for (const vr of validRelationships) {
      if (vr.source_archimate_type === sourceType && vr.target_archimate_type === selectedType) {
        set.add(vr.relationship_type);
      }
    }
    // For non-ArchiMate notations, all relationship types in the notation are valid
    if (notation !== 'archimate') {
      for (const rt of relTypes) set.add(rt.value);
    }
    return set;
  }, [sourceType, selectedType, validRelationships, notation, relTypes]);

  // Auto-select first valid relationship type when element type changes
  React.useEffect(() => {
    if (validRelSet.size > 0 && !validRelSet.has(selectedRel)) {
      const firstValid = relTypes.find(rt => validRelSet.has(rt.value));
      if (firstValid) setSelectedRel(firstValid.value);
    }
  }, [validRelSet, selectedRel, relTypes]);

  const selectedEntry = elementTypes.find(et => et.type === selectedType);
  const canSubmit = selectedType && name.trim() && selectedRel;

  const handleSubmit = () => {
    if (!canSubmit || !selectedEntry) return;
    onConfirm(selectedEntry.type, selectedEntry.layer, name.trim(), selectedRel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Position: clamp to stay within viewport
  const dialogW = 280;
  const dialogH = 320;
  const clampedX = Math.min(state.x, window.innerWidth - dialogW - 20);
  const clampedY = Math.min(state.y, window.innerHeight - dialogH - 20);

  return (
    <div
      style={{
        position: 'absolute',
        left: clampedX,
        top: clampedY,
        zIndex: 2000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        width: dialogW,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: textColour,
        marginBottom: 10,
        letterSpacing: 0.3,
      }}>
        Create Element + Connection
      </div>

      {/* Element Type */}
      <label style={{ fontSize: 10, color: mutedColour, fontWeight: 500, display: 'block', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        Element Type
      </label>
      <select
        value={selectedType}
        onChange={e => setSelectedType(e.target.value)}
        style={{
          width: '100%',
          padding: '5px 6px',
          fontSize: 11,
          background: inputBg,
          color: textColour,
          border: `1px solid ${inputBorder}`,
          borderRadius: 4,
          marginBottom: 8,
          outline: 'none',
          cursor: 'pointer',
        }}
        autoFocus
      >
        <option value="">Select type…</option>
        {[...groups.entries()].map(([groupName, entries]) => (
          <optgroup key={groupName} label={groupName}>
            {entries.map(et => (
              <option key={et.type} value={et.type}>{et.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Element Name */}
      <label style={{ fontSize: 10, color: mutedColour, fontWeight: 500, display: 'block', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        Name
      </label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter element name…"
        style={{
          width: '100%',
          padding: '5px 6px',
          fontSize: 11,
          background: inputBg,
          color: textColour,
          border: `1px solid ${inputBorder}`,
          borderRadius: 4,
          marginBottom: 8,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Relationship Type */}
      <label style={{ fontSize: 10, color: mutedColour, fontWeight: 500, display: 'block', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        Relationship Type
      </label>
      <select
        value={selectedRel}
        onChange={e => setSelectedRel(e.target.value)}
        disabled={!selectedType}
        style={{
          width: '100%',
          padding: '5px 6px',
          fontSize: 11,
          background: inputBg,
          color: !selectedType ? mutedColour : textColour,
          border: `1px solid ${inputBorder}`,
          borderRadius: 4,
          marginBottom: 12,
          outline: 'none',
          cursor: selectedType ? 'pointer' : 'default',
        }}
      >
        {!selectedType && <option value="">Choose element type first…</option>}
        {selectedType && validRelSet.size === 0 && <option value="">No valid types</option>}
        {relTypes.filter(rt => validRelSet.has(rt.value)).map(rt => (
          <option key={rt.value} value={rt.value}>{rt.label}</option>
        ))}
        {/* Show invalid types as disabled */}
        {selectedType && relTypes.filter(rt => !validRelSet.has(rt.value)).length > 0 && (
          <optgroup label="Not valid for this pair">
            {relTypes.filter(rt => !validRelSet.has(rt.value)).map(rt => (
              <option key={rt.value} value={rt.value} disabled>{rt.label}</option>
            ))}
          </optgroup>
        )}
      </select>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '4px 12px',
            fontSize: 11,
            background: 'transparent',
            color: mutedColour,
            border: `1px solid ${inputBorder}`,
            borderRadius: 4,
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: '4px 12px',
            fontSize: 11,
            background: canSubmit ? accentColour : (isDark ? '#1E293B' : '#E2E8F0'),
            color: canSubmit ? '#FFFFFF' : mutedColour,
            border: 'none',
            borderRadius: 4,
            cursor: canSubmit ? 'pointer' : 'default',
            fontWeight: 500,
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}
