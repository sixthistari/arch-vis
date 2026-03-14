/**
 * UML Use Case diagram nodes — actor (stickman) and use case (oval).
 *
 * The archimate_type determines which shape is rendered:
 * - uml-actor: stickman figure with label below
 * - uml-use-case: oval with centred label
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';

// ═══════════════════════════════════════
// Data types
// ═══════════════════════════════════════

export interface UmlUseCaseNodeData {
  label: string;
  useCaseType: 'actor' | 'use-case';
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlUseCaseNodeType = Node<UmlUseCaseNodeData, 'uml-use-case'>;

// ═══════════════════════════════════════
// Actor stickman
// ═══════════════════════════════════════

const ACTOR_WIDTH = 60;
const ACTOR_HEIGHT = 80;

function ActorShape({ stroke, textFill, label }: { stroke: string; textFill: string; label: string }) {
  // Stickman proportions (within 60x80 viewBox)
  const cx = 30;     // centre x
  const headR = 8;   // head radius
  const headY = 10;  // head centre y
  const neckY = headY + headR;
  const bodyY = 48;  // torso bottom
  const armY = 30;   // arm height
  const armSpan = 18;
  const legSpan = 14;
  const legY = 65;   // foot y

  return (
    <svg width={ACTOR_WIDTH} height={ACTOR_HEIGHT + 20} overflow="visible">
      {/* Head */}
      <circle cx={cx} cy={headY} r={headR} stroke={stroke} fill="none" strokeWidth={1.5} />
      {/* Body */}
      <line x1={cx} y1={neckY} x2={cx} y2={bodyY} stroke={stroke} strokeWidth={1.5} />
      {/* Arms */}
      <line x1={cx - armSpan} y1={armY} x2={cx + armSpan} y2={armY} stroke={stroke} strokeWidth={1.5} />
      {/* Left leg */}
      <line x1={cx} y1={bodyY} x2={cx - legSpan} y2={legY} stroke={stroke} strokeWidth={1.5} />
      {/* Right leg */}
      <line x1={cx} y1={bodyY} x2={cx + legSpan} y2={legY} stroke={stroke} strokeWidth={1.5} />
      {/* Label below */}
      <text
        x={cx} y={ACTOR_HEIGHT + 2}
        textAnchor="middle" fontSize={11} fontWeight={600} fill={textFill}
        fontFamily="Inter, system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════
// Use Case oval
// ═══════════════════════════════════════

const UC_WIDTH = 140;
const UC_HEIGHT = 50;

function UseCaseShape({ stroke, fill, textFill, label }: { stroke: string; fill: string; textFill: string; label: string }) {
  return (
    <svg width={UC_WIDTH} height={UC_HEIGHT} overflow="visible">
      <ellipse
        cx={UC_WIDTH / 2} cy={UC_HEIGHT / 2}
        rx={UC_WIDTH / 2 - 1} ry={UC_HEIGHT / 2 - 1}
        stroke={stroke} fill={fill} strokeWidth={1.5}
      />
      <text
        x={UC_WIDTH / 2} y={UC_HEIGHT / 2 + 1}
        textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={600} fill={textFill}
        fontFamily="Inter, system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

function UmlUseCaseNodeComponent({ data, selected }: NodeProps<UmlUseCaseNodeType>) {
  const { label, useCaseType, theme = 'dark', dimmed } = data;
  const isDark = theme === 'dark';
  const stroke = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const fill = isDark ? '#1E293B' : '#FFFFFF';
  const textFill = isDark ? '#E5E7EB' : '#1F2937';
  const opacity = dimmed ? 0.1 : 1;

  return (
    <div style={{ opacity }}>
      {useCaseType === 'actor' ? (
        <ActorShape stroke={stroke} textFill={textFill} label={label} />
      ) : (
        <UseCaseShape stroke={stroke} fill={fill} textFill={textFill} label={label} />
      )}
      <RoutingHandles />
    </div>
  );
}

export const UmlUseCaseNode = memo(UmlUseCaseNodeComponent);
