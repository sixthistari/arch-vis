/**
 * UML Component diagram node.
 *
 * Rectangle with component icon (stacked rectangles with nubs) OR
 * <<component>> stereotype. Supports:
 * - Provided interfaces: lollipop (circle on stick) on boundary
 * - Required interfaces: socket (half-circle) on boundary
 * - Ports: small squares on boundary
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { getUmlColours } from '../../../../shared/theme-colours';

export interface UmlPort {
  id: string;
  name: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  portType: 'provided' | 'required' | 'port';
  offset?: number; // 0-1 position along the side
}

export interface UmlComponentNodeData {
  label: string;
  stereotype?: string;
  ports?: UmlPort[];
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlComponentNodeType = Node<UmlComponentNodeData, 'uml-component'>;

const WIDTH = 160;
const HEIGHT = 80;
const ICON_SIZE = 16;
const PORT_SIZE = 8;
const LOLLIPOP_R = 5;
const SOCKET_R = 5;

function ComponentIcon({ x, y, stroke }: { x: number; y: number; stroke: string }) {
  const bx = x;
  const by = y;
  const bw = ICON_SIZE * 0.7;
  const bh = ICON_SIZE;
  const nw = ICON_SIZE * 0.3;
  const nh = ICON_SIZE * 0.2;
  return (
    <g>
      <rect x={bx + nw * 0.4} y={by} width={bw} height={bh} stroke={stroke} fill="none" strokeWidth={0.8} />
      <rect x={bx} y={by + bh * 0.15} width={nw} height={nh} stroke={stroke} fill="none" strokeWidth={0.7} />
      <rect x={bx} y={by + bh * 0.6} width={nw} height={nh} stroke={stroke} fill="none" strokeWidth={0.7} />
    </g>
  );
}

function renderPort(port: UmlPort, width: number, height: number, stroke: string, index: number) {
  const offset = port.offset ?? 0.5;
  let cx: number, cy: number;

  switch (port.side) {
    case 'top': cx = width * offset; cy = 0; break;
    case 'bottom': cx = width * offset; cy = height; break;
    case 'left': cx = 0; cy = height * offset; break;
    case 'right': cx = width; cy = height * offset; break;
    default: cx = width * offset; cy = height; break;
  }

  if (port.portType === 'provided') {
    // Lollipop: circle on a stick extending outward
    const stickLen = 12;
    const dx = port.side === 'left' ? -stickLen : port.side === 'right' ? stickLen : 0;
    const dy = port.side === 'top' ? -stickLen : port.side === 'bottom' ? stickLen : 0;
    return (
      <g key={port.id ?? index}>
        <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy} stroke={stroke} strokeWidth={1} />
        <circle cx={cx + dx} cy={cy + dy} r={LOLLIPOP_R} stroke={stroke} fill="none" strokeWidth={1} />
        <text x={cx + dx} y={cy + dy - LOLLIPOP_R - 3} textAnchor="middle" fontSize={8} fill={stroke}>
          {port.name}
        </text>
      </g>
    );
  }

  if (port.portType === 'required') {
    // Socket: half-circle (arc) facing outward
    const dir = port.side === 'left' ? -1 : port.side === 'right' ? 1 : 0;
    const dirY = port.side === 'top' ? -1 : port.side === 'bottom' ? 1 : 0;
    const stickLen = 8;
    const dx = dir * stickLen;
    const dy = dirY * stickLen;
    const arcX = cx + dx;
    const arcY = cy + dy;

    let arcPath: string;
    if (port.side === 'left' || port.side === 'right') {
      const sign = port.side === 'right' ? 1 : -1;
      arcPath = `M${arcX},${arcY - SOCKET_R} A${SOCKET_R},${SOCKET_R} 0 0,${sign > 0 ? 1 : 0} ${arcX},${arcY + SOCKET_R}`;
    } else {
      const sign = port.side === 'bottom' ? 1 : -1;
      arcPath = `M${arcX - SOCKET_R},${arcY} A${SOCKET_R},${SOCKET_R} 0 0,${sign > 0 ? 0 : 1} ${arcX + SOCKET_R},${arcY}`;
    }

    return (
      <g key={port.id ?? index}>
        <line x1={cx} y1={cy} x2={arcX} y2={arcY} stroke={stroke} strokeWidth={1} />
        <path d={arcPath} stroke={stroke} fill="none" strokeWidth={1} />
        <text x={arcX} y={arcY - SOCKET_R - 3} textAnchor="middle" fontSize={8} fill={stroke}>
          {port.name}
        </text>
      </g>
    );
  }

  // Plain port: small square
  return (
    <g key={port.id ?? index}>
      <rect
        x={cx - PORT_SIZE / 2} y={cy - PORT_SIZE / 2}
        width={PORT_SIZE} height={PORT_SIZE}
        stroke={stroke} fill="none" strokeWidth={1}
      />
    </g>
  );
}

function UmlComponentNodeComponent({ data, selected }: NodeProps<UmlComponentNodeType>) {
  const { label, stereotype, ports = [], theme = 'dark', dimmed } = data;
  const { stroke, fill, text: textFill } = getUmlColours(theme, selected);
  const opacity = dimmed ? 0.1 : 1;

  const displayStereotype = stereotype ?? '«component»';

  return (
    <div style={{ opacity }}>
      <svg width={WIDTH + 30} height={HEIGHT + 30} overflow="visible" viewBox={`-15 -15 ${WIDTH + 30} ${HEIGHT + 30}`}>
        {/* Main body */}
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} stroke={stroke} fill={fill} strokeWidth={1.5} />

        {/* Component icon — top right */}
        <ComponentIcon x={WIDTH - ICON_SIZE - 6} y={4} stroke={stroke} />

        {/* Stereotype */}
        <text
          x={WIDTH / 2} y={HEIGHT * 0.35}
          textAnchor="middle" fontSize={9} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {displayStereotype}
        </text>

        {/* Component name */}
        <text
          x={WIDTH / 2} y={HEIGHT * 0.6}
          textAnchor="middle" fontSize={13} fontWeight={700} fill={textFill}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>

        {/* Ports / interfaces */}
        {ports.map((port, i) => renderPort(port, WIDTH, HEIGHT, stroke, i))}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const UmlComponentNode = memo(UmlComponentNodeComponent);
