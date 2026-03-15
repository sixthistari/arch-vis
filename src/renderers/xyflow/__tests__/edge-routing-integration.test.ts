import { describe, it, expect } from 'vitest';
import { computeHandleSides, detectPortSide } from '../edge-routing-integration';

describe('computeHandleSides', () => {
  const W = 80;
  const H = 22;

  it('horizontal arrangement (target right of source) returns r/l', () => {
    const result = computeHandleSides(
      { x: 0, y: 0 }, { x: 200, y: 0 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('r');
    expect(result.tgtSide).toBe('l');
  });

  it('horizontal arrangement (target left of source) returns l/r', () => {
    const result = computeHandleSides(
      { x: 200, y: 0 }, { x: 0, y: 0 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('l');
    expect(result.tgtSide).toBe('r');
  });

  it('vertical arrangement (target below source) returns b/t', () => {
    const result = computeHandleSides(
      { x: 0, y: 0 }, { x: 0, y: 200 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('b');
    expect(result.tgtSide).toBe('t');
  });

  it('vertical arrangement (target above source) returns t/b', () => {
    const result = computeHandleSides(
      { x: 0, y: 200 }, { x: 0, y: 0 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('t');
    expect(result.tgtSide).toBe('b');
  });

  it('diagonal uses aspect ratio to determine dominant axis', () => {
    // Wide node (80x22): aspect ratio threshold is atan2(11, 40) ≈ 0.268 rad
    // Slight diagonal: dx=200, dy=10 → angle ≈ 0.05 → horizontal
    const result = computeHandleSides(
      { x: 0, y: 0 }, { x: 200, y: 10 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('r');
    expect(result.tgtSide).toBe('l');
  });

  it('steep diagonal uses vertical sides', () => {
    // dx=10, dy=200 → angle ≈ 1.52 → well above threshold → vertical
    const result = computeHandleSides(
      { x: 0, y: 0 }, { x: 10, y: 200 },
      W, W, H, H,
    );
    expect(result.srcSide).toBe('b');
    expect(result.tgtSide).toBe('t');
  });

  it('handles square nodes where threshold is 45 degrees', () => {
    const SQ = 50;
    // Exactly 45 degrees (dx=dy=100): angle equals threshold → not < threshold → vertical
    const result = computeHandleSides(
      { x: 0, y: 0 }, { x: 100, y: 100 },
      SQ, SQ, SQ, SQ,
    );
    expect(result.srcSide).toBe('b');
    expect(result.tgtSide).toBe('t');
  });
});

describe('detectPortSide', () => {
  const box = { x: 100, y: 100, w: 80, h: 40 };

  it('point on left face returns left', () => {
    expect(detectPortSide(100, 120, box)).toBe('left');
  });

  it('point on right face returns right', () => {
    expect(detectPortSide(180, 120, box)).toBe('right');
  });

  it('point on top face returns top', () => {
    expect(detectPortSide(140, 100, box)).toBe('top');
  });

  it('point on bottom face returns bottom', () => {
    expect(detectPortSide(140, 140, box)).toBe('bottom');
  });

  it('point near top-left corner goes to left (left is closer)', () => {
    // x=100, y=105 → dl=0, dt=5 → left wins
    expect(detectPortSide(100, 105, box)).toBe('left');
  });

  it('point near top-left corner goes to top (top is closer)', () => {
    // x=105, y=100 → dl=5, dt=0 → top wins
    expect(detectPortSide(105, 100, box)).toBe('top');
  });

  it('point exactly at corner prioritises left over top (equal distance, left checked first)', () => {
    // x=100, y=100 → dl=0, dr=80, dt=0, db=40 → min=0, first match is left
    expect(detectPortSide(100, 100, box)).toBe('left');
  });
});
