export interface PositionedElement {
  id: string;
  name: string;
  archimateType: string;
  specialisation: string | null;
  layer: string;
  sublayer: string | null;
  domainId: string | null;
  status: string;
  properties: Record<string, unknown> | null;
  // World-space position
  wx: number;
  wy: number;
  wz: number;
  // Screen-space (after projection)
  sx: number;
  sy: number;
  scale: number;
  z: number;
  // Dimensions
  width: number;
  height: number;
}

export interface PositionedEdge {
  id: string;
  archimateType: string;
  specialisation: string | null;
  sourceId: string;
  targetId: string;
  label: string | null;
  // Source/target screen positions
  sx1: number;
  sy1: number;
  sx2: number;
  sy2: number;
  sourceLayer: string;
  targetLayer: string;
}

export type ZoomTier = 'birds-eye' | 'context' | 'structure' | 'detail' | 'full';

export interface ZoomTierConfig {
  tier: ZoomTier;
  minZoom: number;
  maxZoom: number;
  showLabel: boolean;
  showIcon: boolean;
  showBadge: boolean;
  showEdgeLabels: boolean;
}

export interface RenderContext {
  width: number;
  height: number;
  zoom: number;
  zoomTier: ZoomTier;
  panX: number;
  panY: number;
  rotY: number;
  rotX: number;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
}
