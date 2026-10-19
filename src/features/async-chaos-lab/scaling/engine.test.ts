import { describe, expect, it } from 'vitest';
import {
  createScaling,
  PAYMENT_COUNT,
  pauseScaling,
  playScaling,
  resourceCapacities,
  runScaling,
  scalingDefaults,
  scalingMetrics,
  scalingVerdict,
  tickScaling,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';

function config(workers: number): ScalingConfig {
  return { ...scalingDefaults(), workers };
}
function invariants(state: ScalingState) {
  const owned = state.jobs.filter((job) => job.worker !== null);
  expect(new Set(owned.map((job) => job.worker)).size).toBe(owned.length);
  expect(owned.length).toBeLessThanOrEqual(state.config.workers);
  expect(state.jobs).toHaveLength(PAYMENT_COUNT);
  for (const job of state.jobs) {
    expect(job.effects.every((effect) => effect <= 1)).toBe(true);
    if (job.status === 'done') {
      expect(job.worker).toBeNull();
      expect(job.effects).toEqual([1, 1, 1, 1]);
    }
    if (job.status === 'pending') expect(job.worker).toBeNull();
    if (['running', 'waiting', 'retry'].includes(job.status))
      expect(job.worker).not.toBeNull();
  }
  scalingMetrics(state).steps.forEach((step, index) => {
    expect(step.active.length).toBeLessThanOrEqual(step.capacity);
    const limit = state.config.limits[index]!;
    if (limit !== null) expect(step.active.length).toBeLessThanOrEqual(limit);
  });
}

describe('Scaling a reliable worker', () => {
  it.each([1, 4, 12, 24])(
    'preserves ownership, resources and effects at every tick with %i workers',
    (workers) => {
      let state = playScaling(createScaling(config(workers)));
      while (state.phase === 'running') {
        invariants(state);
        state = tickScaling(state);
        expect(state.tick).toBeLessThan(500);
      }
      invariants(state);
      expect(state.phase).toBe('complete');
      expect(scalingMetrics(state).completed).toBe(24);
      expect(state.rejected).toBe(0);
    },
  );
  it('gets the serial baseline from the clock, including each step duration', () => {
    const result = runScaling(config(1));
    expect(scalingMetrics(result).seconds).toBe(144);
    expect(result.jobs[0]!.effects).toEqual([1, 1, 1, 1]);
    expect(
      result.events.filter((event) => event.kind === 'started'),
    ).toHaveLength(96);
  });
  it('improves initially, then stops improving while reserved resources keep growing', () => {
    const results = [1, 4, 8, 12, 24].map((workers) =>
      scalingMetrics(runScaling(config(workers))),
    );
    expect(results[1]!.seconds).toBeLessThan(results[0]!.seconds);
    expect(results[2]!.seconds).toBeLessThan(results[1]!.seconds);
    expect(results[4]!.seconds).toBe(results[2]!.seconds);
    expect(results[4]!.cost).toBe(results[2]!.cost * 3);
  });
  it('keeps a worker occupied while its payment waits for a shared resource', () => {
    let state = playScaling(createScaling(config(12)));
    while (!scalingMetrics(state).steps[1]!.waiting.length)
      state = tickScaling(state);
    const metrics = scalingMetrics(state);
    expect(metrics.occupied).toBe(12);
    expect(metrics.steps[1]!.active).toHaveLength(3);
    expect(metrics.steps[1]!.waiting.every((job) => job.worker !== null)).toBe(
      true,
    );
  });
  it('honors per-step limits across all workers', () => {
    const settings = config(24);
    settings.limits = [1, 1, 1, 1];
    const state = runScaling(settings);
    expect(state.peak).toEqual([1, 1, 1, 1]);
    expect(state.rejected).toBe(0);
    expect(scalingMetrics(state).seconds).toBeGreaterThan(28);
  });
  it('a logical limit above receiver capacity still waits safely', () => {
    const settings = config(24);
    settings.limits = [24, 24, 24, 24];
    const state = runScaling(settings);
    state.peak.forEach((peak, step) =>
      expect(peak).toBeLessThanOrEqual(resourceCapacities(settings)[step]!),
    );
    expect(state.peak[1]).toBe(3);
    expect(state.rejected).toBe(0);
  });
  it('rejects excess unprotected requests before effects and terminates all retries', () => {
    const settings = config(24);
    settings.limits[1] = null;
    const result = runScaling(settings);
    invariants(result);
    expect(result.phase).toBe('complete');
    expect(result.rejected).toBeGreaterThan(0);
    expect(result.retries).toBe(result.rejected);
    expect(scalingMetrics(result).seconds).toBeGreaterThan(
      scalingMetrics(runScaling(config(24))).seconds,
    );
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('does not manufacture errors merely for having 24 workers', () => {
    expect(runScaling(config(24)).rejected).toBe(0);
    const single = config(1);
    single.limits = [null, null, null, null];
    expect(runScaling(single).rejected).toBe(0);
  });
  it('keeps CPU work queued even when local admission control is disabled', () => {
    const settings = config(24);
    settings.limits[0] = null;
    const result = runScaling(settings);
    expect(result.peak[0]).toBe(4);
    expect(result.rejected).toBe(0);
  });
  it('bounds retries and retains every job when an artificially slow receiver exhausts attempts', () => {
    const settings = config(24);
    settings.limits = [null, null, null, null];
    settings.durations[1] = 120;
    const result = runScaling(settings);
    expect(result.phase).toBe('blocked');
    expect(result.jobs).toHaveLength(24);
    expect(result.jobs.some((job) => job.status === 'failed')).toBe(true);
    expect(
      result.jobs.every((job) => job.effects.every((effect) => effect <= 1)),
    ).toBe(true);
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('can move the dominant wait from Stripe to the database by actually increasing service capacity', () => {
    const original = runScaling(config(12));
    expect(original.waitTicks[1]).toBeGreaterThan(original.waitTicks[2]!);
    const upgraded = config(12);
    upgraded.stripeCapacity = 9;
    upgraded.limits[1] = 9;
    const result = runScaling(upgraded);
    expect(result.waitTicks[2]).toBeGreaterThan(result.waitTicks[1]!);
    expect(scalingMetrics(result).seconds).toBeLessThan(
      scalingMetrics(original).seconds,
    );
    expect(scalingMetrics(result).extraServiceCost).toBe(
      6 * scalingMetrics(result).seconds,
    );
  });
  it('requires tuning the service and its admission limit, rather than only adding workers', () => {
    for (const workers of [4, 6, 8])
      expect(scalingVerdict(runScaling(config(workers))).won).toBe(false);
    const upgraded = config(8);
    upgraded.stripeCapacity = 9;
    expect(scalingVerdict(runScaling(upgraded)).won).toBe(false);
    for (const [workers, limit] of [
      [6, 6],
      [7, 4],
      [8, 4],
      [8, 6],
    ]) {
      upgraded.workers = workers!;
      upgraded.limits[1] = limit!;
      expect(scalingVerdict(runScaling(upgraded)).won).toBe(true);
    }
    expect(scalingVerdict(runScaling(config(1))).fast).toBe(false);
    expect(scalingVerdict(runScaling(config(24))).economical).toBe(false);
  });
  it('never awards victory to four workers, even with the expanded service', () => {
    const settings = config(4);
    settings.stripeCapacity = 9;
    settings.limits[1] = 9;
    expect(scalingVerdict(runScaling(settings)).won).toBe(false);
  });
  it('keeps oversized regression experiments outside the eight-worker mission', () => {
    const settings = config(12);
    settings.stripeCapacity = 9;
    settings.limits[1] = 9;
    const verdict = scalingVerdict(runScaling(settings));
    expect(verdict.fast).toBe(true);
    expect(verdict.economical).toBe(true);
    expect(verdict.safe).toBe(true);
    expect(verdict.won).toBe(false);
  });
  it('pauses simulated time and resumes the identical execution', () => {
    let state = playScaling(createScaling(config(8)));
    for (let i = 0; i < 17; i++) state = tickScaling(state);
    const paused = pauseScaling(state);
    expect(tickScaling(paused)).toBe(paused);
    state = playScaling(paused);
    while (state.phase === 'running') state = tickScaling(state);
    expect(state).toEqual(runScaling(config(8)));
  });
  it('replays the same seed and configuration, without mutating inputs or older states', () => {
    const settings = config(24);
    settings.limits[1] = null;
    const snapshot = structuredClone(settings);
    const initial = createScaling(settings);
    const previous = structuredClone(initial);
    tickScaling(playScaling(initial));
    expect(initial).toEqual(previous);
    expect(settings).toEqual(snapshot);
    expect(runScaling(settings)).toEqual(runScaling(settings));
    expect(createScaling(settings).tick).toBe(0);
  });
  it('validates parameters before a run can start', () => {
    expect(() => createScaling(config(0))).toThrow();
    expect(() => createScaling(config(25))).toThrow();
    expect(() =>
      createScaling({ ...config(4), limits: [0, 3, 2, 5] }),
    ).toThrow();
  });
});
