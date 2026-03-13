export const LAYER_Y_SPACING = 150;
export const PLANE_WIDTH = 700;
export const PLANE_DEPTH = 500;
export const PERSPECTIVE = 1200;
export const DEFAULT_ROT_Y = -0.3;
export const DEFAULT_ROT_X = 0.18;
export const X_RANGE = 1.484; // ±85°
export const LAYER_COMPRESSION = 0.6;

export interface Projected {
  sx: number;
  sy: number;
  scale: number;
  z: number;
}

export function project3D(
  wx: number,
  wy: number,
  wz: number,
  rotY: number,
  rotX: number,
  centreX: number,
  centreY: number,
): Projected {
  // Y rotation (turntable)
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = wx * cosY - wz * sinY;
  const z1 = wx * sinY + wz * cosY;

  // X tilt
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = wy * cosX - z1 * sinX;
  const z2 = wy * sinX + z1 * cosX;

  // Perspective division
  const s = PERSPECTIVE / (PERSPECTIVE + z2);

  return {
    sx: centreX + x1 * s,
    sy: centreY + y2 * s,
    scale: s,
    z: z2,
  };
}

export function clampRotX(rotX: number): number {
  return Math.max(-X_RANGE, Math.min(X_RANGE, rotX));
}

/**
 * Inverse projection: given screen coordinates and a known wy (layer plane),
 * solve for world wx and wz.
 */
export function screenToWorldOnPlane(
  screenX: number,
  screenY: number,
  layerWy: number,
  rotY: number,
  rotX: number,
  centreX: number,
  centreY: number,
  zoom: number,
  panX: number,
  panY: number,
  viewW: number,
  viewH: number,
): { wx: number; wz: number } {
  // Undo zoom + pan to get the raw projected position
  const cx = viewW / 2;
  const cy = viewH / 2;
  const rawSx = (screenX - panX - cx) / zoom + cx;
  const rawSy = (screenY - panY - cy) / zoom + cy;

  // We need to invert project3D for known wy.
  // project3D does:
  //   x1 = wx*cosY - wz*sinY
  //   z1 = wx*sinY + wz*cosY
  //   y2 = wy*cosX - z1*sinX
  //   z2 = wy*sinX + z1*cosX
  //   s  = P / (P + z2)
  //   sx = centreX + x1*s
  //   sy = centreY + y2*s
  //
  // From sy: y2 = (rawSy - centreY) / s
  // But s depends on z2 which depends on z1 which depends on wx,wz.
  // However y2 and z2 only depend on wy and z1:
  //   y2 = wy*cosX - z1*sinX
  //   z2 = wy*sinX + z1*cosX
  //
  // From sy equation: (rawSy - centreY) = y2 * s = y2 * P/(P + z2)
  // Let dsy = rawSy - centreY, dsx = rawSx - centreX
  // dsy = (wy*cosX - z1*sinX) * P / (P + wy*sinX + z1*cosX)
  // Solve for z1:
  // dsy*(P + wy*sinX + z1*cosX) = P*(wy*cosX - z1*sinX)
  // dsy*P + dsy*wy*sinX + dsy*z1*cosX = P*wy*cosX - P*z1*sinX
  // z1*(dsy*cosX + P*sinX) = P*wy*cosX - dsy*P - dsy*wy*sinX
  // z1 = (P*wy*cosX - dsy*(P + wy*sinX)) / (dsy*cosX + P*sinX)

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const P = PERSPECTIVE;

  const dsx = rawSx - centreX;
  const dsy = rawSy - centreY;

  const denom = dsy * cosX + P * sinX;
  if (Math.abs(denom) < 1e-6) {
    return { wx: 0, wz: 0 };
  }

  const z1 = (P * layerWy * cosX - dsy * (P + layerWy * sinX)) / denom;

  // Now from sx: dsx = x1 * s
  const z2 = layerWy * sinX + z1 * cosX;
  const s = P / (P + z2);
  const x1 = s > 1e-6 ? dsx / s : 0;

  // Invert Y rotation: x1 = wx*cosY - wz*sinY, z1 = wx*sinY + wz*cosY
  // wx = x1*cosY + z1*sinY
  // wz = -x1*sinY + z1*cosY
  const wx = x1 * cosY + z1 * sinY;
  const wz = -x1 * sinY + z1 * cosY;

  return { wx, wz };
}
