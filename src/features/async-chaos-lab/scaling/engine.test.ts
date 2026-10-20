import { describe, expect, it } from 'vitest';
import {
  createScaling, pauseScaling, playScaling, runScaling, scalingDefaults,
  scalingMetrics, scalingVerdict, tickScaling, PAYMENT_COUNT,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';

function config(workers: number, capacities: ScalingConfig['capacities'] = [4, 3, 2, 5]): ScalingConfig {
  return { ...scalingDefaults(), workers, capacities };
}
function invariants(state: ScalingState) {
  const owned = state.jobs.filter((job) => job.worker !== null);
  expect(new Set(owned.map((job) => job.worker)).size).toBe(owned.length);
  expect(owned.length).toBeLessThanOrEqual(state.config.workers);
  expect(state.jobs).toHaveLength(PAYMENT_COUNT);
  for (const job of state.jobs) {
    expect(job.effects.every((count) => count <= 1)).toBe(true);
    if (job.status === 'done') {
      expect(job.worker).toBeNull();
      expect(job.effects).toEqual([1, 1, 1, 1]);
    }
    if (job.status === 'pending') expect(job.worker).toBeNull();
  }
  scalingMetrics(state).steps.forEach((step) => {
    expect(step.active.length).toBeLessThanOrEqual(step.capacity);
  });
}
describe('Scaling actual resource capacity', () => {
  it('processes the serial baseline without inventing a failure', () => {
    const result = runScaling(config(1));
    expect(result.phase).toBe('complete');
    expect(scalingMetrics(result).seconds).toBe(144);
    invariants(result);
  });
  it('automatically collapses Stripe when four workers reach its three slots', () => {
    const result = runScaling(config(4));
    expect(result.phase).toBe('blocked');
    expect(result.outageStep).toBe(1);
    expect(scalingMetrics(result).seconds).toBe(1);
    expect(result.jobs.every((job) => job.effects[1] === 0)).toBe(true);
    expect(result.events.at(-1)?.kind).toBe('service-down');
    invariants(result);
  });
  it('exposes the database after the first service is expanded', () => {
    const result = runScaling(config(4, [4, 4, 2, 5]));
    expect(result.phase).toBe('blocked');
    expect(result.outageStep).toBe(2);
    expect(scalingMetrics(result).seconds).toBe(4);
    expect(result.jobs.slice(0, 4).every((job) => job.effects[1] === 1)).toBe(true);
    invariants(result);
  });
  it('automatically collapses an undersized email service', () => {
    const result = runScaling(config(4, [4, 4, 4, 2]));
    expect(result.outageStep).toBe(3);
    expect(result.phase).toBe('blocked');
    invariants(result);
  });
  it('lets four workers win by preparing both receiving services', () => {
    const result = runScaling(config(4, [4, 4, 4, 5]));
    expect(result.phase).toBe('complete');
    expect(scalingMetrics(result).seconds).toBe(36);
    expect(scalingMetrics(result).cost).toBe(252);
    expect(scalingVerdict(result).won).toBe(true);
    invariants(result);
  });
  it.each([4, 6, 8])('completes with different correctly sized %i-worker teams', (workers) => {
    const capacities: ScalingConfig['capacities'] = [4, workers, workers, workers];
    let state = playScaling(createScaling(config(workers, capacities)));
    while (state.phase === 'running') {
      invariants(state);
      state = tickScaling(state);
      expect(state.tick).toBeLessThan(500);
    }
    expect(state.phase).toBe('complete');
    invariants(state);
  });
  it('queues CPU work rather than pretending that CPU saturation is an HTTP outage', () => {
    const result = runScaling(config(8, [1, 8, 8, 8]));
    expect(result.phase).toBe('complete');
    expect(result.peak[0]).toBe(1);
    expect(result.waitTicks[0]).toBeGreaterThan(0);
    invariants(result);
  });
  it('never collapses a service just because it is exactly full', () => {
    const result = runScaling(config(3, [4, 3, 3, 5]));
    expect(result.phase).toBe('complete');
    expect(result.peak[1]).toBe(3);
    expect(result.outageStep).toBeNull();
  });
  it('restarts identical four-worker attempts with the same four payments', () => {
    const settings = config(4);
    const first = runScaling(settings), second = runScaling(settings);
    expect(second).toEqual(first);
    expect(first.events.filter((event) => event.tick === 0 && event.kind === 'started').map((event) => event.job)).toEqual([1, 2, 3, 4]);
    expect(first.jobs).toHaveLength(24);
    expect(tickScaling(first)).toBe(first);
    expect(playScaling(first)).toBe(first);
  });
  it('uses six real service slots when six workers arrive', () => {
    const result = runScaling(config(6, [6, 6, 6, 6]));
    expect(result.peak).toEqual([6, 6, 6, 6]);
    expect(result.phase).toBe('complete');
  });
  it('resumes the same fixed-clock execution after a pause', () => {
    const settings = config(4, [4, 4, 4, 5]);
    let state = playScaling(createScaling(settings));
    for (let i = 0; i < 5; i++) state = tickScaling(state);
    const paused = pauseScaling(state);
    expect(tickScaling(paused)).toBe(paused);
    state = playScaling(paused);
    while (state.phase === 'running') state = tickScaling(state);
    expect(state).toEqual(runScaling(settings));
  });
  it('does not mutate previous states or configuration', () => {
    const settings = config(4), initial = createScaling(settings);
    const before = structuredClone(initial), configBefore = structuredClone(settings);
    tickScaling(playScaling(initial));
    expect(initial).toEqual(before);
    expect(settings).toEqual(configBefore);
  });
  it('charges for all capacity above the included resources and for reserved workers', () => {
    const state = runScaling(config(4, [4, 4, 4, 5]));
    const metrics = scalingMetrics(state);
    expect(metrics.workerCost).toBe(4 * 36);
    expect(metrics.extraServiceCost).toBe(3 * 36);
    expect(metrics.cost).toBe(metrics.workerCost + metrics.extraServiceCost);
  });
  it('allows oversized engine experiments but never grants an oversized mission victory', () => {
    const result = runScaling(config(12, [4, 8, 8, 8]));
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('validates resource capacity and worker counts', () => {
    expect(() => createScaling(config(0))).toThrow();
    expect(() => createScaling(config(25))).toThrow();
    expect(() => createScaling(config(4, [4, 0, 2, 5]))).toThrow();
    expect(() => createScaling(config(4, [4, 9, 2, 5]))).toThrow();
  });
});
