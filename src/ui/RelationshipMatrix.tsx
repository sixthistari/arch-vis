/**
 * RelationshipMatrix — source x target grid showing relationships.
 *
 * Opens as a modal overlay. Elements can be filtered by layer, type,
 * or scoped to the current view. Clicking a cell highlights the
 * relationship on the canvas.
 */
import React, { useState, useMemo, useCallback } from 'react';
import type { Relationship, ArchimateLayer } from '../model/types';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { LAYER_SEQUENCE, LAYER_LABELS } from '../shared/layer-config';

// ─── Relationship type abbreviations ────────────────────────────────────────

const REL_ABBREV: Record<string, string> = {
  composition: 'Cmp',
  aggregation: 'Agg',
  assignment: 'Asgn',
  realisation: 'Real',
  serving: 'Srv',
  access: 'Acc',
  influence: 'Inf',
  triggering: 'Trg',
  flow: 'Flw',
  specialisation: 'Spc',
  association: 'Assn',
  'uml-inheritance': 'Inh',
  'uml-realisation': 'Real',
  'uml-composition': 'Cmp',
  'uml-aggregation': 'Agg',
  'uml-association': 'Assn',
  'uml-dependency': 'Dep',
  'uml-assembly': 'Asm',
  'uml-control-flow': 'CF',
  'uml-object-flow': 'OF',
  'wf-contains': 'Cnt',
  'wf-navigates-to': 'Nav',
  'wf-binds-to': 'Bnd',
  'dm-has-attribute': 'Attr',
  'dm-references': 'Ref',
  'dm-one-to-one': '1:1',
  'dm-one-to-many': '1:N',
  'dm-many-to-many': 'N:M',
};

function relAbbrev(type: string): string {
  return REL_ABBREV[type] ?? type.slice(0, 4);
}

// ─── Relationship type colours ──────────────────────────────────────────────

const REL_COLOURS: Record<string, string> = {
  composition: '#6366F1',
  aggregation: '#8B5CF6',
  assignment: '#3B82F6',
  realisation: '#06B6D4',
  serving: '#10B981',
  access: '#F59E0B',
  influence: '#EF4444',
  triggering: '#F97316',
  flow: '#EC4899',
  specialisation: '#8B5CF6',
  association: '#6B7280',
  'uml-inheritance': '#6366F1',
  'uml-realisation': '#06B6D4',
  'uml-composition': '#3B82F6',
  'uml-aggregation': '#8B5CF6',
  'uml-association': '#6B7280',
  'uml-dependency': '#F59E0B',
  'uml-assembly': '#10B981',
  'uml-control-flow': '#F97316',
  'uml-object-flow': '#EC4899',
  'wf-contains': '#6B7280',
  'wf-navigates-to': '#3B82F6',
  'wf-binds-to': '#10B981',
  'dm-has-attribute': '#6366F1',
  'dm-references': '#F59E0B',
  'dm-one-to-one': '#3B82F6',
  'dm-one-to-many': '#10B981',
  'dm-many-to-many': '#8B5CF6',
};

function relColour(type: string): string {
  return REL_COLOURS[type] ?? '#6B7280';
}

// ─── Filter types ───────────────────────────────────────────────────────────

