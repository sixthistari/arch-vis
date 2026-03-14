import React, { useState, useCallback, useMemo } from 'react';
import { getLayerColours } from '../notation/colors';
import { getShapeDefinition } from '../notation/registry';
import { useThemeStore } from '../store/theme';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import type { ArchimateType } from '../model/types';
import { archimateTypeValues } from '../model/types';

interface LayerGroup {
  key: string;
  label: string;
  colorKey: string;
  types: ArchimateType[];
}

/**
 * Build layer groups from the sublayer config, falling back to
 * prefix-based grouping for any types not explicitly listed.
 */
function buildLayerGroups(sublayerConfig: unknown): LayerGroup[] {
  const groups: LayerGroup[] = [];
  const seen = new Set<string>();

  const cfg = sublayerConfig as { layers?: Record<string, { label: string; color_key: string; sublayers: Array<{ element_types: string[] }> }> } | null;
  if (cfg?.layers) {
    // Merge layers that share the same color_key into one palette group
    const merged = new Map<string, { label: string; colorKey: string; types: string[] }>();
    for (const [, def] of Object.entries(cfg.layers)) {
      const existing = merged.get(def.color_key);
      const layerTypes = def.sublayers.flatMap(sl => sl.element_types);
      if (existing) {
        for (const t of layerTypes) {
          if (!existing.types.includes(t)) existing.types.push(t);
        }
      } else {
        const cleanLabel = def.label.replace(/ — .*/, '');
        merged.set(def.color_key, { label: cleanLabel, colorKey: def.color_key, types: [...layerTypes] });
      }
    }

    for (const [key, val] of merged) {
      const validTypes = val.types.filter(t =>
        (archimateTypeValues as readonly string[]).includes(t),
      ) as ArchimateType[];
      for (const t of validTypes) seen.add(t);
      if (validTypes.length > 0) {
        groups.push({ key, label: val.label, colorKey: val.colorKey, types: validTypes });
      }
    }
  }

  const remaining = archimateTypeValues.filter(t => !seen.has(t) && t !== 'grouping' && t !== 'junction' && t !== 'location');
  if (remaining.length > 0) {
    groups.push({ key: 'other', label: 'Other', colorKey: 'implementation', types: remaining as unknown as ArchimateType[] });
  }

  return groups;
}

