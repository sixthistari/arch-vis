import { clampRotX } from './projection';

export interface RotationState {
  rotY: number;
  rotX: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

export function handleRotationStart(e: { clientX: number; clientY: number }): Partial<RotationState> {
  return {
    isDragging: true,
    lastX: e.clientX,
    lastY: e.clientY,
  };
}

export function handleRotationMove(
  state: RotationState,
  e: { clientX: number; clientY: number },
  sensitivity: number = 0.005,
): { rotY: number; rotX: number; lastX: number; lastY: number } {
  const dx = e.clientX - state.lastX;
  const dy = e.clientY - state.lastY;

  return {
    rotY: state.rotY + dx * sensitivity,
    rotX: clampRotX(state.rotX - dy * sensitivity),
    lastX: e.clientX,
    lastY: e.clientY,
  };
}

export function handleRotationEnd(): Partial<RotationState> {
  return { isDragging: false };
}
