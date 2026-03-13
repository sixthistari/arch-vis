/**
 * ModelTree — hierarchical tree of all elements grouped by ArchiMate layer.
 *
 * Provides: click-to-select, search filtering, orphan detection (elements not
 * in the current view are shown in italic).
 */
import { useState, useMemo, useCallback } from 'react';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { useThemeStore } from '../store/theme';
import type { Element } from '../model/types';

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
      onClick={() => onSelect(element.id)}
      title={element.description ?? element.name}
      style={{
        padding: '3px 8px 3px 16px',
        cursor: 'pointer',
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

interface LayerGroupProps {
  layer: string;
  elements: Element[];
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
}

function LayerGroup({ layer, elements, orphanIds, selectedId, theme, onSelect }: LayerGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';
  const label = LAYER_LABELS[layer] ?? layer;
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

  // Group by layer preserving canonical order
  const byLayer = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of filtered) {
      const g = map.get(el.layer) ?? [];
      g.push(el);
      map.set(el.layer, g);
    }
    // Sort each group by name
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  const orderedLayers = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const l of LAYER_ORDER) {
      if (byLayer.has(l)) { result.push(l); seen.add(l); }
    }
    // Any layers not in canonical order go at end
    for (const l of byLayer.keys()) {
      if (!seen.has(l)) result.push(l);
    }
    return result;
  }, [byLayer]);

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
        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: mutedColour, textAlign: 'center' }}>
            No elements found
          </div>
        )}
      </div>
    </div>
  );
}
