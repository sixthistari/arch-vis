/**
 * ArchiMate palette icons — based on ArchiMate 3.2 visual notation spec.
 * Reference: reference/svg.png (Archi tool export)
 *
 * Each function renders a self-contained SVG icon for a specific ArchiMate type.
 * Icons are designed to render at 32×22 palette size with layer-coloured strokes.
 *
 * To revert to the old programmatic icons, set USE_ARCHI_PALETTE_ICONS = false
 * in Palette.tsx (the old renderMiniShape function is preserved there).
 */
import React from 'react';

const W = 32, H = 22, VB = '0 0 34 24';
const SW = 1.2;

function svg(children: React.ReactElement[]): React.ReactElement {
  return React.createElement('svg', {
    width: W + 2, height: H + 2, viewBox: VB, style: { flexShrink: 0 },
  }, ...children);
}

// ═══════════════════════════════════════════════
// Strategy Layer
// ═══════════════════════════════════════════════

function resource(s: string) {
  // Rectangle with horizontal lines inside (structure)
  return svg([
    React.createElement('rect', { key: 'r', x: 1, y: 1, width: W, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 1 }),
    React.createElement('line', { key: 'l1', x1: 5, y1: 8, x2: W - 3, y2: 8, stroke: s, strokeWidth: 0.6, opacity: 0.5 }),
    React.createElement('line', { key: 'l2', x1: 5, y1: 12, x2: W - 3, y2: 12, stroke: s, strokeWidth: 0.6, opacity: 0.5 }),
    React.createElement('line', { key: 'l3', x1: 5, y1: 16, x2: W - 3, y2: 16, stroke: s, strokeWidth: 0.6, opacity: 0.5 }),
  ]);
}

function capability(s: string) {
  // Rounded rect with nested smaller rounded rect (capability marker)
  return svg([
    React.createElement('rect', { key: 'o', x: 1, y: 1, width: W, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 3, ry: 3 }),
    React.createElement('rect', { key: 'i', x: 6, y: 5, width: W - 10, height: H - 8, stroke: s, fill: 'none', strokeWidth: 0.8, rx: 2, ry: 2, opacity: 0.5 }),
  ]);
}

function valueStream(s: string) {
  // Wide chevron/arrow shape (pointed right)
  const h2 = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'vs',
      d: `M1,1 L${W - 5},1 L${W + 1},${h2} L${W - 5},${H + 1} L1,${H + 1} L7,${h2} Z`,
      stroke: s, fill: 'none', strokeWidth: SW, strokeLinejoin: 'round',
    }),
  ]);
}

function courseOfAction(s: string) {
  // Rounded rect with curved arrow inside
  return svg([
    React.createElement('rect', { key: 'r', x: 1, y: 1, width: W, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 8, ry: 8 }),
    React.createElement('path', {
      key: 'a',
      d: `M12,8 Q17,5 22,8 Q27,11 22,14`,
      stroke: s, fill: 'none', strokeWidth: 1, opacity: 0.6,
    }),
    React.createElement('path', {
      key: 'ah',
      d: `M20,12.5 L22,14 L19.5,14.5`,
      stroke: s, fill: 'none', strokeWidth: 0.8, opacity: 0.6,
    }),
  ]);
}

// ═══════════════════════════════════════════════
// Business Layer
// ═══════════════════════════════════════════════

function businessActor(s: string) {
  // Stick figure (person)
  const cx = W / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'h', cx, cy: 4, r: 2.5, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('line', { key: 'b', x1: cx, y1: 6.5, x2: cx, y2: 14, stroke: s, strokeWidth: SW }),
    React.createElement('line', { key: 'a', x1: cx - 5, y1: 9, x2: cx + 5, y2: 9, stroke: s, strokeWidth: SW }),
    React.createElement('line', { key: 'll', x1: cx, y1: 14, x2: cx - 4, y2: H + 1, stroke: s, strokeWidth: SW }),
    React.createElement('line', { key: 'rl', x1: cx, y1: 14, x2: cx + 4, y2: H + 1, stroke: s, strokeWidth: SW }),
  ]);
}

