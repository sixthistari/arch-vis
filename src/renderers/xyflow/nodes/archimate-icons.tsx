/**
 * ArchiMate icon glyphs — the small symbols that appear in the top-right corner
 * of box-view elements, or standalone in icon-view.
 *
 * Reference: ArchiMate Cookbook pages 38-43, ArchiMate 3.2 spec.
 * Each icon is an SVG group rendered at a given position and size.
 */
import React from 'react';

interface IconProps {
  x: number;
  y: number;
  size: number;
  stroke: string;
}

/** Stakeholder — glasses/binoculars */
function StakeholderIcon({ x, y, size, stroke }: IconProps) {
  const r = size * 0.22;
  return (
    <g>
      <circle cx={x + size * 0.3} cy={y + size * 0.4} r={r} stroke={stroke} fill="none" strokeWidth={1} />
      <circle cx={x + size * 0.7} cy={y + size * 0.4} r={r} stroke={stroke} fill="none" strokeWidth={1} />
      <line x1={x + size * 0.3 + r} y1={y + size * 0.4} x2={x + size * 0.7 - r} y2={y + size * 0.4} stroke={stroke} strokeWidth={1} />
      <line x1={x + size * 0.08} y1={y + size * 0.35} x2={x + size * 0.3 - r} y2={y + size * 0.4} stroke={stroke} strokeWidth={1} />
      <line x1={x + size * 0.92} y1={y + size * 0.35} x2={x + size * 0.7 + r} y2={y + size * 0.4} stroke={stroke} strokeWidth={1} />
    </g>
  );
}

/** Driver — gear/cog */
function DriverIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.3;
  const teeth = 8;
  const toothLen = size * 0.1;
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a1 = (i / teeth) * Math.PI * 2;
    const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
    const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
    points.push(`${cx + Math.cos(a1) * (r + toothLen)},${cy + Math.sin(a1) * (r + toothLen)}`);
    points.push(`${cx + Math.cos(a2) * (r + toothLen)},${cy + Math.sin(a2) * (r + toothLen)}`);
    points.push(`${cx + Math.cos(a3) * r},${cy + Math.sin(a3) * r}`);
    points.push(`${cx + Math.cos(a4) * r},${cy + Math.sin(a4) * r}`);
  }
  return (
    <g>
      <polygon points={points.join(' ')} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={r * 0.35} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

/** Assessment — magnifying glass */
function AssessmentIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size * 0.4;
  const cy = y + size * 0.4;
  const r = size * 0.25;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} stroke={stroke} fill="none" strokeWidth={1} />
      <line x1={cx + r * 0.7} y1={cy + r * 0.7} x2={x + size * 0.85} y2={y + size * 0.85} stroke={stroke} strokeWidth={1.5} />
    </g>
  );
}

/** Goal — target/bullseye */
function GoalIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size * 0.38} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={size * 0.2} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={size * 0.06} stroke={stroke} fill={stroke} />
    </g>
  );
}

/** Outcome — target with checkmark */
function OutcomeIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size * 0.38} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={size * 0.2} stroke={stroke} fill="none" strokeWidth={0.8} />
      <polyline
        points={`${cx - size * 0.1},${cy} ${cx},${cy + size * 0.12} ${cx + size * 0.2},${cy - size * 0.15}`}
        stroke={stroke} fill="none" strokeWidth={1.2}
      />
    </g>
  );
}

/** Principle — exclamation in rectangle */
function PrincipleIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  return (
    <g>
      <rect x={x + pad} y={y + pad} width={size - pad * 2} height={size - pad * 2} stroke={stroke} fill="none" strokeWidth={0.8} />
      <line x1={x + size / 2} y1={y + size * 0.3} x2={x + size / 2} y2={y + size * 0.55} stroke={stroke} strokeWidth={1.2} />
      <circle cx={x + size / 2} cy={y + size * 0.68} r={1} fill={stroke} />
    </g>
  );
}

