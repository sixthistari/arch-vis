/**
 * RelationshipTypePicker — popup menu for selecting relationship type
 * when the user draws a connection between two elements.
 */
import React from 'react';
import type { ValidRelationship } from '../../model/types';

export const ARCHIMATE_REL_TYPES = [
  { value: 'association',    label: 'Association' },
  { value: 'serving',        label: 'Serving' },
  { value: 'assignment',     label: 'Assignment' },
  { value: 'realisation',    label: 'Realisation' },
  { value: 'composition',    label: 'Composition' },
  { value: 'aggregation',    label: 'Aggregation' },
  { value: 'influence',      label: 'Influence' },
  { value: 'triggering',     label: 'Triggering' },
  { value: 'flow',           label: 'Flow' },
  { value: 'access',         label: 'Access' },
  { value: 'specialisation', label: 'Specialisation' },
];

export const UML_REL_TYPES = [
  { value: 'uml-inheritance',   label: 'Inheritance' },
  { value: 'uml-realisation',   label: 'Realisation' },
  { value: 'uml-composition',   label: 'Composition' },
  { value: 'uml-aggregation',   label: 'Aggregation' },
  { value: 'uml-association',   label: 'Association' },
  { value: 'uml-dependency',    label: 'Dependency' },
  { value: 'uml-control-flow',  label: 'Control Flow' },
  { value: 'uml-object-flow',   label: 'Object Flow' },
];

export const WF_REL_TYPES = [
  { value: 'wf-contains',      label: 'Contains' },
  { value: 'wf-navigates-to',  label: 'Navigates To' },
  { value: 'wf-binds-to',      label: 'Binds To' },
];

export const DM_REL_TYPES = [
  { value: 'dm-has-attribute',  label: 'Has Attribute' },
  { value: 'dm-references',     label: 'References' },
  { value: 'dm-one-to-one',     label: 'One-to-One' },
  { value: 'dm-one-to-many',    label: 'One-to-Many' },
  { value: 'dm-many-to-many',   label: 'Many-to-Many' },
];

export const PF_REL_TYPES = [
  { value: 'pf-sequence-flow',    label: 'Sequence Flow' },
  { value: 'pf-conditional-flow', label: 'Conditional Flow' },
  { value: 'pf-error-flow',       label: 'Error Flow' },
];

export interface PendingConnection {
  sourceId: string;
  targetId: string;
  x: number;
  y: number;
}

export function RelationshipTypePicker({
  conn, onSelect, onCancel, theme, sourceType, targetType, validRelationships, sourceNotation,
}: {
  conn: PendingConnection;
  onSelect: (type: string) => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
  sourceType: string;
  targetType: string;
  validRelationships: ValidRelationship[];
  sourceNotation?: 'archimate' | 'uml' | 'wireframe' | 'data' | 'process-flow';
}) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const invalidColour = isDark ? '#4B5563' : '#CBD5E1';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';

  // Select relationship type list based on source notation
  const relTypes = sourceNotation === 'uml' ? UML_REL_TYPES
    : sourceNotation === 'wireframe' ? WF_REL_TYPES
    : sourceNotation === 'data' ? DM_REL_TYPES
    : sourceNotation === 'process-flow' ? PF_REL_TYPES
    : ARCHIMATE_REL_TYPES;

  // Build a set of valid relationship types for this source→target pair
  const validSet = React.useMemo(() => {
    const set = new Set<string>();
    // Association is universally valid
    set.add('association');
    // Specialisation is valid between same-type elements
    if (sourceType === targetType) {
      set.add('specialisation');
    }
    // Check the valid_relationships table
    for (const vr of validRelationships) {
      if (vr.source_archimate_type === sourceType && vr.target_archimate_type === targetType) {
        set.add(vr.relationship_type);
      }
    }
    return set;
  }, [sourceType, targetType, validRelationships]);

  // Sort: valid types first, then invalid
  const sortedTypes = React.useMemo(() => {
    const valid = relTypes.filter(rt => validSet.has(rt.value));
    const invalid = relTypes.filter(rt => !validSet.has(rt.value));
    return { valid, invalid };
  }, [validSet, relTypes]);

  // Keep picker inside the canvas bounds
  const pickerW = 200;
  const clampedX = Math.min(conn.x, window.innerWidth - pickerW - 20);

  return (
    <div
      style={{
        position: 'absolute',
        left: clampedX,
        top: conn.y,
        zIndex: 2000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: '4px 0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
        minWidth: pickerW,
        fontFamily: 'Inter, system-ui, sans-serif',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{ padding: '4px 12px 6px', fontSize: 10, color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Relationship type
      </div>
      {sortedTypes.valid.map(rt => (
        <div
          key={rt.value}
          onClick={() => onSelect(rt.value)}
          style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: textColour }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {rt.label}
        </div>
      ))}
      {sortedTypes.invalid.length > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${border}`, margin: '4px 0' }} />
          <div style={{ padding: '2px 12px 4px', fontSize: 9, color: isDark ? '#4B5563' : '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Not valid for this pair
          </div>
          {sortedTypes.invalid.map(rt => (
            <div
              key={rt.value}
              title="Not valid per ArchiMate 3.2 metamodel for this element pair"
              style={{ padding: '5px 12px', cursor: 'not-allowed', fontSize: 11, color: invalidColour, opacity: 0.4, userSelect: 'none' }}
            >
              {rt.label}
            </div>
          ))}
        </>
      )}
      <div style={{ borderTop: `1px solid ${border}`, margin: '4px 0' }} />
      <div
        onClick={onCancel}
        style={{ padding: '5px 12px', cursor: 'pointer', fontSize: 11, color: '#EF4444' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        Cancel
      </div>
    </div>
  );
}
