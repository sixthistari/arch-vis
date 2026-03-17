/**
 * Layer band group node — interactive container for ArchiMate layer elements.
 * Draggable, selectable, resizable. Children (elements) move with the layer.
 */
import { memo } from 'react';
import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { getLayerColours } from '../../../shared/colors';

export interface LayerBandNodeData {
  layer: string;
  label: string;
  bandWidth: number;
  bandHeight: number;
  theme: 'dark' | 'light';
  [key: string]: unknown;
}

type LayerBandNodeType = Node<LayerBandNodeData, 'layer-band'>;

function LayerBandNodeComponent({ data, selected }: NodeProps<LayerBandNodeType>) {
  const { layer, label, bandWidth, bandHeight, theme } = data;
  const colours = getLayerColours(layer, theme);
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        width: bandWidth,
        height: bandHeight,
        borderRadius: 6,
        border: `1px solid ${selected ? colours.stroke : colours.stroke + '40'}`,
        background: isDark ? `${colours.stroke}08` : `${colours.stroke}12`,
        position: 'relative',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={400}
        minHeight={100}
        lineStyle={{ stroke: colours.stroke, strokeWidth: 1 }}
        handleStyle={{
          width: 8, height: 8,
          background: colours.stroke,
          border: `1px solid ${isDark ? '#fff' : '#000'}`,
          borderRadius: 2,
        }}
      />
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
          cursor: 'grab',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export const LayerBandNode = memo(LayerBandNodeComponent);
