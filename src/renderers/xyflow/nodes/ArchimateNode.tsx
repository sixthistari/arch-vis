/**
 * xyflow custom node for ArchiMate elements.
 *
 * Renders in box-view: a shaped rectangle (varies by aspect) with the ArchiMate
 * icon glyph in the top-right corner. Label centred in the box.
 *
 * Shape boundaries by aspect:
 *   Active Structure: flat rectangle
 *   Behaviour (process/function/interaction): rounded rectangle
 *   Service: rounded pill (full border-radius)
 *   Event: left-notch shape
 *   Passive Structure (object/artifact): folded-corner rectangle
 *   Other: varies (dashed for gap/grouping, 3D for node/device)
 */
import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node, useViewport } from '@xyflow/react';
import { getArchimateIcon } from './archimate-icons';
import { getLayerColours } from '../../../notation/colors';
import { getShapeDefinition } from '../../../notation/registry';
import { getZoomTierConfig } from '../../spatial/zoom-tiers';
import { useNodeBehaviour } from '../hooks/useNodeBehaviour';
import { RoutingHandles } from './shared/RoutingHandles';

// ═══════════════════════════════════════
// Shape classification by ArchiMate aspect
// ═══════════════════════════════════════

type ShapeBoundary = 'rect' | 'rounded' | 'pill' | 'event' | 'folded-corner' | 'box-3d' | 'dashed' | 'chevron';

function getShapeBoundary(archimateType: string): ShapeBoundary {
  // Services — pill shape
  if (archimateType.endsWith('-service')) return 'pill';
  // Events — notched shape
  if (archimateType.endsWith('-event') || archimateType === 'implementation-event') return 'event';
  // Passive structure — folded corner
  if (['business-object', 'data-object', 'contract', 'representation', 'deliverable'].includes(archimateType)) return 'folded-corner';
  // Behaviour — rounded
  if (archimateType.endsWith('-process') || archimateType.endsWith('-function') || archimateType.endsWith('-interaction')) return 'rounded';
  // 3D boxes
  if (['node', 'device'].includes(archimateType)) return 'box-3d';
  // Dashed
  if (['gap', 'grouping'].includes(archimateType)) return 'dashed';
  // Strategy — value-stream is a horizontal chevron/arrow
  if (archimateType === 'value-stream') return 'chevron';
  // Strategy behaviour
  if (['course-of-action'].includes(archimateType)) return 'rounded';
  if (['goal', 'outcome', 'capability', 'work-package'].includes(archimateType)) return 'rounded';
  // Default — flat rectangle
  return 'rect';
}

// ═══════════════════════════════════════
// Node data interface
// ═══════════════════════════════════════

export interface ArchimateNodeData {
  label: string;
  archimateType: string;
  specialisation?: string | null;
  layer: string;
  theme?: 'dark' | 'light';
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  colourOverride?: { fill: string; stroke: string };
  statusBadge?: string;
  displayFields?: string[];
  [key: string]: unknown;
}

type ArchimateNodeType = Node<ArchimateNodeData, 'archimate'>;

// ═══════════════════════════════════════
// SVG shape renderers (inside the node)
// ═══════════════════════════════════════

interface ShapeRendererProps {
  width: number;
  height: number;
  stroke: string;
  fill: string;
}

function RectBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  return <rect x={0} y={0} width={width} height={height} stroke={stroke} fill={fill} strokeWidth={1.2} />;
}

function RoundedBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  return <rect x={0} y={0} width={width} height={height} rx={6} ry={6} stroke={stroke} fill={fill} strokeWidth={1.2} />;
}

function PillBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  return <rect x={0} y={0} width={width} height={height} rx={height / 2} ry={height / 2} stroke={stroke} fill={fill} strokeWidth={1.2} />;
}

function EventBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  const notch = 8;
  const rr = 5;
  const d = `M${notch},0 L${width - rr},0 Q${width},0 ${width},${rr} L${width},${height - rr} Q${width},${height} ${width - rr},${height} L${notch},${height} L0,${height / 2} Z`;
  return <path d={d} stroke={stroke} fill={fill} strokeWidth={1.2} />;
}

function FoldedCornerBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  const fold = 8;
  const body = `M0,0 L${width - fold},0 L${width},${fold} L${width},${height} L0,${height} Z`;
  const foldLine = `M${width - fold},0 L${width - fold},${fold} L${width},${fold}`;
  return (
    <g>
      <path d={body} stroke={stroke} fill={fill} strokeWidth={1.2} />
      <path d={foldLine} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

function Box3DBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  const d = 10;
  const front = `M0,${d} L${width},${d} L${width},${height} L0,${height} Z`;
  const top = `M0,${d} L${d},0 L${width + d},0 L${width},${d} Z`;
  const right = `M${width},${d} L${width + d},0 L${width + d},${height - d} L${width},${height} Z`;
  return (
    <g>
      <path d={front} stroke={stroke} fill={fill} strokeWidth={1.2} />
      <path d={top} stroke={stroke} fill={fill} strokeWidth={0.8} fillOpacity={0.7} />
      <path d={right} stroke={stroke} fill={fill} strokeWidth={0.8} fillOpacity={0.5} />
    </g>
  );
}

function DashedBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  return <rect x={0} y={0} width={width} height={height} stroke={stroke} fill={fill} strokeWidth={1.2} strokeDasharray="6 3" />;
}

function ChevronBoundary({ width, height, stroke, fill }: ShapeRendererProps) {
  // Horizontal chevron / wide arrow pointing right
  const arrowDepth = 12;
  const d = `M0,0 L${width - arrowDepth},0 L${width},${height / 2} L${width - arrowDepth},${height} L0,${height} L${arrowDepth},${height / 2} Z`;
  return <path d={d} stroke={stroke} fill={fill} strokeWidth={1.2} />;
}

// ═══════════════════════════════════════
// Specialisation badge
// ═══════════════════════════════════════

const SPEC_CODES: Record<string, string> = {
  'domain-agent': 'A1', 'orchestration-engine': 'A2', 'query-router': 'A3',
  'knowledge-retrieval-service': 'A4', 'context-engine': 'A5', 'entity-resolution-service': 'A6',
  'reasoning-trace': 'A7', 'ingestion-pipeline': 'A8', 'reflection-loop': 'A9',
  'plan-execute-split': 'A10', 'compliance-assessment': 'A11',
  'knowledge-store': 'DA1', 'core-ontology': 'DA2', 'ontology-extension': 'DA3',
  'vector-index': 'DA4', 'medallion-store': 'DA5', 'graph-instance': 'DA6',
  'source-connector': 'DA7', 'fallback-path': 'DA8', 'prompt-library': 'DA9',
  'decision-trace-log': 'DA10', 'session-memory-store': 'DA11', 'model-catalogue': 'DA12',
};

function SpecBadge({ spec, x, y }: { spec: string; x: number; y: number }) {
  const code = SPEC_CODES[spec] ?? spec.substring(0, 3).toUpperCase();
  return (
    <g>
      <rect x={x} y={y} width={16} height={10} rx={2} fill="#F59E0B" fillOpacity={0.85} />
      <text x={x + 8} y={y + 7.5} textAnchor="middle" fontSize={6} fill="#000" fontWeight={600}>{code}</text>
    </g>
  );
}

// ═══════════════════════════════════════
// Main ArchiMate node component
// ═══════════════════════════════════════