/** Requirement — half-arrow rectangle */
function RequirementIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.12;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const sx = x + pad;
  const sy = y + pad;
  return (
    <path
      d={`M${sx},${sy} L${sx + w},${sy} L${sx + w},${sy + h} L${sx},${sy + h} Z M${sx + w * 0.6},${sy} L${sx + w},${sy + h * 0.5} L${sx + w * 0.6},${sy + h}`}
      stroke={stroke} fill="none" strokeWidth={0.8}
    />
  );
}

/** Constraint — slashed requirement */
function ConstraintIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.12;
  const w = size - pad * 2;
  const h = size - pad * 2;
  const sx = x + pad;
  const sy = y + pad;
  return (
    <g>
      <path
        d={`M${sx},${sy} L${sx + w},${sy} L${sx + w},${sy + h} L${sx},${sy + h} Z M${sx + w * 0.6},${sy} L${sx + w},${sy + h * 0.5} L${sx + w * 0.6},${sy + h}`}
        stroke={stroke} fill="none" strokeWidth={0.8}
      />
      <line x1={sx + w * 0.15} y1={sy + h * 0.85} x2={sx + w * 0.55} y2={sy + h * 0.15} stroke={stroke} strokeWidth={0.8} />
    </g>
  );
}

/** Value — ellipse */
function ValueIcon({ x, y, size, stroke }: IconProps) {
  return (
    <ellipse cx={x + size / 2} cy={y + size / 2} rx={size * 0.4} ry={size * 0.3} stroke={stroke} fill="none" strokeWidth={0.8} />
  );
}

/** Capability — 6 squares making 3 steps (staircase) */
function CapabilityIcon({ x, y, size, stroke }: IconProps) {
  const s = size * 0.25;
  const gap = size * 0.04;
  const bx = x + size * 0.1;
  const by = y + size * 0.1;
  return (
    <g>
      {/* Bottom row — 3 squares */}
      <rect x={bx} y={by + (s + gap) * 2} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
      <rect x={bx + s + gap} y={by + (s + gap) * 2} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
      <rect x={bx + (s + gap) * 2} y={by + (s + gap) * 2} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
      {/* Middle row — 2 squares */}
      <rect x={bx} y={by + s + gap} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
      <rect x={bx + s + gap} y={by + s + gap} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
      {/* Top row — 1 square */}
      <rect x={bx} y={by} width={s} height={s} stroke={stroke} fill="none" strokeWidth={0.7} />
    </g>
  );
}

/** Resource — horizontal bars (abacus) */
function ResourceIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  const barH = size * 0.12;
  const gap = size * 0.08;
  return (
    <g>
      <rect x={x + pad} y={y + pad} width={size * 0.7} height={barH} stroke={stroke} fill={stroke} fillOpacity={0.3} strokeWidth={0.6} />
      <rect x={x + pad} y={y + pad + barH + gap} width={size * 0.7} height={barH} stroke={stroke} fill={stroke} fillOpacity={0.3} strokeWidth={0.6} />
      <rect x={x + pad} y={y + pad + (barH + gap) * 2} width={size * 0.7} height={barH} stroke={stroke} fill={stroke} fillOpacity={0.3} strokeWidth={0.6} />
    </g>
  );
}

/** Course of Action — footprints / running figure */
function CourseOfActionIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size * 0.35} stroke={stroke} fill="none" strokeWidth={0.8} />
      <polyline points={`${cx - size * 0.15},${cy + size * 0.05} ${cx},${cy - size * 0.15} ${cx + size * 0.15},${cy + size * 0.05}`} stroke={stroke} fill="none" strokeWidth={1} />
    </g>
  );
}

/** Person — actor (stick figure) */
function PersonIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const headR = size * 0.15;
  const headY = y + size * 0.22;
  return (
    <g>
      <circle cx={cx} cy={headY} r={headR} stroke={stroke} fill="none" strokeWidth={0.8} />
      <line x1={cx} y1={headY + headR} x2={cx} y2={y + size * 0.65} stroke={stroke} strokeWidth={0.8} />
      <line x1={cx - size * 0.2} y1={y + size * 0.42} x2={cx + size * 0.2} y2={y + size * 0.42} stroke={stroke} strokeWidth={0.8} />
      <line x1={cx} y1={y + size * 0.65} x2={cx - size * 0.18} y2={y + size * 0.88} stroke={stroke} strokeWidth={0.8} />
      <line x1={cx} y1={y + size * 0.65} x2={cx + size * 0.18} y2={y + size * 0.88} stroke={stroke} strokeWidth={0.8} />
    </g>
  );
}