function businessRole(s: string) {
  // Circle with small angle/hat at top (role symbol)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c', cx, cy: cy + 1, r: 6, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('path', { key: 'hat', d: `M${cx - 3},${cy - 4} L${cx},${cy - 7} L${cx + 3},${cy - 4}`, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function businessCollaboration(s: string) {
  // Two overlapping circles
  const cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c1', cx: W / 2 - 2, cy, r: 6, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('circle', { key: 'c2', cx: W / 2 + 4, cy, r: 6, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function businessInterface(s: string) {
  // Lollipop: half-circle on a stick
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c', cx, cy: cy - 2, r: 4, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('line', { key: 'l', x1: cx, y1: cy + 2, x2: cx, y2: H + 1, stroke: s, strokeWidth: SW }),
  ]);
}

function businessFunction(s: string) {
  // Chevron/arrow pointing right (function marker) — flat bottom
  const cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'f',
      d: `M3,3 L${W - 5},3 L${W + 1},${cy} L${W - 5},${H - 1} L3,${H - 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW, strokeLinejoin: 'round',
    }),
  ]);
}

function businessInteraction(s: string) {
  // Double-pointed arrow shape (both ends pointed)
  const cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'ia',
      d: `M7,${cy} L1,3 L${W - 5},3 L${W + 1},${cy} L${W - 5},${H - 1} L1,${H - 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW, strokeLinejoin: 'round',
    }),
  ]);
}

