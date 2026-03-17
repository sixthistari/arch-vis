/**
 * Re-export spatial projection from shared module.
 * The projection math lives in src/shared/spatial-projection.ts
 * to avoid circular dependencies between interaction/layout and renderers.
 */
export {
  LAYER_Y_SPACING,
  PLANE_WIDTH,
  PLANE_DEPTH,
  PERSPECTIVE,
  DEFAULT_ROT_Y,
  DEFAULT_ROT_X,
  X_RANGE,
  LAYER_COMPRESSION,
  project3D,
  clampRotX,
  screenToWorldOnPlane,
  type Projected,
} from '../../shared/spatial-projection';