/** Role — small rectangle with folded corner */
function RoleIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  const w = size - pad * 2;
  const h = size * 0.5;
  const sy = y + size * 0.25;
  return (
    <g>
      <rect x={x + pad} y={sy} width={w} height={h} rx={h * 0.3} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

/** Interface — lollipop (circle on stick) */
function InterfaceIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const r = size * 0.2;
  return (
    <g>
      <circle cx={cx} cy={y + size * 0.3} r={r} stroke={stroke} fill="none" strokeWidth={0.8} />
      <line x1={cx} y1={y + size * 0.3 + r} x2={cx} y2={y + size * 0.85} stroke={stroke} strokeWidth={0.8} />
    </g>
  );
}

/** Process — hollow right-pointing arrow ⇒ */
function ProcessIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  return (
    <polygon
      points={`${x + pad},${y + pad} ${x + size * 0.6},${y + pad} ${x + size * 0.85},${y + size / 2} ${x + size * 0.6},${y + size - pad} ${x + pad},${y + size - pad}`}
      stroke={stroke} fill="none" strokeWidth={0.8}
    />
  );
}

/** Function — upward chevron ⌃ */
function FunctionIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  return (
    <polyline
      points={`${x + size * 0.2},${y + size * 0.7} ${cx},${y + size * 0.2} ${x + size * 0.8},${y + size * 0.7}`}
      stroke={stroke} fill="none" strokeWidth={1.2}
    />
  );
}

/** Component — stacked rectangles with nubs */
function ComponentIcon({ x, y, size, stroke }: IconProps) {
  const bx = x + size * 0.3;
  const by = y + size * 0.1;
  const bw = size * 0.55;
  const bh = size * 0.8;
  const nw = size * 0.2;
  const nh = size * 0.15;
  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} stroke={stroke} fill="none" strokeWidth={0.8} />
      <rect x={bx - nw * 0.6} y={by + bh * 0.2} width={nw} height={nh} stroke={stroke} fill="none" strokeWidth={0.6} />
      <rect x={bx - nw * 0.6} y={by + bh * 0.6} width={nw} height={nh} stroke={stroke} fill="none" strokeWidth={0.6} />
    </g>
  );
}

/** Node — 3D box outline */
function NodeIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.12;
  const w = size - pad * 2;
  const h = size * 0.55;
  const d = size * 0.18;
  const sx = x + pad;
  const sy = y + size * 0.3;
  return (
    <g>
      <rect x={sx} y={sy} width={w} height={h} stroke={stroke} fill="none" strokeWidth={0.7} />
      <polyline points={`${sx},${sy} ${sx + d},${sy - d} ${sx + w + d},${sy - d} ${sx + w},${sy}`} stroke={stroke} fill="none" strokeWidth={0.7} />
      <polyline points={`${sx + w},${sy} ${sx + w + d},${sy - d} ${sx + w + d},${sy + h - d} ${sx + w},${sy + h}`} stroke={stroke} fill="none" strokeWidth={0.7} />
    </g>
  );
}

/** Device — monitor/screen */
function DeviceIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.1;
  const w = size - pad * 2;
  const h = size * 0.5;
  const sy = y + size * 0.15;
  const cx = x + size / 2;
  return (
    <g>
      <rect x={x + pad} y={sy} width={w} height={h} rx={2} stroke={stroke} fill="none" strokeWidth={0.8} />
      <line x1={cx - size * 0.15} y1={sy + h} x2={cx - size * 0.2} y2={sy + h + size * 0.2} stroke={stroke} strokeWidth={0.8} />
      <line x1={cx + size * 0.15} y1={sy + h} x2={cx + size * 0.2} y2={sy + h + size * 0.2} stroke={stroke} strokeWidth={0.8} />
      <line x1={cx - size * 0.25} y1={sy + h + size * 0.2} x2={cx + size * 0.25} y2={sy + h + size * 0.2} stroke={stroke} strokeWidth={0.8} />
    </g>
  );
}