function businessEvent(s: string) {
  // Notched left, rounded right
  const notch = 4;
  return svg([
    React.createElement('path', {
      key: 'e',
      d: `M${notch + 1},1 L${W - 3},1 Q${W + 1},1 ${W + 1},${H / 2 + 1} Q${W + 1},${H + 1} ${W - 3},${H + 1} L${notch + 1},${H + 1} L1,${H / 2 + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function businessService(s: string) {
  // Rounded rect / pill (service)
  return svg([
    React.createElement('rect', {
      key: 'r', x: 1, y: 3, width: W, height: H - 4,
      stroke: s, fill: 'none', strokeWidth: SW, rx: (H - 4) / 2, ry: (H - 4) / 2,
    }),
  ]);
}

function businessProcess(s: string) {
  // Arrow shape with flat back (process marker) — small right arrow
  const cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'p',
      d: `M1,3 L${W - 5},3 L${W + 1},${cy} L${W - 5},${H - 1} L1,${H - 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW, strokeLinejoin: 'round',
    }),
    // Small vertical bar at left to distinguish from function
    React.createElement('line', { key: 'bar', x1: 5, y1: 5, x2: 5, y2: H - 3, stroke: s, strokeWidth: 0.7, opacity: 0.5 }),
  ]);
}

function businessObject(s: string) {
  // Folded-corner rectangle
  const fold = 4;
  return svg([
    React.createElement('path', {
      key: 'r',
      d: `M1,1 L${W - fold + 1},1 L${W + 1},${fold + 1} L${W + 1},${H + 1} L1,${H + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('path', {
      key: 'f',
      d: `M${W - fold + 1},1 L${W - fold + 1},${fold + 1} L${W + 1},${fold + 1}`,
      stroke: s, fill: 'none', strokeWidth: SW * 0.7, opacity: 0.5,
    }),
  ]);
}

function contract(s: string) {
  // Folded-corner rectangle with horizontal line
  const fold = 4;
  return svg([
    React.createElement('path', {
      key: 'r',
      d: `M1,1 L${W - fold + 1},1 L${W + 1},${fold + 1} L${W + 1},${H + 1} L1,${H + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('path', {
      key: 'f',
      d: `M${W - fold + 1},1 L${W - fold + 1},${fold + 1} L${W + 1},${fold + 1}`,
      stroke: s, fill: 'none', strokeWidth: SW * 0.7, opacity: 0.5,
    }),
    React.createElement('line', { key: 'l', x1: 4, y1: H / 2 + 2, x2: W - 2, y2: H / 2 + 2, stroke: s, strokeWidth: 0.7, opacity: 0.5 }),
  ]);
}

function representation(s: string) {
  // Rectangle with wavy bottom edge
  return svg([
    React.createElement('path', {
      key: 'r',
      d: `M1,1 L${W + 1},1 L${W + 1},${H - 2} Q${W * 0.75},${H + 3} ${W / 2 + 1},${H - 2} Q${W * 0.25},${H - 6} 1,${H - 2} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function product(s: string) {
  // Rectangle with small square inside (product marker)
  return svg([
    React.createElement('rect', { key: 'r', x: 1, y: 1, width: W, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 1 }),
    React.createElement('rect', { key: 'sq', x: W - 6, y: 2, width: 5, height: 5, stroke: s, fill: 'none', strokeWidth: 0.7 }),
  ]);
}

// ═══════════════════════════════════════════════
// Application Layer
// ═══════════════════════════════════════════════

function applicationComponent(s: string) {
  // Rectangle with component pins (two small nubs on left)
  return svg([
    React.createElement('rect', { key: 'r', x: 5, y: 1, width: W - 4, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 1 }),
    React.createElement('rect', { key: 'n1', x: 1, y: 4, width: 6, height: 3, stroke: s, fill: 'none', strokeWidth: 0.8 }),
    React.createElement('rect', { key: 'n2', x: 1, y: 14, width: 6, height: 3, stroke: s, fill: 'none', strokeWidth: 0.8 }),
  ]);
}

// Application collaboration, interface, function, interaction, process, event, service
// reuse the same shapes as business but with application colour (caller passes stroke)
const applicationCollaboration = businessCollaboration;
const applicationInterface = businessInterface;
const applicationFunction = businessFunction;
const applicationInteraction = businessInteraction;
const applicationProcess = businessProcess;
const applicationEvent = businessEvent;
const applicationService = businessService;

function dataObject(s: string) {
  return businessObject(s); // Same folded-corner shape
}

// ═══════════════════════════════════════════════
// Technology Layer
// ═══════════════════════════════════════════════

function node(s: string) {
  // 3D box
  const d = 4;
  return svg([
    React.createElement('rect', { key: 'front', x: 1, y: d + 1, width: W - d, height: H - d, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('path', {
      key: 'top',
      d: `M1,${d + 1} L${d + 1},1 L${W + 1},1 L${W - d + 1},${d + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('path', {
      key: 'right',
      d: `M${W - d + 1},${d + 1} L${W + 1},1 L${W + 1},${H - d + 1} L${W - d + 1},${H + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function device(s: string) {
  // 3D box variant with thicker base (device)
  const d = 4;
  return svg([
    React.createElement('rect', { key: 'front', x: 1, y: d + 1, width: W - d, height: H - d, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('path', {
      key: 'top',
      d: `M1,${d + 1} L${d + 1},1 L${W + 1},1 L${W - d + 1},${d + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('path', {
      key: 'right',
      d: `M${W - d + 1},${d + 1} L${W + 1},1 L${W + 1},${H - d + 1} L${W - d + 1},${H + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    // Base line for device
    React.createElement('line', { key: 'base', x1: 3, y1: H + 1, x2: W - d - 1, y2: H + 1, stroke: s, strokeWidth: SW * 1.5 }),
  ]);
}

function communicationNetwork(s: string) {
  // Dashed line with dots at ends (network)
  const cy = H / 2 + 1;
  return svg([
    React.createElement('line', { key: 'l', x1: 5, y1: cy, x2: W - 3, y2: cy, stroke: s, strokeWidth: SW, strokeDasharray: '3 2' }),
    React.createElement('circle', { key: 'c1', cx: 4, cy, r: 2, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('circle', { key: 'c2', cx: W - 2, cy, r: 2, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function systemSoftware(s: string) {
  // Two overlapping circles (like a Venn — system software marker)
  const cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c1', cx: W / 2 - 1, cy: cy + 1, r: 6, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('circle', { key: 'c2', cx: W / 2 + 3, cy: cy - 2, r: 5, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function technologyInterface(s: string) {
  return businessInterface(s);
}

function path(s: string) {
  // Dashed line (path)
  const cy = H / 2 + 1;
  return svg([
    React.createElement('line', { key: 'l', x1: 3, y1: cy, x2: W - 1, y2: cy, stroke: s, strokeWidth: SW, strokeDasharray: '4 2' }),
    React.createElement('path', { key: 'a1', d: `M${W - 4},${cy - 2} L${W - 1},${cy} L${W - 4},${cy + 2}`, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('path', { key: 'a2', d: `M6,${cy - 2} L3,${cy} L6,${cy + 2}`, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

const technologyFunction = businessFunction;
const technologyProcess = businessProcess;
const technologyInteraction = businessInteraction;
const technologyEvent = businessEvent;
const technologyService = businessService;

function artifact(s: string) {
  // Folded-corner document with small circle (gear-like)
  const fold = 4;
  return svg([
    React.createElement('path', {
      key: 'r',
      d: `M1,1 L${W - fold + 1},1 L${W + 1},${fold + 1} L${W + 1},${H + 1} L1,${H + 1} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('path', {
      key: 'f',
      d: `M${W - fold + 1},1 L${W - fold + 1},${fold + 1} L${W + 1},${fold + 1}`,
      stroke: s, fill: 'none', strokeWidth: SW * 0.7, opacity: 0.5,
    }),
  ]);
}

// ═══════════════════════════════════════════════
// Motivation Layer
// ═══════════════════════════════════════════════

function stakeholder(s: string) {
  return businessActor(s); // Same stick figure, different colour
}

function driver(s: string) {
  // Diamond/rhombus shape
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'd',
      d: `M${cx},1 L${W + 1},${cy} L${cx},${H + 1} L1,${cy} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function assessment(s: string) {
  // Circle (assessment)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c', cx, cy, r: Math.min(W, H) / 2, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function goal(s: string) {
  // Ellipse with inner ellipse (target-like)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('ellipse', { key: 'o', cx, cy, rx: W / 2, ry: H / 2, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('ellipse', { key: 'i', cx, cy, rx: W / 2 - 3, ry: H / 2 - 2, stroke: s, fill: 'none', strokeWidth: 0.7, opacity: 0.5 }),
  ]);
}

function outcome(s: string) {
  // Ellipse (similar to goal but single ring)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('ellipse', { key: 'e', cx, cy, rx: W / 2, ry: H / 2, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function principle(s: string) {
  // Bookmark/flag shape (triangle on top of vertical line)
  const cx = W / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'f',
      d: `M${cx - 6},2 L${cx + 6},2 L${cx + 6},${H - 2} L${cx},${H - 6} L${cx - 6},${H - 2} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function constraintShape(s: string) {
  // Rotated cross/X shape — two triangles meeting
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    // Top-right triangle
    React.createElement('path', {
      key: 'tr',
      d: `M${cx},${cy} L${W - 1},2 L${W - 1},${cy} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    // Bottom-left triangle
    React.createElement('path', {
      key: 'bl',
      d: `M${cx},${cy} L3,${H} L3,${cy} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function requirement(s: string) {
  // Half-arrow / chevron pointing right (requirement)
  const cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'req',
      d: `M3,2 L${W - 3},2 L${W - 3},${cy - 3} L${W + 1},${cy} L${W - 3},${cy + 3} L${W - 3},${H} L3,${H} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function meaning(s: string) {
  // Cloud / thought bubble shape
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'm',
      d: `M8,${H - 2} Q1,${H - 2} 2,${cy} Q1,4 7,3 Q10,1 ${cx},3 Q${W - 4},1 ${W - 2},5 Q${W + 1},8 ${W},${cy} Q${W + 1},${H - 3} ${W - 4},${H - 1} Q${W - 8},${H + 1} ${cx},${H - 1} Q8,${H + 1} 8,${H - 2} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
  ]);
}

function value(s: string) {
  // Ellipse (value — same shape as outcome)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('ellipse', { key: 'e', cx, cy, rx: W / 2, ry: H / 2, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

// ═══════════════════════════════════════════════
// Implementation & Migration
// ═══════════════════════════════════════════════

function workPackage(s: string) {
  // Rectangle with horizontal header band
  return svg([
    React.createElement('rect', { key: 'r', x: 1, y: 1, width: W, height: H, stroke: s, fill: 'none', strokeWidth: SW, rx: 2 }),
    React.createElement('line', { key: 'l', x1: 1, y1: 6, x2: W + 1, y2: 6, stroke: s, strokeWidth: 0.7, opacity: 0.5 }),
  ]);
}

function deliverable(s: string) {
  return businessObject(s); // Folded-corner
}

function implementationEvent(s: string) {
  return businessEvent(s); // Event shape
}

function plateau(s: string) {
  // Stacked rectangles (3 layers)
  return svg([
    React.createElement('rect', { key: 'r1', x: 1, y: 7, width: W - 4, height: H - 6, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('rect', { key: 'r2', x: 3, y: 4, width: W - 4, height: H - 6, stroke: s, fill: 'none', strokeWidth: SW }),
    React.createElement('rect', { key: 'r3', x: 5, y: 1, width: W - 4, height: H - 6, stroke: s, fill: 'none', strokeWidth: SW }),
  ]);
}

function gap(s: string) {
  // Ellipse with gap/break (dashed)
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('ellipse', {
      key: 'e', cx, cy, rx: W / 2, ry: H / 2,
      stroke: s, fill: 'none', strokeWidth: SW,
      strokeDasharray: '3 2',
    }),
  ]);
}

// ═══════════════════════════════════════════════
// Other / Composite
// ═══════════════════════════════════════════════

function grouping(s: string) {
  return svg([
    React.createElement('rect', {
      key: 'r', x: 1, y: 1, width: W, height: H,
      stroke: s, fill: 'none', strokeWidth: SW, strokeDasharray: '3 2', rx: 1,
    }),
  ]);
}

function junction(s: string) {
  const cx = W / 2 + 1, cy = H / 2 + 1;
  return svg([
    React.createElement('circle', { key: 'c', cx, cy, r: 5, fill: s }),
  ]);
}

function location(s: string) {
  const cx = W / 2 + 1;
  return svg([
    React.createElement('path', {
      key: 'pin',
      d: `M${cx},${H} Q${cx - 8},${H / 2} ${cx},2 Q${cx + 8},${H / 2} ${cx},${H} Z`,
      stroke: s, fill: 'none', strokeWidth: SW,
    }),
    React.createElement('circle', { key: 'dot', cx, cy: 8, r: 2.5, stroke: s, fill: 'none', strokeWidth: 0.8 }),
  ]);
}

// ═══════════════════════════════════════════════
// Master lookup
// ═══════════════════════════════════════════════

const ARCHI_ICON_MAP: Record<string, (s: string) => React.ReactElement> = {
  // Strategy
  'resource': resource,
  'capability': capability,
  'value-stream': valueStream,
  'course-of-action': courseOfAction,

  // Business
  'business-actor': businessActor,
  'business-role': businessRole,
  'business-collaboration': businessCollaboration,
  'business-interface': businessInterface,
  'business-function': businessFunction,
  'business-interaction': businessInteraction,
  'business-event': businessEvent,
  'business-service': businessService,
  'business-process': businessProcess,
  'business-object': businessObject,
  'contract': contract,
  'representation': representation,
  'product': product,

  // Application
  'application-component': applicationComponent,
  'application-collaboration': applicationCollaboration,
  'application-interface': applicationInterface,
  'application-function': applicationFunction,
  'application-interaction': applicationInteraction,
  'application-process': applicationProcess,
  'application-event': applicationEvent,
  'application-service': applicationService,
  'data-object': dataObject,

  // Technology
  'node': node,
  'device': device,
  'communication-network': communicationNetwork,
  'system-software': systemSoftware,
  'technology-interface': technologyInterface,
  'path': path,
  'technology-function': technologyFunction,
  'technology-process': technologyProcess,
  'technology-interaction': technologyInteraction,
  'technology-event': technologyEvent,
  'technology-service': technologyService,
  'artifact': artifact,

  // Motivation
  'stakeholder': stakeholder,
  'driver': driver,
  'assessment': assessment,
  'goal': goal,
  'outcome': outcome,
  'principle': principle,
  'constraint': constraintShape,
  'requirement': requirement,
  'meaning': meaning,
  'value': value,

  // Implementation
  'work-package': workPackage,
  'deliverable': deliverable,
  'implementation-event': implementationEvent,
  'plateau': plateau,
  'gap': gap,

  // Other
  'grouping': grouping,
  'junction': junction,
  'location': location,
};

/**
 * Render an ArchiMate notation icon for the palette.
 * Returns the icon SVG element, or null if no icon is defined for this type.
 */
export function renderArchiIcon(type: string, stroke: string): React.ReactElement | null {
  const fn = ARCHI_ICON_MAP[type];
  return fn ? fn(stroke) : null;
}

/**
 * Check if an ArchiMate icon exists for a given type.
 */
export function hasArchiIcon(type: string): boolean {
  return type in ARCHI_ICON_MAP;
}
