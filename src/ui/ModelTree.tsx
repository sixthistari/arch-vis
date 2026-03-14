/**
 * ModelTree — hierarchical tree of all elements grouped by notation, then by
 * sub-category (ArchiMate layer, UML diagram type, wireframe category).
 *
 * Provides: click-to-select, search filtering, orphan detection (elements not
 * in the current view are shown in italic), drag-to-canvas.
 */
import { useState, useMemo, useCallback } from 'react';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { useThemeStore } from '../store/theme';
import type { Element } from '../model/types';

// ═══════════════════════════════════════
// ArchiMate layer grouping (existing)
// ═══════════════════════════════════════

const LAYER_ORDER = [
  'motivation', 'strategy', 'business', 'business_upper', 'business_lower',
  'application', 'data', 'technology', 'implementation',
];

const LAYER_LABELS: Record<string, string> = {
  motivation: 'Motivation',
  strategy: 'Strategy',
  business: 'Business',
  business_upper: 'Business — Functions',
  business_lower: 'Business — Services',
  application: 'Application',
  data: 'Data & Artefacts',
  technology: 'Technology',
  implementation: 'Implementation',
};

// ═══════════════════════════════════════
// UML sub-grouping
// ═══════════════════════════════════════

const UML_GROUPS: Record<string, string[]> = {
  'Classes': ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum', 'uml-package'],
  'Components': ['uml-component'],
  'Behavioural': ['uml-actor', 'uml-use-case', 'uml-state', 'uml-activity', 'uml-note'],
  'Sequence': ['uml-lifeline', 'uml-activation', 'uml-fragment'],
};

const UML_GROUP_ORDER = ['Classes', 'Components', 'Behavioural', 'Sequence'];

// Build a reverse lookup: type → group label
const UML_TYPE_TO_GROUP = new Map<string, string>();
for (const [group, types] of Object.entries(UML_GROUPS)) {
  for (const t of types) UML_TYPE_TO_GROUP.set(t, group);
}

// ═══════════════════════════════════════
// Wireframe sub-grouping
// ═══════════════════════════════════════

const WF_GROUPS: Record<string, string[]> = {
  'Layout': ['wf-page', 'wf-section', 'wf-card', 'wf-modal', 'wf-header'],
  'Controls': ['wf-button', 'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio'],
  'Data': ['wf-table', 'wf-list', 'wf-form'],
  'Navigation': ['wf-nav', 'wf-link', 'wf-tab-group'],
  'Content': ['wf-text', 'wf-image', 'wf-icon', 'wf-placeholder'],
};

const WF_GROUP_ORDER = ['Layout', 'Controls', 'Data', 'Navigation', 'Content'];

const WF_TYPE_TO_GROUP = new Map<string, string>();
for (const [group, types] of Object.entries(WF_GROUPS)) {
  for (const t of types) WF_TYPE_TO_GROUP.set(t, group);
}

// ═══════════════════════════════════════
// Shared components
// ═══════════════════════════════════════

interface TreeNodeProps {
  element: Element;
  isOrphan: boolean;
  isSelected: boolean;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
}

