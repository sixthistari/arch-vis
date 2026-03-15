/**
 * SnaplineOverlay — renders alignment guide lines during node drag.
 * Must be rendered inside a ReactFlow provider (uses useViewport).
 */
import { useViewport } from '@xyflow/react';

export function SnaplineOverlay({ lines }: { lines: { x?: number; y?: number }[] }) {
  const { x: vx, y: vy, zoom } = useViewport();
  if (lines.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {lines.map((line, i) => {
        if (line.x !== undefined) {
          const sx = line.x * zoom + vx;
          return (
            <line
              key={`snap-x-${i}`}
              x1={sx}
              y1={0}
              x2={sx}
              y2="100%"
              stroke="#F97316"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        }
        if (line.y !== undefined) {
          const sy = line.y * zoom + vy;
          return (
            <line
              key={`snap-y-${i}`}
              x1={0}
              y1={sy}
              x2="100%"
              y2={sy}
              stroke="#F97316"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