/** System Software — circle with gear */
function SystemSoftwareIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={size * 0.32} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={size * 0.15} stroke={stroke} fill="none" strokeWidth={0.6} />
    </g>
  );
}

/** Artifact — folded page */
function ArtifactIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  const w = size * 0.55;
  const h = size * 0.7;
  const fold = size * 0.15;
  const sx = x + pad;
  const sy = y + pad;
  return (
    <g>
      <path d={`M${sx},${sy} L${sx + w - fold},${sy} L${sx + w},${sy + fold} L${sx + w},${sy + h} L${sx},${sy + h} Z`} stroke={stroke} fill="none" strokeWidth={0.7} />
      <path d={`M${sx + w - fold},${sy} L${sx + w - fold},${sy + fold} L${sx + w},${sy + fold}`} stroke={stroke} fill="none" strokeWidth={0.7} />
    </g>
  );
}

/** Communication Network — connected nodes */
function NetworkIcon({ x, y, size, stroke }: IconProps) {
  const r = size * 0.08;
  const positions: [number, number][] = [
    [0.3, 0.25], [0.7, 0.25], [0.5, 0.55], [0.25, 0.75], [0.75, 0.75],
  ];
  const lines: [number, number][] = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]];
  return (
    <g>
      {lines.map(([a, b], i) => (
        <line key={i} x1={x + positions[a]![0] * size} y1={y + positions[a]![1] * size} x2={x + positions[b]![0] * size} y2={y + positions[b]![1] * size} stroke={stroke} strokeWidth={0.6} />
      ))}
      {positions.map(([px, py], i) => (
        <circle key={i} cx={x + px * size} cy={y + py * size} r={r} stroke={stroke} fill={stroke} fillOpacity={0.4} strokeWidth={0.6} />
      ))}
    </g>
  );
}

/** Stepped — plateau icon (3 stacked rectangles) */
function SteppedIcon({ x, y, size, stroke }: IconProps) {
  const s = size * 0.25;
  const gap = 1;
  return (
    <g>
      <rect x={x + size * 0.1} y={y + size * 0.55} width={size * 0.8} height={s} stroke={stroke} fill="none" strokeWidth={0.6} />
      <rect x={x + size * 0.1} y={y + size * 0.55 - s - gap} width={size * 0.6} height={s} stroke={stroke} fill="none" strokeWidth={0.6} />
      <rect x={x + size * 0.1} y={y + size * 0.55 - (s + gap) * 2} width={size * 0.4} height={s} stroke={stroke} fill="none" strokeWidth={0.6} />
    </g>
  );
}

/** Meaning — speech bubble */
function MeaningIcon({ x, y, size, stroke }: IconProps) {
  const cx = x + size / 2;
  const cy = y + size * 0.4;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={size * 0.35} ry={size * 0.25} stroke={stroke} fill="none" strokeWidth={0.8} />
      <polyline points={`${cx - size * 0.08},${cy + size * 0.22} ${cx - size * 0.15},${cy + size * 0.42} ${cx + size * 0.05},${cy + size * 0.25}`} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

/** Product — box with horizontal line */
function ProductIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.15;
  const w = size - pad * 2;
  const h = size - pad * 2;
  return (
    <g>
      <rect x={x + pad} y={y + pad} width={w} height={h} stroke={stroke} fill="none" strokeWidth={0.7} />
      <line x1={x + pad} y1={y + pad + h * 0.25} x2={x + pad + w} y2={y + pad + h * 0.25} stroke={stroke} strokeWidth={0.7} />
    </g>
  );
}

