/**
 * Legend — auto-generated colour/shape key overlay for the current view.
 *
 * Reads the visible elements on the canvas and groups them by layer,
 * showing each layer's colour swatch and label. Toggleable via a button.
 */
import React, { useState, useMemo } from 'react';
import { getLayerColours } from '../notation/colors';

interface LegendEntry {
  layer: string;
  label: string;
  colour: string;
  count: number;
}

interface LegendProps {
  /** Elements currently visible on the canvas */
  elements: Array<{ layer: string }>;
  theme: 'dark' | 'light';
}

const LAYER_LABELS: Record<string, string> = {
  motivation: 'Motivation',
  strategy: 'Strategy',
  business: 'Business',
  business_upper: 'Business',
  business_lower: 'Business',
  application: 'Application',
  technology: 'Technology',
  data: 'Data / Artifact',
  implementation: 'Implementation',
  other: 'Other',
  none: 'Annotation',
};

export function Legend({ elements, theme }: LegendProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const isDark = theme === 'dark';

  const entries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const el of elements) {
      const base = el.layer.replace(/_upper|_lower/, '');
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }

    const result: LegendEntry[] = [];
    for (const [layer, count] of counts) {
      const colours = getLayerColours(layer, theme);
      result.push({
        layer,
        label: LAYER_LABELS[layer] ?? layer.charAt(0).toUpperCase() + layer.slice(1),
        colour: colours.stroke,
        count,
      });
    }
    // Sort by conventional layer order
    const order = ['motivation', 'strategy', 'business', 'application', 'technology', 'data', 'implementation', 'other', 'none'];
    result.sort((a, b) => {
      const ai = order.indexOf(a.layer);
      const bi = order.indexOf(b.layer);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return result;
  }, [elements, theme]);

  if (entries.length === 0) return React.createElement('span');

  const bg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#CBD5E1' : '#475569';
  const mutedColour = isDark ? '#64748B' : '#94A3B8';

  return React.createElement('div', {
    style: {
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 10,
      userSelect: 'none',
    },
  },
    // Toggle button
    React.createElement('button', {
      onClick: () => setOpen(o => !o),
      title: open ? 'Hide legend' : 'Show legend',
      'aria-expanded': open,
      style: {
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: '3px 8px',
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: textColour,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      },
    },
      React.createElement('span', { style: { fontSize: 12 } }, '◧'),
      'Legend',
    ),

    // Legend panel
    open && React.createElement('div', {
      style: {
        marginTop: 4,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: '8px 10px',
        minWidth: 140,
        backdropFilter: 'blur(8px)',
      },
    },
      ...entries.map(entry =>
        React.createElement('div', {
          key: entry.layer,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 0',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
          // Colour swatch
          React.createElement('div', {
            style: {
              width: 12,
              height: 12,
              borderRadius: 2,
              background: entry.colour,
              flexShrink: 0,
            },
          }),
          // Label
          React.createElement('span', {
            style: { color: textColour, flex: 1 },
          }, entry.label),
          // Count
          React.createElement('span', {
            style: { color: mutedColour, fontSize: 10 },
          }, entry.count),
        ),
      ),
    ),
  );
}
