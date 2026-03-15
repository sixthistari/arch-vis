/**
 * Data Modelling entity/table node — compartmented box for ERD diagrams.
 *
 * Renders differently based on entityType:
 * - 'entity'  = conceptual/logical: simple box with attribute names/types
 * - 'table'   = physical: columns with SQL data types + PK/FK/IX indicators
 *
 * Follows the same SVG-inside-div pattern as UmlClassNode.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

// ═══════════════════════════════════════
// Data types
// ═══════════════════════════════════════

export interface DmAttribute {
  name: string;
  type?: string;
  isPK?: boolean;
  isFK?: boolean;
  nullable?: boolean;
  isIndex?: boolean;
}

export interface DmEntityNodeData {
  label: string;
  entityType: 'entity' | 'table';
  attributes?: DmAttribute[];
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type DmEntityNodeType = Node<DmEntityNodeData, 'dm-entity'>;

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════

const MIN_WIDTH = 160;
const MAX_WIDTH = 380;
const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 16;
const PADDING_X = 8;
const FONT_SIZE = 11;
const COMPARTMENT_PAD = 5;
const CHAR_WIDTH = 6.8;

// ═══════════════════════════════════════
// Colour palettes
// ═══════════════════════════════════════

const PALETTE = {
  dark: {
    stroke: '#60A5FA',
    fill: '#1E293B',
    headerFill: '#1E3A5F',
    text: '#E5E7EB',
    pkColour: '#FBBF24',
    fkColour: '#A78BFA',
    ixColour: '#34D399',
  },
  light: {
    stroke: '#3B82F6',
    fill: '#FFFFFF',
    headerFill: '#DBEAFE',
    text: '#1F2937',
    pkColour: '#D97706',
    fkColour: '#7C3AED',
    ixColour: '#059669',
  },
};

// ═══════════════════════════════════════
// Formatting helpers
// ═══════════════════════════════════════

function formatConstraints(attr: DmAttribute): string {
  const tags: string[] = [];
  if (attr.isPK) tags.push('PK');
  if (attr.isFK) tags.push('FK');
  if (attr.isIndex) tags.push('IX');
  if (attr.nullable === false) tags.push('NN');
  return tags.length > 0 ? tags.join(',') : '';
}

function formatEntityAttribute(attr: DmAttribute, isPhysical: boolean): string {
  const prefix = attr.isPK ? 'PK ' : attr.isFK ? 'FK ' : '   ';
  const typeSuffix = attr.type ? ` : ${attr.type}` : '';
  if (isPhysical) {
    const constraints = formatConstraints(attr);
    const cSuffix = constraints ? `  [${constraints}]` : '';
    return `${prefix}${attr.name}${typeSuffix}${cSuffix}`;
  }
  return `${prefix}${attr.name}${typeSuffix}`;
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

function DmEntityNodeComponent({ data, selected }: NodeProps<DmEntityNodeType>) {
  const {
    label,
    entityType = 'entity',
    attributes = [],
    theme = 'dark',
    dimmed,
  } = data;

  const isPhysical = entityType === 'table';
  const colours = PALETTE[theme];
  const stroke = selected ? '#F59E0B' : colours.stroke;
  const opacity = dimmed ? 0.1 : 1;

  // Separate PK attributes from the rest for visual grouping
  const pkAttrs = attributes.filter(a => a.isPK);
  const nonPkAttrs = attributes.filter(a => !a.isPK);
  const hasPkSection = pkAttrs.length > 0;

  // Compute content height
  const pkSectionH = hasPkSection ? pkAttrs.length * ROW_HEIGHT + COMPARTMENT_PAD * 2 : 0;
  const attrSectionH = nonPkAttrs.length > 0
    ? nonPkAttrs.length * ROW_HEIGHT + COMPARTMENT_PAD * 2
    : ROW_HEIGHT + COMPARTMENT_PAD;
  const totalHeight = HEADER_HEIGHT + pkSectionH + attrSectionH;

  // Auto-size width from content
  const allTexts = attributes.map(a => formatEntityAttribute(a, isPhysical));
  allTexts.push(label);
  const longestLen = Math.max(0, ...allTexts.map(t => t.length));
  const contentWidth = Math.round(longestLen * CHAR_WIDTH + PADDING_X * 2 + 4);
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, contentWidth));

  // Header icon for physical tables
  const headerIcon = isPhysical ? '\u{1F5C4} ' : ''; // file cabinet emoji for tables

  let yPos = HEADER_HEIGHT;

  return (
    <div style={{ opacity }}>
      <svg width={width} height={totalHeight} overflow="visible">
        {/* Background */}
        <rect x={0} y={0} width={width} height={totalHeight}
          stroke={stroke} fill={colours.fill} strokeWidth={1.5} rx={2} />

        {/* Header */}
        <rect x={0} y={0} width={width} height={HEADER_HEIGHT}
          stroke={stroke} fill={colours.headerFill} strokeWidth={1.5} rx={2} />
        {/* Clip the bottom corners of the header */}
        <rect x={0.75} y={HEADER_HEIGHT - 4} width={width - 1.5} height={4}
          fill={colours.headerFill} stroke="none" />

        {/* Entity/Table name */}
        <text
          x={width / 2} y={HEADER_HEIGHT / 2 + 1}
          textAnchor="middle" dominantBaseline="central"
          fontSize={13} fontWeight={700} fill={colours.text}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {headerIcon}{label}
        </text>

        {/* Divider after header */}
        <line x1={0} y1={HEADER_HEIGHT} x2={width} y2={HEADER_HEIGHT}
          stroke={stroke} strokeWidth={1} />

        {/* PK section (if present) */}
        {hasPkSection && pkAttrs.map((attr, i) => {
          const rowY = yPos + COMPARTMENT_PAD + i * ROW_HEIGHT + ROW_HEIGHT * 0.7;
          return (
            <text
              key={`pk-${i}`}
              x={PADDING_X} y={rowY}
              fontSize={FONT_SIZE} fill={colours.pkColour}
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              fontWeight={600}
              style={{ pointerEvents: 'none' }}
            >
              {formatEntityAttribute(attr, isPhysical)}
            </text>
          );
        })}

        {/* PK divider */}
        {hasPkSection && (() => {
          yPos += pkSectionH;
          return (
            <line x1={0} y1={yPos} x2={width} y2={yPos}
              stroke={stroke} strokeWidth={0.7} strokeDasharray="3 2" />
          );
        })()}

        {/* Non-PK attributes */}
        {nonPkAttrs.length > 0 ? (
          nonPkAttrs.map((attr, i) => {
            const rowY = yPos + COMPARTMENT_PAD + i * ROW_HEIGHT + ROW_HEIGHT * 0.7;
            const fillColour = attr.isFK ? colours.fkColour
              : attr.isIndex ? colours.ixColour
              : colours.text;
            return (
              <text
                key={`attr-${i}`}
                x={PADDING_X} y={rowY}
                fontSize={FONT_SIZE} fill={fillColour}
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                style={{ pointerEvents: 'none' }}
              >
                {formatEntityAttribute(attr, isPhysical)}
              </text>
            );
          })
        ) : (
          <text
            x={PADDING_X} y={yPos + COMPARTMENT_PAD + ROW_HEIGHT * 0.6}
            fontSize={FONT_SIZE - 1} fill={colours.text} fillOpacity={0.4}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {isPhysical ? '(no columns)' : '(no attributes)'}
          </text>
        )}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const DmEntityNode = memo(DmEntityNodeComponent);
