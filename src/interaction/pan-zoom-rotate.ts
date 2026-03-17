import { DEFAULT_ROT_X, DEFAULT_ROT_Y, clampRotX, LAYER_Y_SPACING } from '../shared/spatial-projection';

export interface CameraState {
  panX: number;
  panY: number;
  zoom: number;
  rotY: number;
  rotX: number;
  layerSpacing: number;  // world-space distance between layer planes
}

export function defaultCameraState(rotationDefault?: { y: number; x: number } | null): CameraState {
  return {
    panX: 0,
    panY: 0,
    zoom: 0.65,
    rotY: rotationDefault?.y ?? DEFAULT_ROT_Y,
    rotX: rotationDefault?.x ?? DEFAULT_ROT_X,
    layerSpacing: LAYER_Y_SPACING,
  };
}

export function applyPan(state: CameraState, dx: number, dy: number): CameraState {
  return { ...state, panX: state.panX + dx, panY: state.panY + dy };
}

export function applyZoom(state: CameraState, delta: number): CameraState {
  const factor = delta > 0 ? 0.93 : 1.07;
  const zoom = Math.max(0.15, Math.min(10, state.zoom * factor));
  return { ...state, zoom };
}

export function applyRotation(state: CameraState, dRotY: number, dRotX: number): CameraState {
  return {
    ...state,
    rotY: state.rotY + dRotY,
    rotX: clampRotX(state.rotX + dRotX),
  };
}

export function applyLayerSpacing(state: CameraState, delta: number): CameraState {
  const spacing = Math.max(40, Math.min(400, state.layerSpacing + delta));
  return { ...state, layerSpacing: spacing };
}

export function resetCamera(rotationDefault?: { y: number; x: number } | null): CameraState {
  return defaultCameraState(rotationDefault);
}

/**
 * Linearly interpolate between two camera states.
 * t ranges from 0 (start) to 1 (end).
 */
export function lerpCamera(a: CameraState, b: CameraState, t: number): CameraState {
  return {
    panX: a.panX + (b.panX - a.panX) * t,
    panY: a.panY + (b.panY - a.panY) * t,
    zoom: a.zoom + (b.zoom - a.zoom) * t,
    rotY: a.rotY + (b.rotY - a.rotY) * t,
    rotX: a.rotX + (b.rotX - a.rotX) * t,
    layerSpacing: a.layerSpacing + (b.layerSpacing - a.layerSpacing) * t,
  };
}

/** Ease-out cubic: fast start, slow finish */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