function TreeNode({ element, isOrphan, isSelected, theme, onSelect }: TreeNodeProps) {
  const isDark = theme === 'dark';
  const bg = isSelected
    ? (isDark ? '#1E3A5F' : '#DBEAFE')
    : 'transparent';
  const textColour = isDark ? '#E5E7EB' : '#111827';

  return (
    <div
      draggable
      onClick={() => onSelect(element.id)}
      onDragStart={(e: React.DragEvent) => {
        e.dataTransfer.setData('application/archvis-tree', JSON.stringify({
          elementId: element.id,
          archimateType: element.archimate_type,
          layer: element.layer,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={element.description ?? element.name}
      style={{
        padding: '3px 8px 3px 16px',
        cursor: 'grab',
        background: bg,
        color: textColour,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: isOrphan ? 'italic' : 'normal',
        opacity: isOrphan ? 0.6 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        borderRadius: 2,
      }}
    >
      {element.name}
    </div>
  );
}

// ═══════════════════════════════════════
// Sub-group component (used by all notations)
// ═══════════════════════════════════════

interface SubGroupProps {
  label: string;
  elements: Element[];
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
}

function SubGroup({ label, elements, orphanIds, selectedId, theme, onSelect }: SubGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';
  const headerColour = isDark ? '#94A3B8' : '#64748B';
  const borderColour = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 600,
          color: headerColour,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          borderTop: `1px solid ${borderColour}`,
          userSelect: 'none',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{label}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{elements.length}</span>
      </div>
      {expanded && elements.map(el => (
        <TreeNode
          key={el.id}
          element={el}
          isOrphan={orphanIds.has(el.id)}
          isSelected={selectedId === el.id}
          theme={theme}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// LayerGroup kept as an alias for ArchiMate layers
function LayerGroup({ layer, elements, orphanIds, selectedId, theme, onSelect }: {
  layer: string;
  elements: Element[];
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
}) {
  const label = LAYER_LABELS[layer] ?? layer;
  return (
    <SubGroup
      label={label}
      elements={elements}
      orphanIds={orphanIds}
      selectedId={selectedId}
      theme={theme}
      onSelect={onSelect}
    />
  );
}

// ═══════════════════════════════════════
// Top-level notation section
// ═══════════════════════════════════════

interface NotationSectionProps {
  title: string;
  count: number;
  borderColour: string;
  theme: 'dark' | 'light';
  children: React.ReactNode;
}

function NotationSection({ title, count, borderColour, theme, children }: NotationSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';
  const textColour = isDark ? '#E5E7EB' : '#111827';
  const bgColour = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  return (
    <div style={{ borderLeft: `3px solid ${borderColour}`, marginBottom: 2 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: textColour,
          background: bgColour,
          userSelect: 'none',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{title}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 9,
          fontWeight: 500,
          background: borderColour,
          color: '#FFFFFF',
          borderRadius: 8,
          padding: '1px 6px',
          minWidth: 16,
          textAlign: 'center',
        }}>{count}</span>
      </div>
      {expanded && children}
    </div>
  );
}

// ═══════════════════════════════════════
// ModelTree (main export)
// ═══════════════════════════════════════

interface ModelTreeProps {
  onClose?: () => void;
}

export function ModelTree({ onClose }: ModelTreeProps) {
  const elements = useModelStore(s => s.elements);
  const viewElements = useViewStore(s => s.viewElements);
  const selectedId = useInteractionStore(s => s.selectedId);
  const select = useInteractionStore(s => s.select);
  const theme = useThemeStore(s => s.theme);

  const [search, setSearch] = useState('');

  const isDark = theme === 'dark';
  const bgColour = isDark ? '#0F172A' : '#F8FAFC';
  const textColour = isDark ? '#E5E7EB' : '#111827';
  const borderColour = isDark ? '#1E293B' : '#E2E8F0';
  const mutedColour = isDark ? '#64748B' : '#94A3B8';

  // Elements in current view
  const viewElementIds = useMemo(
    () => new Set(viewElements.map(ve => ve.element_id)),
    [viewElements],
  );

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? elements.filter(el => el.name.toLowerCase().includes(q)) : elements;
  }, [elements, search]);

  // Partition into three notation buckets
  const { archimateEls, umlEls, wfEls } = useMemo(() => {
    const archimateEls: Element[] = [];
    const umlEls: Element[] = [];
    const wfEls: Element[] = [];
    for (const el of filtered) {
      if (el.archimate_type.startsWith('uml-')) {
        umlEls.push(el);
      } else if (el.archimate_type.startsWith('wf-')) {
        wfEls.push(el);
      } else {
        archimateEls.push(el);
      }
    }
    return { archimateEls, umlEls, wfEls };
  }, [filtered]);

  // ArchiMate: group by layer preserving canonical order
  const { byLayer, orderedLayers } = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of archimateEls) {
      const g = map.get(el.layer) ?? [];
      g.push(el);
      map.set(el.layer, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));

    const seen = new Set<string>();
    const result: string[] = [];
    for (const l of LAYER_ORDER) {
      if (map.has(l)) { result.push(l); seen.add(l); }
    }
    for (const l of map.keys()) {
      if (!seen.has(l)) result.push(l);
    }
    return { byLayer: map, orderedLayers: result };
  }, [archimateEls]);

  // UML: group by sub-category
  const umlGrouped = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of umlEls) {
      const group = UML_TYPE_TO_GROUP.get(el.archimate_type) ?? 'Other';
      const g = map.get(group) ?? [];
      g.push(el);
      map.set(group, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [umlEls]);

  const umlGroupKeys = useMemo(() => {
    const result: string[] = [];
    for (const k of UML_GROUP_ORDER) {
      if (umlGrouped.has(k)) result.push(k);
    }
    for (const k of umlGrouped.keys()) {
      if (!result.includes(k)) result.push(k);
    }
    return result;
  }, [umlGrouped]);

  // Wireframe: group by sub-category
  const wfGrouped = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of wfEls) {
      const group = WF_TYPE_TO_GROUP.get(el.archimate_type) ?? 'Other';
      const g = map.get(group) ?? [];
      g.push(el);
      map.set(group, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [wfEls]);

  const wfGroupKeys = useMemo(() => {
    const result: string[] = [];
    for (const k of WF_GROUP_ORDER) {
      if (wfGrouped.has(k)) result.push(k);
    }
    for (const k of wfGrouped.keys()) {
      if (!result.includes(k)) result.push(k);
    }
    return result;
  }, [wfGrouped]);

  // Elements not in current view (orphans)
  const orphanIds = useMemo(
    () => new Set(elements.filter(el => !viewElementIds.has(el.id)).map(el => el.id)),
    [elements, viewElementIds],
  );

  const handleSelect = useCallback((id: string) => {
    select(id);
  }, [select]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: bgColour,
      borderRight: `1px solid ${borderColour}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderBottom: `1px solid ${borderColour}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: textColour }}>Model</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: mutedColour,
              fontSize: 12,
              padding: '0 2px',
            }}
          >×</button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search elements…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: isDark ? '#1E293B' : '#FFFFFF',
            color: textColour,
            border: `1px solid ${borderColour}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            outline: 'none',
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ padding: '2px 8px 4px', fontSize: 10, color: mutedColour, flexShrink: 0 }}>
        <em>Italic</em> = not in current view
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* ArchiMate section */}
        {archimateEls.length > 0 && (
          <NotationSection
            title="ArchiMate"
            count={archimateEls.length}
            borderColour="#F59E0B"
            theme={theme}
          >
            {orderedLayers.map(layer => (
              <LayerGroup
                key={layer}
                layer={layer}
                elements={byLayer.get(layer) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
              />
            ))}
          </NotationSection>
        )}

        {/* UML section */}
        {umlEls.length > 0 && (
          <NotationSection
            title="UML"
            count={umlEls.length}
            borderColour="#4A90D9"
            theme={theme}
          >
            {umlGroupKeys.map(group => (
              <SubGroup
                key={group}
                label={group}
                elements={umlGrouped.get(group) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
              />
            ))}
          </NotationSection>
        )}

        {/* Wireframe section */}
        {wfEls.length > 0 && (
          <NotationSection
            title="Wireframe"
            count={wfEls.length}
            borderColour="#8E8E93"
            theme={theme}
          >
            {wfGroupKeys.map(group => (
              <SubGroup
                key={group}
                label={group}
                elements={wfGrouped.get(group) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
              />
            ))}
          </NotationSection>
        )}

        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: mutedColour, textAlign: 'center' }}>
            No elements found
          </div>
        )}
      </div>
    </div>
  );
}
