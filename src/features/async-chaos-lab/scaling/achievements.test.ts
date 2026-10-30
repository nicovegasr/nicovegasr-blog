import { describe, expect, it } from 'vitest';
import { eligibleAchievements, minimumWorkers, scalingAchievements } from './achievements';
import { createScaling, pauseScaling, playScaling, runScaling, scalingDefaults, scalingMetrics, scalingVerdict } from './engine';
import type { ScalingConfig } from './engine';

const run = (workers: number, capacities: ScalingConfig['capacities']) => runScaling({ ...scalingDefaults(), workers, capacities, rateLimits: { 1: capacities[1], 3: capacities[3] } });
const twoWorkerWin = () => runScaling({ ...scalingDefaults(), workers: 2, concurrencyPerWorker: 4, capacities: [4, 4, 2, 5] });
const awards = (workers: number, capacities: ScalingConfig['capacities']) => eligibleAchievements(run(workers, capacities));

describe('Scaling achievements', () => {
  it('does not reward configuration clicks or interrupted playback', () => {
    const state = createScaling({ ...scalingDefaults(), workers: 4 });
    for (const snapshot of [state, playScaling(state), pauseScaling(playScaling(state))])
      expect(eligibleAchievements(snapshot)).toEqual([]);
  });
  it('has a reachable actual run for every achievement', () => {
    const fixtures = [
      eligibleAchievements(runScaling({ ...scalingDefaults(), workers: 2 })),
      eligibleAchievements(twoWorkerWin()),
      awards(1, [4, 3, 2, 5]),
      awards(8, [1, 8, 8, 8]),
      awards(8, [8, 8, 8, 8]),
    ].flat();
    expect(new Set(fixtures)).toEqual(new Set(scalingAchievements.map(({ id }) => id)));
  });
  it('only awards adding pods when all original resources are unchanged', () => {
    expect(eligibleAchievements(runScaling({ ...scalingDefaults(), workers: 2 }))).toContain('pods-only');
    expect(eligibleAchievements(runScaling({ ...scalingDefaults(), workers: 3 })), 'the third worker exceeds the included quota').toEqual([]);
    expect(awards(4, [4, 4, 2, 5])).not.toContain('pods-only');
    expect(eligibleAchievements(runScaling({ ...scalingDefaults(), workers: 2, concurrencyPerWorker: 2 })), 'holding more payments is not adding only workers').not.toContain('pods-only');
    expect(awards(1, [4, 3, 2, 5])).not.toContain('pods-only');
  });
  it('distinguishes timely completion from an affordable victory', () => {
    const result = run(8, [8, 8, 8, 8]);
    expect(scalingMetrics(result)).toMatchObject({ seconds: 18, cost: 684 });
    expect(eligibleAchievements(result)).toEqual(['on-time']);
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('proves the two-worker minimum with a lower bound and feasible witness', () => {
    expect(minimumWorkers(scalingDefaults())).toBe(2);
    const oneWorker = runScaling({ ...scalingDefaults(), concurrencyPerWorker: 8, capacities: [8, 8, 8, 8], rateLimits: { 1: 8, 3: 8 } });
    expect(scalingMetrics(oneWorker).seconds, 'its CPU validates one payment per second').toBe(29);
    expect(eligibleAchievements(oneWorker)).not.toContain('minimum-team');
    const result = twoWorkerWin();
    expect(scalingMetrics(result)).toMatchObject({ seconds: 22, cost: 66 });
    expect(scalingVerdict(result).won).toBe(true);
    expect(eligibleAchievements(result)).toContain('minimum-team');
    const largerTeam = runScaling({ ...scalingDefaults(), workers: 3, concurrencyPerWorker: 6, capacities: [4, 6, 2, 5], rateLimits: { 1: 3, 3: 2 } });
    expect(scalingVerdict(largerTeam).won).toBe(true);
    expect(eligibleAchievements(largerTeam)).not.toContain('minimum-team');
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
