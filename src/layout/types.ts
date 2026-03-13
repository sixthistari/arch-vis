export interface LayoutInput {
  id: string;
  archimateType: string;
  layer: string;
  sublayer: string | null;
  width: number;
  height: number;
  // Saved position from view_elements (if any)
  savedX?: number;
  savedY?: number;
}

export interface LayoutOutput {
  id: string;
  wx: number;
  wy: number;
  wz: number;
}

export interface SublayerEntry {
  name: string;
  layerKey: string;
  layerIndex: number;
  sublayerIndex: number;
  elementTypes: string[];
  specialisations?: string[];
}