function ArchimateNodeComponent({ id, data, selected }: NodeProps<ArchimateNodeType>) {
  const { label, archimateType, specialisation, layer, theme = 'dark', dimmed, onLabelChange, colourOverride, statusBadge, displayFields } = data;
  const shapeBoundary = getShapeBoundary(archimateType);
  const iconRenderer = getArchimateIcon(archimateType);
  const colours = getLayerColours(layer, theme);
  const shapeDef = getShapeDefinition(archimateType);
  const baseW = shapeDef.defaultWidth;
  const baseH = shapeDef.defaultHeight;
  const scale = 1.6;
  const width = Math.round(baseW * scale);
  const height = Math.round(baseH * scale);
  const svgWidth = shapeBoundary === 'box-3d' ? width + 12 : width;
  const svgHeight = shapeBoundary === 'box-3d' ? height + 12 : height;
  const iconSize = 14;

  // Zoom tier — gates what detail level to render
  const { zoom } = useViewport();
  const tierConfig = getZoomTierConfig(zoom);

  // Shared node behaviour hook
  const {
    editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit,
    isHovered, setIsHovered, isConnecting, opacity,
    connectorHandleStyle, targetHandleStyle,
  } = useNodeBehaviour({ id, label, dimmed, selected, theme, onLabelChange });

  const stroke = selected ? '#F59E0B' : (colourOverride?.stroke ?? colours.stroke);
  const fill = colourOverride?.fill ?? colours.fill;

  const shapeProps: ShapeRendererProps = { width, height, stroke, fill };

  let ShapeSvg: React.ReactElement;
  switch (shapeBoundary) {
    case 'rounded': ShapeSvg = <RoundedBoundary {...shapeProps} />; break;
    case 'pill': ShapeSvg = <PillBoundary {...shapeProps} />; break;
    case 'event': ShapeSvg = <EventBoundary {...shapeProps} />; break;
    case 'folded-corner': ShapeSvg = <FoldedCornerBoundary {...shapeProps} />; break;
    case 'box-3d': ShapeSvg = <Box3DBoundary {...shapeProps} />; break;
    case 'dashed': ShapeSvg = <DashedBoundary {...shapeProps} />; break;
    case 'chevron': ShapeSvg = <ChevronBoundary {...shapeProps} />; break;
    default: ShapeSvg = <RectBoundary {...shapeProps} />; break;
  }

  // Label position — shifted left when icon is present
  const labelX = iconRenderer ? (width - iconSize - 4) / 2 : width / 2;
  const labelY = height / 2;

  return (
    <div
      style={{ opacity }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={svgWidth} height={svgHeight} overflow="visible">
        {ShapeSvg}

        {/* Icon glyph — top-right corner; hidden at birds-eye and context tiers */}
        {tierConfig.showIcon && iconRenderer && iconRenderer({
          x: width - iconSize - 3,
          y: 2,
          size: iconSize,
          stroke,
        })}

        {/* Label — hidden at birds-eye tier */}
        {tierConfig.showLabel && !editing && (
          <text
            x={shapeBoundary === 'event' || shapeBoundary === 'chevron' ? labelX + 4 : labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontWeight={theme === 'dark' ? 400 : 500}
            fill={theme === 'dark' ? '#E5E7EB' : '#111827'}
            stroke={theme === 'dark' ? 'none' : 'white'}
            strokeWidth={theme === 'dark' ? 0 : 2.5}
            paintOrder="stroke"
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {label.length > 20 ? label.substring(0, 19) + '…' : label}
          </text>
        )}

        {/* Inline edit input — renders as foreignObject over the SVG */}
        {editing && (
          <foreignObject x={2} y={labelY - 10} width={width - 4} height={20}>
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
                e.stopPropagation();
              }}
              style={{
                width: '100%',
                fontSize: 9,
                fontFamily: 'Inter, system-ui, sans-serif',
                background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
                color: theme === 'dark' ? '#E5E7EB' : '#111827',
                border: '1px solid #F59E0B',
                borderRadius: 2,
                padding: '1px 3px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </foreignObject>
        )}

        {/* Specialisation badge — hidden at birds-eye and context tiers */}
        {tierConfig.showBadge && specialisation && (
          <SpecBadge spec={specialisation} x={width - 18} y={height - 12} />
        )}

        {/* Status badge overlay — small pill in the top-left */}
        {tierConfig.showBadge && statusBadge && (
          <g>
            <rect x={2} y={2} width={Math.max(statusBadge.length * 4.5 + 6, 20)} height={10} rx={3} fill={theme === 'dark' ? '#334155' : '#E2E8F0'} fillOpacity={0.9} />
            <text x={2 + Math.max(statusBadge.length * 4.5 + 6, 20) / 2} y={9} textAnchor="middle" fontSize={6} fill={theme === 'dark' ? '#CBD5E1' : '#475569'} fontWeight={500} fontFamily="Inter, system-ui, sans-serif">{statusBadge}</text>
          </g>
        )}

        {/* Display fields — small text lines below the main label */}
        {tierConfig.showLabel && displayFields && displayFields.length > 0 && displayFields.map((field, i) => (
          <text
            key={i}
            x={width / 2}
            y={labelY + 10 + i * 9}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={7}
            fill={theme === 'dark' ? '#94A3B8' : '#6B7280'}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {field.length > 22 ? field.substring(0, 21) + '…' : field}
          </text>
        ))}
      </svg>

      {/* ── Routing handles — invisible, used by auto-routing system only ── */}
      <RoutingHandles excludeSides={shapeBoundary === 'chevron' ? ['left', 'right'] : undefined} />

      {/* ── Cardinal connector handles — visible on hover for user-initiated connections ── */}
      <Handle type="source" position={Position.Top}    id="conn-n" style={{ ...connectorHandleStyle(isHovered && !isConnecting), left: '50%', top: -6 }} />
      <Handle type="source" position={Position.Bottom} id="conn-s" style={{ ...connectorHandleStyle(isHovered && !isConnecting), left: '50%', bottom: -6 }} />
      {shapeBoundary !== 'chevron' && (
        <Handle type="source" position={Position.Left}   id="conn-w" style={{ ...connectorHandleStyle(isHovered && !isConnecting), top: '50%', left: -6 }} />
      )}
      {shapeBoundary !== 'chevron' && (
        <Handle type="source" position={Position.Right}  id="conn-e" style={{ ...connectorHandleStyle(isHovered && !isConnecting), top: '50%', right: -6 }} />
      )}

      {/* ── Cardinal target handles — shown when a connection drag is in progress ── */}
      <Handle type="target" position={Position.Top}    id="conn-n-t" style={{ ...targetHandleStyle(isConnecting), left: '50%', top: -8 }} />
      <Handle type="target" position={Position.Bottom} id="conn-s-t" style={{ ...targetHandleStyle(isConnecting), left: '50%', bottom: -8 }} />
      {shapeBoundary !== 'chevron' && (
        <Handle type="target" position={Position.Left}  id="conn-w-t" style={{ ...targetHandleStyle(isConnecting), top: '50%', left: -8 }} />
      )}
      {shapeBoundary !== 'chevron' && (
        <Handle type="target" position={Position.Right} id="conn-e-t" style={{ ...targetHandleStyle(isConnecting), top: '50%', right: -8 }} />
      )}
    </div>
  );
}

export const ArchimateNode = memo(ArchimateNodeComponent);
