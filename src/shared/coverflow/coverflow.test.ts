import { describe, expect, it } from 'vitest';
import { easeOutQuint, positionOf, shortestDelta, wrap } from './coverflow';

describe('circular coverflow geometry', () => {
  it('wraps both directions and handles an empty set', () => {
    expect(wrap(-1, 5)).toBe(4);
    expect(wrap(6, 5)).toBe(1);
    expect(wrap(1, 0)).toBe(0);
  });

  it('travels the short way round the circle', () => {
    expect(shortestDelta(0, 1, 5)).toBe(1);
    expect(shortestDelta(0, 4, 5)).toBe(-1);
    expect(shortestDelta(4, 0, 5)).toBe(1);
    expect(shortestDelta(4.6, 1, 5)).toBeCloseTo(1.4);
  });

  it('eases start and end exactly on their targets', () => {
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
  });

  it.each([3, 4, 5, 8])('wraps %i items only when the returning card is invisible', (count) => {
    const before = positionOf(0, count / 2 - 0.0001, count);
    const after = positionOf(0, count / 2 + 0.0001, count);
    expect(before.opacity).toBeLessThan(0.001);
    expect(after.opacity).toBeLessThan(0.001);
    expect(positionOf(0, 0, count).opacity).toBe(1);
    expect(positionOf(0, count, count)).toEqual(positionOf(0, 0, count));
  });

  it('shades cards by their distance from the centre', () => {
    expect(positionOf(0, 0, 5).shade).toBe(0);
    expect(positionOf(1, 0, 5).shade).toBe(1);
    expect(positionOf(1, 0.5, 5).shade).toBe(0.5);
  });

  it.each([0, 1, 2])('keeps %i items finite for the static fallback', (count) => {
    const pose = positionOf(0, 0, count);
    expect(Number.isFinite(pose.opacity)).toBe(true);
    expect(pose.transform).not.toContain('NaN');
  });
});
