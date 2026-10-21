import { describe, expect, it } from 'vitest';
import { eligibleAchievements, minimumWorkers, scalingAchievements } from './achievements';
import { createScaling, pauseScaling, playScaling, runScaling, scalingDefaults, scalingMetrics, scalingVerdict } from './engine';
import type { ScalingConfig } from './engine';

const run = (workers: number, capacities: ScalingConfig['capacities']) => runScaling({ ...scalingDefaults(), workers, capacities, rateLimits: { 1: Math.max(3, capacities[1]), 3: Math.max(5, capacities[3]) } });
const awards = (workers: number, capacities: ScalingConfig['capacities']) => eligibleAchievements(run(workers, capacities));

describe('Scaling achievements', () => {
  it('does not reward configuration clicks or interrupted playback', () => {
    const state = createScaling({ ...scalingDefaults(), workers: 4 });
    for (const snapshot of [state, playScaling(state), pauseScaling(playScaling(state))])
      expect(eligibleAchievements(snapshot)).toEqual([]);
  });
  it('has a reachable actual run for every achievement', () => {
    const fixtures = [
      awards(4, [4, 3, 2, 5]),
      awards(4, [4, 4, 2, 5]),
      awards(4, [4, 4, 4, 2]),
      awards(1, [4, 3, 2, 5]),
      awards(4, [4, 4, 4, 5]),
      awards(8, [1, 8, 8, 8]),
      awards(8, [8, 8, 8, 8]),
    ].flat();
    expect(new Set(fixtures)).toEqual(new Set(scalingAchievements.map(({ id }) => id)));
  });
  it('only awards adding pods when all original resources are unchanged', () => {
    expect(awards(4, [4, 3, 2, 5])).toContain('pods-only');
    expect(awards(4, [4, 4, 2, 5])).not.toContain('pods-only');
    expect(awards(1, [4, 3, 2, 5])).not.toContain('pods-only');
  });
  it('distinguishes timely completion from an affordable victory', () => {
    const result = run(8, [8, 8, 8, 8]);
    expect(scalingMetrics(result)).toMatchObject({ seconds: 18, cost: 612 });
    expect(eligibleAchievements(result)).toEqual(['on-time']);
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('proves the four-worker minimum with a lower bound and feasible witness', () => {
    expect(minimumWorkers(scalingDefaults())).toBe(4);
    for (const workers of [1, 2, 3]) {
      const result = run(workers, [8, 8, 8, 8]);
      expect(scalingMetrics(result).seconds).toBeGreaterThan(37);
      expect(eligibleAchievements(result)).not.toContain('minimum-team');
    }
    const result = run(4, [4, 4, 4, 5]);
    expect(scalingMetrics(result).seconds).toBe(36);
    expect(scalingVerdict(result).won).toBe(true);
    expect(eligibleAchievements(result)).toContain('minimum-team');
    expect(awards(6, [6, 6, 6, 6])).not.toContain('minimum-team');
  });
  it('does not award a trial stopped by a 429', () => {
    const s = runScaling({ ...scalingDefaults(), workers: 4, capacities: [4, 4, 2, 5] });
    expect(s.phase).toBe('rate-limited');
    expect(eligibleAchievements(s)).toEqual([]);
  });
  it('keeps the catalogue focused without revealing the winning worker count', () => {
    expect(scalingAchievements.map(({ id }) => id)).toEqual(['pods-only', 'on-time', 'minimum-team']);
    const award = scalingAchievements.find(({ id }) => id === 'minimum-team')!;
    expect(award.es[1]).toBe('Completa el nivel con el mínimo de workers.');
    expect(award.en[1]).not.toMatch(/\d/);
  });
});
