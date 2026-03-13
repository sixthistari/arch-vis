/**
 * Layer band background node — renders a coloured band with layer label.
 * Non-interactive, sits behind element nodes.
 */
import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { getLayerColours } from '../../../notation/colors';

export interface LayerBandNodeData {
  layer: string;
  label: string;
  bandWidth: number;
  bandHeight: number;
  theme: 'dark' | 'light';
  [key: string]: unknown;
}

type LayerBandNodeType = Node<LayerBandNodeData, 'layer-band'>;

function LayerBandNodeComponent({ data }: NodeProps<LayerBandNodeType>) {
  const { layer, label, bandWidth, bandHeight, theme } = data;
  const colours = getLayerColours(layer, theme);
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        width: bandWidth,
        height: bandHeight,
        borderRadius: 6,
        border: `1px solid ${colours.stroke}40`,
        background: isDark ? `${colours.stroke}08` : `${colours.stroke}12`,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 8,
          fontSize: 10,
          fontWeight: 600,
          color: isDark ? colours.stroke : `${colours.stroke}DD`,
          opacity: isDark ? 0.7 : 0.9,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const LayerBandNode = memo(LayerBandNodeComponent);
