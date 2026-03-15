/**
 * EdgeContextMenu — right-click context menu for edges, allowing
 * line type changes, relationship type changes, direction reversal, and deletion.
 */
import React from 'react';
import type { Relationship, Element, ValidRelationship } from '../../model/types';
import { getNotation } from '../../model/notation';
import { NOTATION_RELATIONSHIP_TYPES } from '../../shared/layer-config';

export interface EdgeContextMenuState {
  edgeId: string;
  x: number;
  y: number;
}

export type EdgeMenuAction =
  | { kind: 'lineType'; value: 'straight' | 'bezier' | 'step' }
  | { kind: 'changeType'; value: string }
  | { kind: 'reverse' }
  | { kind: 'delete' };

export interface EdgeContextMenuProps {
  menu: EdgeContextMenuState;
  onAction: (edgeId: string, action: EdgeMenuAction) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
  relationship: Relationship | null;
  elements: Element[];
  validRelationships: ValidRelationship[];
}

/** Build the set of valid relationship types for a source→target pair. */
function buildValidSet(
  sourceType: string,
  targetType: string,
  validRelationships: ValidRelationship[],
): Set<string> {
  const set = new Set<string>();
  set.add('association');
  if (sourceType === targetType) set.add('specialisation');
  for (const vr of validRelationships) {
    if (vr.source_archimate_type === sourceType && vr.target_archimate_type === targetType) {
      set.add(vr.relationship_type);
    }
  }
  return set;
}

export function EdgeContextMenu({
  menu, onAction, onClose, theme, relationship, elements, validRelationships,
}: EdgeContextMenuProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';
  const mutedColour = isDark ? '#64748B' : '#94A3B8';

  const [submenuOpen, setSubmenuOpen] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Valid types for current direction
  const validSetForward = React.useMemo(() => {
    const sourceEl = relationship ? elements.find(e => e.id === relationship.source_id) : null;
    const targetEl = relationship ? elements.find(e => e.id === relationship.target_id) : null;
    if (!sourceEl || !targetEl) return new Set<string>();
    return buildValidSet(sourceEl.archimate_type, targetEl.archimate_type, validRelationships);
  }, [relationship, elements, validRelationships]);

  // Valid types for reversed direction
  const reverseValid = React.useMemo(() => {
    const sourceEl = relationship ? elements.find(e => e.id === relationship.source_id) : null;
    const targetEl = relationship ? elements.find(e => e.id === relationship.target_id) : null;
    if (!sourceEl || !targetEl) return false;
    const reverseSet = buildValidSet(targetEl.archimate_type, sourceEl.archimate_type, validRelationships);
    return relationship ? reverseSet.has(relationship.archimate_type) : false;
  }, [relationship, elements, validRelationships]);

  // Get notation-specific relationship type list
  const relTypeOptions = React.useMemo(() => {
    const sourceEl = relationship ? elements.find(e => e.id === relationship.source_id) : null;
    if (!sourceEl) return NOTATION_RELATIONSHIP_TYPES.archimate;
    const n = getNotation(sourceEl.archimate_type);
    if (n === 'uml') return NOTATION_RELATIONSHIP_TYPES.uml;
    if (n === 'wireframe') return NOTATION_RELATIONSHIP_TYPES.wireframe;
    if (n === 'data') return NOTATION_RELATIONSHIP_TYPES.data;
    return NOTATION_RELATIONSHIP_TYPES.archimate;
  }, [relationship, elements]);

  // Split into valid and invalid, excluding the current type
  const { validTypes, invalidTypes } = React.useMemo(() => {
    const valid = relTypeOptions.filter(
      rt => validSetForward.has(rt.value) && rt.value !== relationship?.archimate_type,
    );
    const invalid = relTypeOptions.filter(
      rt => !validSetForward.has(rt.value) && rt.value !== relationship?.archimate_type,
    );
    return { validTypes: valid, invalidTypes: invalid };
  }, [relTypeOptions, validSetForward, relationship?.archimate_type]);

  const itemStyle: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: textColour,
    whiteSpace: 'nowrap',
  };

  const disabledStyle: React.CSSProperties = {
    ...itemStyle,
    cursor: 'not-allowed',
    opacity: 0.4,
    color: mutedColour,
  };

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent) => {
      (e.currentTarget as HTMLElement).style.background = hoverBg;
    },
    onMouseLeave: (e: React.MouseEvent) => {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
    },
  };

  const separatorStyle: React.CSSProperties = {
    height: 1,
    background: border,
    margin: '4px 0',
  };

  const sectionLabelStyle: React.CSSProperties = {
    padding: '3px 12px 2px',
    fontSize: 9,
    color: mutedColour,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: menu.y,
        left: menu.x,
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: '4px 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: 180,
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Line style section */}
      <div style={sectionLabelStyle}>Line Style</div>
      {(['step', 'straight', 'bezier'] as const).map(lt => (
        <div
          key={lt}
          onClick={() => onAction(menu.edgeId, { kind: 'lineType', value: lt })}
          style={itemStyle}
          {...hoverHandlers}
        >
          {lt === 'step' ? 'Orthogonal (default)' : lt === 'straight' ? 'Straight' : 'Curved'}
        </div>
      ))}

      {/* Change Type submenu */}
      {relationship && validTypes.length > 0 && (
        <>
          <div style={separatorStyle} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setSubmenuOpen('changeType')}
            onMouseLeave={() => setSubmenuOpen(null)}
          >
            <div
              style={{
                ...itemStyle,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              {...hoverHandlers}
            >
              <span>Change Type</span>
              <span style={{ marginLeft: 12, opacity: 0.5, fontSize: 9 }}>{'\u25B6'}</span>
            </div>
            {submenuOpen === 'changeType' && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 4,
                  padding: '4px 0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  minWidth: 160,
                  maxHeight: '60vh',
                  overflowY: 'auto',
                }}
              >
                <div style={sectionLabelStyle}>Valid Types</div>
                {validTypes.map(rt => (
                  <div
                    key={rt.value}
                    onClick={() => onAction(menu.edgeId, { kind: 'changeType', value: rt.value })}
                    style={itemStyle}
                    {...hoverHandlers}
                  >
                    {rt.label}
                  </div>
                ))}
                {invalidTypes.length > 0 && (
                  <>
                    <div style={separatorStyle} />
                    <div style={sectionLabelStyle}>Not Valid for This Pair</div>
                    {invalidTypes.map(rt => (
                      <div
                        key={rt.value}
                        title="Not valid per metamodel for this element pair"
                        style={disabledStyle}
                      >
                        {rt.label}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Reverse Direction */}
      {relationship && (
        <>
          <div style={separatorStyle} />
          <div
            onClick={reverseValid ? () => onAction(menu.edgeId, { kind: 'reverse' }) : undefined}
            style={reverseValid ? itemStyle : disabledStyle}
            title={reverseValid ? undefined : 'Reversed direction is not valid per metamodel'}
            {...(reverseValid ? hoverHandlers : {})}
          >
            Reverse Direction
          </div>
        </>
      )}

      {/* Delete */}
      <div style={separatorStyle} />
      <div
        onClick={() => onAction(menu.edgeId, { kind: 'delete' })}
        style={{ ...itemStyle, color: '#EF4444' }}
        {...hoverHandlers}
      >
        Delete
      </div>
    </div>
  );
}
