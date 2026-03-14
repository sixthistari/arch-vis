/**
 * Shared routing handles — 5 per side (source + target) at 15%, 30%, 50%, 70%, 85%.
 *
 * Replaces the ~40-line boilerplate duplicated in every node type.
 * Handle IDs match the edge-routing-integration expectations:
 *   t0..t4, b0..b4, l0..l4, r0..r4 (source)
 *   t0-t..t4-t, b0-t..b4-t, l0-t..l4-t, r0-t..r4-t (target)
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface RoutingHandlesProps {
  /** Sides to exclude (e.g. for non-rectangular shapes like chevrons). */
  excludeSides?: Side[];
  /** Handle style — invisible routing vs visible connector. Defaults to invisible. */
  style?: React.CSSProperties;
}

const PERCENTAGES = [15, 30, 50, 70, 85];

const hiddenStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  background: 'transparent',
  border: 'none',
  opacity: 0,
  pointerEvents: 'none',
};

const SIDE_CONFIG: { side: Side; position: Position; prefix: string; axis: 'left' | 'top' }[] = [
  { side: 'top', position: Position.Top, prefix: 't', axis: 'left' },
  { side: 'bottom', position: Position.Bottom, prefix: 'b', axis: 'left' },
  { side: 'left', position: Position.Left, prefix: 'l', axis: 'top' },
  { side: 'right', position: Position.Right, prefix: 'r', axis: 'top' },
];

export function RoutingHandles({ excludeSides, style: customStyle }: RoutingHandlesProps) {
  const excluded = excludeSides ? new Set(excludeSides) : null;
  const handleStyle = customStyle ?? hiddenStyle;

  return (
    <>
      {SIDE_CONFIG.map(({ side, position, prefix, axis }) => {
        if (excluded?.has(side)) return null;
        return PERCENTAGES.map((pct, i) => (
          <React.Fragment key={`${prefix}${i}`}>
            <Handle
              type="source"
              position={position}
              id={`${prefix}${i}`}
              style={{ ...handleStyle, [axis]: `${pct}%` }}
            />
            <Handle
              type="target"
              position={position}
              id={`${prefix}${i}-t`}
              style={{ ...handleStyle, [axis]: `${pct}%` }}
            />
          </React.Fragment>
        ));
      })}
    </>
  );
}