/** Collaboration — two overlapping circles */
function CollaborationIcon({ x, y, size, stroke }: IconProps) {
  const r = size * 0.22;
  const cy = y + size / 2;
  return (
    <g>
      <circle cx={x + size * 0.38} cy={cy} r={r} stroke={stroke} fill="none" strokeWidth={0.8} />
      <circle cx={x + size * 0.62} cy={cy} r={r} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

/** Interaction — double-headed arrow */
function InteractionIcon({ x, y, size, stroke }: IconProps) {
  const pad = size * 0.2;
  const cy = y + size / 2;
  return (
    <g>
      <line x1={x + pad} y1={cy} x2={x + size - pad} y2={cy} stroke={stroke} strokeWidth={0.8} />
      <polyline points={`${x + pad + size * 0.1},${cy - size * 0.12} ${x + pad},${cy} ${x + pad + size * 0.1},${cy + size * 0.12}`} stroke={stroke} fill="none" strokeWidth={0.8} />
      <polyline points={`${x + size - pad - size * 0.1},${cy - size * 0.12} ${x + size - pad},${cy} ${x + size - pad - size * 0.1},${cy + size * 0.12}`} stroke={stroke} fill="none" strokeWidth={0.8} />
    </g>
  );
}

// ═══════════════════════════════════════
// Icon registry — maps archimate_type to icon renderer
// ═══════════════════════════════════════

type IconRenderer = (props: IconProps) => React.ReactElement;

const ICON_REGISTRY: Record<string, IconRenderer> = {
  // Motivation
  'stakeholder': StakeholderIcon,
  'driver': DriverIcon,
  'assessment': AssessmentIcon,
  'goal': GoalIcon,
  'outcome': OutcomeIcon,
  'principle': PrincipleIcon,
  'requirement': RequirementIcon,
  'constraint': ConstraintIcon,
  'meaning': MeaningIcon,
  'value': ValueIcon,

  // Strategy
  'resource': ResourceIcon,
  'capability': CapabilityIcon,
  'course-of-action': CourseOfActionIcon,

  // Business
  'business-actor': PersonIcon,
  'business-role': RoleIcon,
  'business-collaboration': CollaborationIcon,
  'business-interface': InterfaceIcon,
  'business-process': ProcessIcon,
  'business-function': FunctionIcon,
  'business-interaction': InteractionIcon,
  'business-service': undefined!, // Service shape IS the icon (pill)
  'business-object': undefined!, // Folded corner IS the icon
  'business-event': undefined!, // Event shape IS the icon
  'contract': undefined!,
  'representation': undefined!,
  'product': ProductIcon,

  // Application
  'application-component': ComponentIcon,
  'application-collaboration': CollaborationIcon,
  'application-interface': InterfaceIcon,
  'application-function': FunctionIcon,
  'application-process': ProcessIcon,
  'application-interaction': InteractionIcon,
  'application-service': undefined!,
  'application-event': undefined!,
  'data-object': undefined!,

  // Technology
  'node': NodeIcon,
  'device': DeviceIcon,
  'system-software': SystemSoftwareIcon,
  'technology-collaboration': CollaborationIcon,
  'technology-interface': InterfaceIcon,
  'technology-function': FunctionIcon,
  'technology-process': ProcessIcon,
  'technology-interaction': InteractionIcon,
  'technology-event': undefined!,
  'technology-service': undefined!,
  'artifact': ArtifactIcon,
  'communication-network': NetworkIcon,
  'path': undefined!,

  // Implementation
  'work-package': undefined!,
  'deliverable': undefined!,
  'implementation-event': undefined!,
  'plateau': SteppedIcon,
  'gap': undefined!,

  // Other
  'grouping': undefined!,
  'location': undefined!,
  'junction': undefined!,
};

// Clean out undefined entries
for (const key of Object.keys(ICON_REGISTRY)) {
  if (!ICON_REGISTRY[key]) delete ICON_REGISTRY[key];
}

/**
 * Get the icon renderer for an ArchiMate type.
 * Returns undefined if the element type has no separate icon
 * (i.e., the shape boundary IS the visual identifier — services, events, passive structure).
 */
export function getArchimateIcon(archimateType: string): IconRenderer | undefined {
  return ICON_REGISTRY[archimateType];
}

export type { IconProps, IconRenderer };