function formatTypeName(type: string): string {
  return type
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Render a mini shape/icon preview for a given ArchiMate type.
 * Returns an SVG element (20×14) showing the notation silhouette.
 */
function renderMiniShape(type: string, stroke: string): React.ReactElement {
  const shapeDef = getShapeDefinition(type);
  const w = 18;
  const h = 12;
  const x = 1;
  const y = 1;
  const sw = 0.8; // strokeWidth

  const children: React.ReactElement[] = [];

  switch (shapeDef.shapeType) {
    case 'rect-with-icon': {
      // Rectangle + icon indicator
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 1,
      }));
      // Render mini icon in top-right
      if (shapeDef.iconType) {
        const ic = renderMiniIcon(shapeDef.iconType, x + w - 6, y + 1, stroke);
        if (ic) children.push(ic);
      }
      break;
    }
    case 'pill': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw,
        rx: h / 2, ry: h / 2,
      }));
      break;
    }
    case 'rounded-rect': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 3, ry: 3,
      }));
      break;
    }
    case 'folded-corner': {
      const fold = 3;
      children.push(React.createElement('path', {
        key: 'r',
        d: `M${x},${y} L${x + w - fold},${y} L${x + w},${y + fold} L${x + w},${y + h} L${x},${y + h} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Fold line
      children.push(React.createElement('path', {
        key: 'f',
        d: `M${x + w - fold},${y} L${x + w - fold},${y + fold} L${x + w},${y + fold}`,
        stroke, fill: 'none', strokeWidth: sw * 0.7, opacity: 0.5,
      }));
      break;
    }
    case 'box-3d': {
      const d = 3; // depth
      // Front face
      children.push(React.createElement('rect', {
        key: 'front', x, y: y + d, width: w - d, height: h - d,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Top face
      children.push(React.createElement('path', {
        key: 'top',
        d: `M${x},${y + d} L${x + d},${y} L${x + w},${y} L${x + w - d},${y + d} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      // Right face
      children.push(React.createElement('path', {
        key: 'right',
        d: `M${x + w - d},${y + d} L${x + w},${y} L${x + w},${y + h - d} L${x + w - d},${y + h} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      break;
    }
    case 'event': {
      const notch = 3;
      children.push(React.createElement('path', {
        key: 'r',
        d: `M${x + notch},${y} L${x + w},${y} L${x + w},${y + h} L${x + notch},${y + h} L${x},${y + h / 2} Z`,
        stroke, fill: 'none', strokeWidth: sw,
      }));
      break;
    }
    case 'dashed-rect': {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw,
        strokeDasharray: '2 1.5',
      }));
      break;
    }
    case 'rect':
    default: {
      children.push(React.createElement('rect', {
        key: 'r', x, y, width: w, height: h,
        stroke, fill: 'none', strokeWidth: sw, rx: 1,
      }));
      break;
    }
  }

  return React.createElement('svg', {
    width: 20,
    height: 14,
    viewBox: '0 0 20 14',
    style: { flexShrink: 0 },
  }, ...children);
}

/**
 * Render a tiny icon for rect-with-icon types.
 */
function renderMiniIcon(iconType: string, ix: number, iy: number, stroke: string): React.ReactElement | null {
  const s = 0.7; // mini scale
  switch (iconType) {
    case 'person': {
      const cx = ix + 2.5;
      return React.createElement('g', { key: 'icon' },
        React.createElement('circle', { cx, cy: iy + 1.5, r: 1.2 * s, stroke, fill: 'none', strokeWidth: 0.6 }),
        React.createElement('line', { x1: cx, y1: iy + 3, x2: cx, y2: iy + 5.5, stroke, strokeWidth: 0.6 }),
        React.createElement('line', { x1: cx - 1.5, y1: iy + 3.5, x2: cx + 1.5, y2: iy + 3.5, stroke, strokeWidth: 0.6 }),
      );
    }
    case 'component': {
      return React.createElement('g', { key: 'icon' },
        React.createElement('rect', { x: ix + 1, y: iy, width: 4, height: 5.5, stroke, fill: 'none', strokeWidth: 0.5 }),
        React.createElement('rect', { x: ix, y: iy + 0.8, width: 1.8, height: 1.2, stroke, fill: 'none', strokeWidth: 0.4 }),
        React.createElement('rect', { x: ix, y: iy + 3.2, width: 1.8, height: 1.2, stroke, fill: 'none', strokeWidth: 0.4 }),
      );
    }
    case 'lollipop': {
      const cx = ix + 2.5;
      return React.createElement('g', { key: 'icon' },
        React.createElement('circle', { cx, cy: iy + 1.5, r: 1.5, stroke, fill: 'none', strokeWidth: 0.6 }),
        React.createElement('line', { x1: cx, y1: iy + 3, x2: cx, y2: iy + 6, stroke, strokeWidth: 0.6 }),
      );
    }
    case 'artifact': {
      const fold = 1.2;
      return React.createElement('path', {
        key: 'icon',
        d: `M${ix},${iy} L${ix + 4 - fold},${iy} L${ix + 4},${iy + fold} L${ix + 4},${iy + 6} L${ix},${iy + 6} Z`,
        stroke, fill: 'none', strokeWidth: 0.5,
      });
    }
    case 'stepped': {
      return React.createElement('g', { key: 'icon' },
        React.createElement('rect', { x: ix, y: iy + 2.5, width: 3.5, height: 3.5, stroke, fill: 'none', strokeWidth: 0.4 }),
        React.createElement('rect', { x: ix + 1, y: iy + 1.2, width: 3.5, height: 3.5, stroke, fill: 'none', strokeWidth: 0.4 }),
        React.createElement('rect', { x: ix + 2, y: iy, width: 3.5, height: 3.5, stroke, fill: 'none', strokeWidth: 0.4 }),
      );
    }
    case 'header-bar': {
      return React.createElement('rect', {
        key: 'icon',
        x: ix - 3, y: iy - 0.5,
        width: 8, height: 2.5,
        fill: stroke, opacity: 0.3,
      });
    }
    default:
      return null;
  }
}

// ── UML palette groups ──────────────────────────────────────────

interface SimpleGroup {
  key: string;
  label: string;
  types: string[];
}

const UML_CLASS_GROUPS: SimpleGroup[] = [
  { key: 'classes', label: 'Classes', types: ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum', 'uml-package'] },
  { key: 'components', label: 'Components', types: ['uml-component'] },
  { key: 'other-uml', label: 'Other', types: ['uml-actor', 'uml-use-case', 'uml-note', 'uml-state', 'uml-activity'] },
];

const UML_SEQUENCE_GROUPS: SimpleGroup[] = [
  { key: 'seq-elements', label: 'Elements', types: ['uml-lifeline', 'uml-activation', 'uml-fragment'] },
];

const WIREFRAME_GROUPS: SimpleGroup[] = [
  { key: 'layout', label: 'Layout', types: ['wf-page', 'wf-section', 'wf-card', 'wf-modal', 'wf-header'] },
  { key: 'controls', label: 'Controls', types: ['wf-button', 'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio'] },
  { key: 'data', label: 'Data', types: ['wf-table', 'wf-list', 'wf-form'] },
  { key: 'navigation', label: 'Navigation', types: ['wf-nav', 'wf-link', 'wf-tab-group'] },
  { key: 'content', label: 'Content', types: ['wf-text', 'wf-image', 'wf-icon', 'wf-placeholder'] },
];

export function Palette(): React.ReactElement {
  const theme = useThemeStore(s => s.theme);
  const sublayerConfig = useModelStore(s => s.sublayerConfig);
  const currentView = useViewStore(s => s.currentView);
  const viewpointType = currentView?.viewpoint_type ?? 'layered';
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const layerGroups = useMemo(() => buildLayerGroups(sublayerConfig), [sublayerConfig]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, archimateType: string, layer: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ archimate_type: archimateType, layer }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Determine palette mode from viewpoint
  const isUmlSequence = viewpointType === 'uml_sequence';
  const isUml = !isUmlSequence && (viewpointType === 'uml_class' || viewpointType === 'uml_component' || viewpointType === 'uml_usecase' || viewpointType === 'uml_activity');
  const isWireframe = viewpointType === 'wireframe';

  const paletteTitle = isUmlSequence ? 'Sequence Elements' : isUml ? 'UML Elements' : isWireframe ? 'Wireframe Elements' : 'Elements';

  // Render a simple (non-ArchiMate) group for UML / wireframe palettes
  const renderSimpleGroup = (group: SimpleGroup, borderColour: string, chipBg: string, dropLayer: string) => {
    const isExpanded = expandedGroups.has(group.key);
    return React.createElement('div', {
      key: group.key,
      style: {
        marginBottom: 4,
        borderLeft: `3px solid ${borderColour}`,
        borderRadius: 2,
      },
    },
      // Group header
      React.createElement('div', {
        onClick: () => toggleGroup(group.key),
        style: {
          padding: '3px 6px',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none' as const,
          background: `${borderColour}18`,
          borderRadius: '0 2px 2px 0',
        },
      },
        group.label,
        React.createElement('span', {
          style: { fontSize: 7, opacity: 0.5 },
        }, isExpanded ? '\u25BC' : '\u25B6'),
      ),
      // Type chips (text-only, no ArchiMate mini shapes)
      isExpanded && React.createElement('div', {
        style: {
          padding: '3px 4px',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 2,
        },
      },
        ...group.types.map(type =>
          React.createElement('div', {
            key: type,
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, type, dropLayer),
            style: {
              padding: '2px 6px',
              fontSize: 9,
              cursor: 'grab',
              borderRadius: 3,
              border: `1px solid ${borderColour}44`,
              background: chipBg,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              maxWidth: 160,
              height: 20,
              userSelect: 'none' as const,
            },
            title: formatTypeName(type),
          },
            React.createElement('span', {
              style: {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const,
                lineHeight: '14px',
              },
            }, formatTypeName(type)),
          ),
        ),
      ),
    );
  };

  return React.createElement('div', {
    style: {
      borderTop: '1px solid var(--border-primary)',
      fontSize: 11,
    },
  },
    // Header
    React.createElement('div', {
      onClick: () => setCollapsed(c => !c),
      style: {
        padding: '6px 10px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none' as const,
      },
    },
      paletteTitle,
      React.createElement('span', {
        style: { fontSize: 8, opacity: 0.6 },
      }, collapsed ? '\u25B6' : '\u25BC'),
    ),

    // Body — UML Sequence palette
    !collapsed && isUmlSequence && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_SEQUENCE_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application')),
    ),

    // Body — UML palette
    !collapsed && isUml && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...UML_CLASS_GROUPS.map(g => renderSimpleGroup(g, '#4A90D9', 'rgba(74,144,217,0.08)', 'application')),
    ),

    // Body — Wireframe palette
    !collapsed && isWireframe && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...WIREFRAME_GROUPS.map(g => renderSimpleGroup(g, '#8E8E93', 'rgba(142,142,147,0.08)', 'implementation')),
    ),

    // Body — ArchiMate palette (default)
    !collapsed && !isUml && !isUmlSequence && !isWireframe && React.createElement('div', {
      style: { padding: '0 6px 6px' },
    },
      ...layerGroups.map(group => {
        const colours = getLayerColours(group.colorKey, theme);
        const isExpanded = expandedGroups.has(group.key);

        return React.createElement('div', {
          key: group.key,
          style: {
            marginBottom: 4,
            borderLeft: `3px solid ${colours.stroke}`,
            borderRadius: 2,
          },
        },
          // Group header
          React.createElement('div', {
            onClick: () => toggleGroup(group.key),
            style: {
              padding: '3px 6px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              userSelect: 'none' as const,
              background: colours.planeFill,
              borderRadius: '0 2px 2px 0',
            },
          },
            group.label,
            React.createElement('span', {
              style: { fontSize: 7, opacity: 0.5 },
            }, isExpanded ? '\u25BC' : '\u25B6'),
          ),

          // Type chips with mini shape icons
          isExpanded && React.createElement('div', {
            style: {
              padding: '3px 4px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 2,
            },
          },
            ...group.types.map(type =>
              React.createElement('div', {
                key: type,
                draggable: true,
                onDragStart: (e: React.DragEvent) => handleDragStart(e, type, group.colorKey),
                style: {
                  padding: '2px 4px',
                  fontSize: 9,
                  cursor: 'grab',
                  borderRadius: 3,
                  border: `1px solid ${colours.stroke}44`,
                  background: colours.fill,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  maxWidth: 160,
                  height: 20,
                  userSelect: 'none' as const,
                },
                title: formatTypeName(type),
              },
                renderMiniShape(type, colours.stroke),
                React.createElement('span', {
                  style: {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    lineHeight: '14px',
                  },
                }, formatTypeName(type)),
              ),
            ),
          ),
        );
      }),
    ),
  );
}