type FilterMode = 'view' | 'layer' | 'type' | 'all';

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function RelationshipMatrix({ onClose }: Props): React.ReactElement {
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const viewElements = useViewStore(s => s.viewElements);
  const currentView = useViewStore(s => s.currentView);
  const select = useInteractionStore(s => s.select);
  const setHighlight = useInteractionStore(s => s.setHighlight);

  const [filterMode, setFilterMode] = useState<FilterMode>(currentView ? 'view' : 'all');
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Build set of element IDs in current view
  const viewElementIds = useMemo(() => {
    return new Set(viewElements.map(ve => ve.element_id));
  }, [viewElements]);

  // Available layers from elements
  const availableLayers = useMemo(() => {
    const layers = new Set(elements.map(e => e.layer));
    return LAYER_SEQUENCE.filter(l => layers.has(l as ArchimateLayer));
  }, [elements]);

  // Available types from elements
  const availableTypes = useMemo(() => {
    const types = new Set(elements.map(e => e.archimate_type));
    return Array.from(types).sort();
  }, [elements]);

  // Filter elements
  const filteredElements = useMemo(() => {
    let filtered = elements;

    if (filterMode === 'view') {
      filtered = filtered.filter(e => viewElementIds.has(e.id));
    } else if (filterMode === 'layer' && selectedLayer) {
      filtered = filtered.filter(e => e.layer === selectedLayer);
    } else if (filterMode === 'type' && selectedType) {
      filtered = filtered.filter(e => e.archimate_type === selectedType);
    }

    // Sort by layer order then name
    const layerOrder: Record<string, number> = {};
    LAYER_SEQUENCE.forEach((l, i) => { layerOrder[l] = i; });

    return filtered.sort((a, b) => {
      const la = layerOrder[a.layer] ?? 99;
      const lb = layerOrder[b.layer] ?? 99;
      if (la !== lb) return la - lb;
      return a.name.localeCompare(b.name);
    });
  }, [elements, filterMode, selectedLayer, selectedType, viewElementIds]);

  // Build relationship lookup: "sourceId|targetId" -> Relationship[]
  const relLookup = useMemo(() => {
    const map = new Map<string, Relationship[]>();
    const elementIdSet = new Set(filteredElements.map(e => e.id));

    for (const rel of relationships) {
      if (!elementIdSet.has(rel.source_id) || !elementIdSet.has(rel.target_id)) continue;
      const key = `${rel.source_id}|${rel.target_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(rel);
      } else {
        map.set(key, [rel]);
      }
    }
    return map;
  }, [relationships, filteredElements]);

  // Click handler: highlight relationship on canvas
  const handleCellClick = useCallback((rels: Relationship[]) => {
    if (rels.length === 0) return;
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const r of rels) {
      nodeIds.add(r.source_id);
      nodeIds.add(r.target_id);
      edgeIds.add(r.id);
    }
    setHighlight(nodeIds, edgeIds);
    // Select the first relationship's source
    select(rels[0]!.source_id);
  }, [select, setHighlight]);

  // Truncate name for headers
  const truncate = (name: string, max: number) =>
    name.length > max ? name.slice(0, max - 1) + '\u2026' : name;

  const elementCount = filteredElements.length;
  const tooLarge = elementCount > 80;

  return React.createElement('div', {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    },
    onClick: (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
  },
    React.createElement('div', {
      style: {
        background: 'var(--panel-bg, var(--bg-secondary))',
        border: '1px solid var(--panel-border, var(--border-primary))',
        borderRadius: 8,
        width: '90vw',
        maxWidth: 1200,
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
    },
      // ── Header ──
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        },
      },
        React.createElement('span', {
          style: { fontSize: 14, fontWeight: 600 },
        }, 'Relationship Matrix'),
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 4px',
          },
          title: 'Close',
        }, '\u2715'),
      ),

      // ── Filter controls ──
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          flexWrap: 'wrap',
          fontSize: 11,
        },
      },
        React.createElement('span', {
          style: { fontWeight: 600, color: 'var(--text-secondary)' },
        }, 'Filter:'),

        // View scope button
        currentView && React.createElement('button', {
          onClick: () => setFilterMode('view'),
          style: filterButtonStyle(filterMode === 'view'),
        }, 'Current View'),

        // Layer filter
        React.createElement('button', {
          onClick: () => setFilterMode('layer'),
          style: filterButtonStyle(filterMode === 'layer'),
        }, 'By Layer'),
        filterMode === 'layer' && React.createElement('select', {
          value: selectedLayer,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLayer(e.target.value),
          style: selectStyle(),
        },
          React.createElement('option', { value: '' }, 'Select layer\u2026'),
          ...availableLayers.map(l =>
            React.createElement('option', { key: l, value: l },
              LAYER_LABELS[l] ?? l,
            ),
          ),
        ),

        // Type filter
        React.createElement('button', {
          onClick: () => setFilterMode('type'),
          style: filterButtonStyle(filterMode === 'type'),
        }, 'By Type'),
        filterMode === 'type' && React.createElement('select', {
          value: selectedType,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedType(e.target.value),
          style: selectStyle(),
        },
          React.createElement('option', { value: '' }, 'Select type\u2026'),
          ...availableTypes.map(t =>
            React.createElement('option', { key: t, value: t }, t),
          ),
        ),

        // All
        React.createElement('button', {
          onClick: () => setFilterMode('all'),
          style: filterButtonStyle(filterMode === 'all'),
        }, 'All Elements'),

        // Count
        React.createElement('span', {
          style: { marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 10 },
        }, `${elementCount} element${elementCount !== 1 ? 's' : ''} \u00D7 ${elementCount}`),
      ),

      // ── Legend ──
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '4px 16px 6px',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          flexWrap: 'wrap',
          fontSize: 9,
          color: 'var(--text-secondary)',
        },
      },
        React.createElement('span', { style: { fontWeight: 600 } }, 'Legend:'),
        ...Object.entries(REL_ABBREV)
          .filter(([key]) => !key.startsWith('uml-') && !key.startsWith('wf-') && !key.startsWith('dm-'))
          .map(([key, abbr]) =>
            React.createElement('span', {
              key,
              style: { display: 'inline-flex', alignItems: 'center', gap: 3 },
            },
              React.createElement('span', {
                style: {
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: relColour(key),
                },
              }),
              `${abbr} = ${key}`,
            ),
          ),
      ),

      // ── Matrix body ──
      React.createElement('div', {
        style: {
          flex: 1,
          overflow: 'auto',
          padding: 0,
        },
      },
        tooLarge && filterMode === 'all'
          ? React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: 12,
                padding: 40,
                textAlign: 'center',
              },
            }, `Too many elements (${elementCount}) for a readable matrix. Use a filter to narrow down the scope — try "Current View" or "By Layer".`)
          : elementCount === 0
            ? React.createElement('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                },
              }, 'No elements match the current filter.')
            : React.createElement('table', {
                style: {
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 10,
                  minWidth: 'max-content',
                },
              },
                // Column headers
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    // Top-left corner
                    React.createElement('th', {
                      style: {
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        zIndex: 3,
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-primary)',
                        borderRight: '1px solid var(--border-primary)',
                        padding: '4px 6px',
                        minWidth: 120,
                        fontSize: 9,
                        color: 'var(--text-muted)',
                        textAlign: 'left',
                      },
                    }, 'Source \u2193 / Target \u2192'),
                    // Column headers (targets)
                    ...filteredElements.map(el =>
                      React.createElement('th', {
                        key: el.id,
                        title: el.name,
                        style: {
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                          background: 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-primary)',
                          padding: '4px 3px',
                          whiteSpace: 'nowrap',
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          maxHeight: 120,
                          overflow: 'hidden',
                          fontSize: 9,
                          fontWeight: 400,
                          color: 'var(--text-primary)',
                          cursor: 'default',
                          borderLeft: '1px solid var(--border-primary)',
                        },
                      }, truncate(el.name, 20)),
                    ),
                  ),
                ),
                // Body rows (sources)
                React.createElement('tbody', null,
                  ...filteredElements.map(srcEl =>
                    React.createElement('tr', { key: srcEl.id },
                      // Row header (source element name)
                      React.createElement('td', {
                        title: srcEl.name,
                        style: {
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                          background: 'var(--bg-secondary)',
                          borderRight: '1px solid var(--border-primary)',
                          borderBottom: '1px solid var(--border-primary)',
                          padding: '3px 6px',
                          whiteSpace: 'nowrap',
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: 10,
                          fontWeight: 500,
                        },
                      }, truncate(srcEl.name, 24)),
                      // Cells
                      ...filteredElements.map(tgtEl => {
                        const rels = relLookup.get(`${srcEl.id}|${tgtEl.id}`);
                        const hasRel = rels && rels.length > 0;
                        const isDiag = srcEl.id === tgtEl.id;

                        if (isDiag) {
                          return React.createElement('td', {
                            key: tgtEl.id,
                            style: {
                              borderBottom: '1px solid var(--border-primary)',
                              borderLeft: '1px solid var(--border-primary)',
                              background: 'var(--bg-tertiary, rgba(128,128,128,0.1))',
                              width: 28,
                              height: 22,
                              padding: 0,
                            },
                          });
                        }

                        if (!hasRel) {
                          return React.createElement('td', {
                            key: tgtEl.id,
                            style: {
                              borderBottom: '1px solid var(--border-primary)',
                              borderLeft: '1px solid var(--border-primary)',
                              width: 28,
                              height: 22,
                              padding: 0,
                            },
                          });
                        }

                        // Cell with relationship(s)
                        const primary = rels![0]!;
                        const colour = relColour(primary.archimate_type);
                        const label = rels!.map(r => relAbbrev(r.archimate_type)).join(', ');
                        const tooltip = rels!.map(r =>
                          `${r.archimate_type}${r.label ? ` (${r.label})` : ''}`,
                        ).join('\n');

                        return React.createElement('td', {
                          key: tgtEl.id,
                          title: tooltip,
                          onClick: () => handleCellClick(rels!),
                          style: {
                            borderBottom: '1px solid var(--border-primary)',
                            borderLeft: '1px solid var(--border-primary)',
                            background: colour + '22',
                            color: colour,
                            fontWeight: 600,
                            textAlign: 'center',
                            cursor: 'pointer',
                            width: 28,
                            height: 22,
                            padding: '0 2px',
                            fontSize: 9,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                          },
                        }, label);
                      }),
                    ),
                  ),
                ),
              ),
      ),
    ),
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

function filterButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--button-active-bg, #3B82F6)' : 'var(--button-bg)',
    color: active ? '#FFFFFF' : 'var(--button-text)',
    border: '1px solid var(--border-primary)',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: 11,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    background: 'var(--button-bg)',
    color: 'var(--button-text)',
    border: '1px solid var(--border-primary)',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 11,
  };
}
