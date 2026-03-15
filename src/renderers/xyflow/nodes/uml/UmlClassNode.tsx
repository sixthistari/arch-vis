/**
 * UML Class diagram node — 3-compartment box.
 *
 * Compartment 1: Class name (bold, centred). Stereotype if present (<<interface>>, <<enum>>).
 *                Abstract class name in italic.
 * Compartment 2: Attributes with visibility markers (+, -, #, ~).
 *                Static underlined, derived prefixed with /.
 * Compartment 3: Methods with visibility markers.
 *                Abstract in italic, static underlined.
 *
 * Auto-sizes height based on member count.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { getUmlColours, compartmentHeight } from '../../../../notation/theme-colours';

// ═══════════════════════════════════════
// Data types
// ═══════════════════════════════════════

export interface UmlAttribute {
  name: string;
  type?: string;
  visibility?: '+' | '-' | '#' | '~';
  isStatic?: boolean;
  isDerived?: boolean;
  defaultValue?: string;
}

export interface UmlMethod {
  name: string;
  returnType?: string;
  visibility?: '+' | '-' | '#' | '~';
  isStatic?: boolean;
  isAbstract?: boolean;
  parameters?: { name: string; type?: string }[];
}

export interface UmlClassNodeData {
  label: string;
  classType: 'class' | 'abstract-class' | 'interface' | 'enum';
  stereotype?: string;
  attributes?: UmlAttribute[];
  methods?: UmlMethod[];
  enumValues?: string[];
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlClassNodeType = Node<UmlClassNodeData, 'uml-class'>;

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const HEADER_HEIGHT = 32;
const STEREOTYPE_HEIGHT = 14;
const ROW_HEIGHT = 16;
const PADDING_X = 8;
const FONT_SIZE = 11;
const COMPARTMENT_PAD = 6;
const CHAR_WIDTH = 6.8; // approximate monospace char width at 11px

// ═══════════════════════════════════════
// Rendering helpers
// ═══════════════════════════════════════

function visibilityMarker(v?: string): string {
  switch (v) {
    case '+': return '+';
    case '-': return '−';
    case '#': return '#';
    case '~': return '~';
    default: return '+';
  }
}

function formatAttribute(attr: UmlAttribute): string {
  const vis = visibilityMarker(attr.visibility);
  const derived = attr.isDerived ? '/' : '';
  const typeSuffix = attr.type ? ` : ${attr.type}` : '';
  const defaultSuffix = attr.defaultValue ? ` = ${attr.defaultValue}` : '';
  return `${vis} ${derived}${attr.name}${typeSuffix}${defaultSuffix}`;
}

function formatMethod(method: UmlMethod): string {
  const vis = visibilityMarker(method.visibility);
  const params = method.parameters?.map(p => `${p.name}${p.type ? ': ' + p.type : ''}`).join(', ') ?? '';
  const ret = method.returnType ? ` : ${method.returnType}` : '';
  const baseName = method.name.replace(/\(\)$/, '');
  return `${vis} ${baseName}(${params})${ret}`;
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

function UmlClassNodeComponent({ data, selected }: NodeProps<UmlClassNodeType>) {
  const {
    label,
    classType,
    stereotype,
    attributes = [],
    methods = [],
    enumValues = [],
    theme = 'dark',
    dimmed,
  } = data;

  const { stroke, fill, text: textFill, headerFill } = getUmlColours(theme, selected);
  const opacity = dimmed ? 0.1 : 1;

  // Auto-derive stereotype from classType
  const displayStereotype = stereotype ??
    (classType === 'interface' ? '«interface»' :
     classType === 'enum' ? '«enumeration»' :
     classType === 'abstract-class' ? '«abstract»' : undefined);

  const hasStereotype = !!displayStereotype;
  const headerH = HEADER_HEIGHT + (hasStereotype ? STEREOTYPE_HEIGHT : 0);

  // Third compartment: methods for class/interface, enum values for enum
  const thirdItems = classType === 'enum' ? enumValues : methods;
  const attrCompartmentH = compartmentHeight(attributes.length, ROW_HEIGHT, COMPARTMENT_PAD);
  const thirdCompartmentH = compartmentHeight(thirdItems.length, ROW_HEIGHT, COMPARTMENT_PAD);

  const totalHeight = headerH + attrCompartmentH + thirdCompartmentH;

  // Auto-size width from content, unless a saved width is provided
  const savedWidth = (data as Record<string, unknown>).nodeWidth as number | undefined;
  const contentWidth = (() => {
    const attrTexts = attributes.map(formatAttribute);
    const methodTexts = classType === 'enum'
      ? enumValues.map(String)
      : methods.map(formatMethod);
    const allTexts = [...attrTexts, ...methodTexts, label];
    const longestLen = Math.max(0, ...allTexts.map(t => t.length));
    return Math.round(longestLen * CHAR_WIDTH + PADDING_X * 2 + 4);
  })();
  const width = savedWidth ?? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, contentWidth));

  const isAbstract = classType === 'abstract-class';

  return (
    <div style={{ opacity }}>
      <svg width={width} height={totalHeight} overflow="visible">
        {/* Background */}
        <rect x={0} y={0} width={width} height={totalHeight} stroke={stroke} fill={fill} strokeWidth={1.5} />

        {/* Header compartment */}
        <rect x={0} y={0} width={width} height={headerH} stroke={stroke} fill={headerFill} strokeWidth={1.5} />

        {/* Stereotype */}
        {hasStereotype && (
          <text
            x={width / 2} y={12}
            textAnchor="middle" fontSize={9} fill={textFill}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {displayStereotype}
          </text>
        )}

        {/* Class name */}
        <text
          x={width / 2}
          y={hasStereotype ? 28 : headerH / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={700}
          fontStyle={isAbstract ? 'italic' : 'normal'}
          fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>

        {/* Divider: header → attributes */}
        <line x1={0} y1={headerH} x2={width} y2={headerH} stroke={stroke} strokeWidth={1} />

        {/* Attributes compartment */}
        {attributes.length > 0 ? (
          attributes.map((attr, i) => (
            <text
              key={`attr-${i}`}
              x={PADDING_X}
              y={headerH + COMPARTMENT_PAD + i * ROW_HEIGHT + ROW_HEIGHT * 0.7}
              fontSize={FONT_SIZE}
              fill={textFill}
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              textDecoration={attr.isStatic ? 'underline' : undefined}
              style={{ pointerEvents: 'none' }}
            >
              {formatAttribute(attr)}
            </text>
          ))
        ) : (
          <text
            x={PADDING_X} y={headerH + COMPARTMENT_PAD + ROW_HEIGHT * 0.6}
            fontSize={FONT_SIZE - 1} fill={textFill} fillOpacity={0.4}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            (no attributes)
          </text>
        )}

        {/* Divider: attributes → methods/values */}
        <line
          x1={0} y1={headerH + attrCompartmentH}
          x2={width} y2={headerH + attrCompartmentH}
          stroke={stroke} strokeWidth={1}
        />

        {/* Methods / enum values compartment */}
        {thirdItems.length > 0 ? (
          thirdItems.map((item, i) => {
            const isMethod = typeof item === 'object' && 'name' in item;
            const text = isMethod ? formatMethod(item as UmlMethod) : String(item);
            const isAbstractMethod = isMethod && (item as UmlMethod).isAbstract;
            const isStaticMethod = isMethod && (item as UmlMethod).isStatic;
            return (
              <text
                key={`method-${i}`}
                x={PADDING_X}
                y={headerH + attrCompartmentH + COMPARTMENT_PAD + i * ROW_HEIGHT + ROW_HEIGHT * 0.7}
                fontSize={FONT_SIZE}
                fill={textFill}
                fontFamily="'JetBrains Mono', 'Fira Code', monospace"
                fontStyle={isAbstractMethod ? 'italic' : 'normal'}
                textDecoration={isStaticMethod ? 'underline' : undefined}
                style={{ pointerEvents: 'none' }}
              >
                {text}
              </text>
            );
          })
        ) : (
          <text
            x={PADDING_X} y={headerH + attrCompartmentH + COMPARTMENT_PAD + ROW_HEIGHT * 0.6}
            fontSize={FONT_SIZE - 1} fill={textFill} fillOpacity={0.4}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ pointerEvents: 'none' }}
          >
            {classType === 'enum' ? '(no values)' : '(no methods)'}
          </text>
        )}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const UmlClassNode = memo(UmlClassNodeComponent);
