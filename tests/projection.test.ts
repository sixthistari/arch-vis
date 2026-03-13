import { describe, it, expect } from 'vitest';
import { project3D, clampRotX, PERSPECTIVE, X_RANGE } from '../src/renderers/spatial/projection';

describe('project3D', () => {
  const cx = 400;
  const cy = 300;

  it('projects origin to centre when no rotation', () => {
    const result = project3D(0, 0, 0, 0, 0, cx, cy);
    expect(result.sx).toBeCloseTo(cx);
    expect(result.sy).toBeCloseTo(cy);
    expect(result.scale).toBeCloseTo(1);
    expect(result.z).toBeCloseTo(0);
  });

  it('applies perspective scaling for positive z', () => {
    const result = project3D(0, 0, 200, 0, 0, cx, cy);
    expect(result.scale).toBeLessThan(1);
    expect(result.scale).toBeCloseTo(PERSPECTIVE / (PERSPECTIVE + 200));
  });

  it('applies perspective scaling for negative z', () => {
    const result = project3D(0, 0, -200, 0, 0, cx, cy);
    expect(result.scale).toBeGreaterThan(1);
  });

  it('offsets x position', () => {
    const result = project3D(100, 0, 0, 0, 0, cx, cy);
    expect(result.sx).toBeCloseTo(cx + 100);
    expect(result.sy).toBeCloseTo(cy);
  });

  it('offsets y position', () => {
    const result = project3D(0, 100, 0, 0, 0, cx, cy);
    expect(result.sx).toBeCloseTo(cx);
    expect(result.sy).toBeCloseTo(cy + 100);
  });

  it('applies Y rotation', () => {
    const result = project3D(100, 0, 0, Math.PI / 2, 0, cx, cy);
    // After 90° Y rotation, x=100 should become z≈100, x≈0
    expect(Math.abs(result.sx - cx)).toBeLessThan(1);
    expect(result.z).toBeCloseTo(100);
  });

  it('applies X tilt', () => {
    const result = project3D(0, 100, 0, 0, Math.PI / 4, cx, cy);
    // After 45° X tilt, y=100 becomes y≈70.7, z≈70.7
    const cos45 = Math.cos(Math.PI / 4);
    const expectedY = 100 * cos45;
    const expectedZ = 100 * Math.sin(Math.PI / 4);
    const expectedScale = PERSPECTIVE / (PERSPECTIVE + expectedZ);
    expect(result.sy).toBeCloseTo(cy + expectedY * expectedScale);
  });

  it('depth sort: further objects have higher z', () => {
    const near = project3D(0, 0, -100, 0, 0, cx, cy);
    const far = project3D(0, 0, 100, 0, 0, cx, cy);
    expect(far.z).toBeGreaterThan(near.z);
  });
});

describe('clampRotX', () => {
  it('clamps within range', () => {
    expect(clampRotX(0)).toBe(0);
    expect(clampRotX(X_RANGE + 1)).toBe(X_RANGE);
    expect(clampRotX(-X_RANGE - 1)).toBe(-X_RANGE);
    expect(clampRotX(0.5)).toBe(0.5);
    expect(clampRotX(1.0)).toBe(1.0);  // now within ±85° range
  });
});
