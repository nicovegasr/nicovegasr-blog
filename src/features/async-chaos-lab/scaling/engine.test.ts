import { describe, expect, it } from 'vitest';
import {
  createScaling, pauseScaling, playScaling, runScaling, scalingDefaults,
  scalingMetrics, scalingVerdict, tickScaling, PAYMENT_COUNT,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';

function config(workers: number, capacities: ScalingConfig['capacities'] = [4, 3, 2, 5]): ScalingConfig {
  return { ...scalingDefaults(), workers, capacities, rateLimits: { 1: Math.max(3, capacities[1]), 3: Math.max(5, capacities[3]) } };
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
  it('holds the same worker and payment locally until a Stripe slot is free', () => {
    let state = playScaling(createScaling(config(4)));
    state = tickScaling(tickScaling(state));
    const waiting = state.jobs[3]!;
    expect(state.phase).toBe('running');
    expect(waiting).toMatchObject({ worker: 4, step: 1, status: 'waiting', waitingSince: 2 });
    expect(waiting.effects).toEqual([1, 0, 0, 0]);
    expect(scalingMetrics(state).steps[1]!.active).toHaveLength(3);
    for (let ticks = 0; ticks < 5; ticks++) {
      state = tickScaling(state);
      expect(state.jobs[3]).toEqual(waiting);
      invariants(state);
    }
    state = tickScaling(state);
    expect(state.jobs[3]).toMatchObject({ worker: 4, step: 1, status: 'running' });
    expect(state.jobs[3]!.effects[1]).toBe(0);
    expect(state.events.filter((event) => event.job === 4 && event.step === 1 && event.kind === 'started')).toHaveLength(1);
    expect(state.waitTicks[1]).toBeGreaterThan(0);
  });
  it.each([
    [2, [4, 4, 2, 5]],
    [3, [4, 4, 4, 2]],
  ] as const)('queues excess demand for resource %i without losing or duplicating effects', (step, capacities) => {
    const settings = config(4, [...capacities]);
    let state = playScaling(createScaling(settings));
    let sawWaiting = false;
    while (state.phase === 'running') {
      sawWaiting ||= scalingMetrics(state).steps[step]!.waiting.length > 0;
      invariants(state);
      state = tickScaling(state);
    }
    expect(sawWaiting).toBe(true);
    expect(state.waitTicks[step]).toBeGreaterThan(0);
    expect(state.phase).toBe('complete');
    invariants(state);
  });
  it('admits waiting callers in FIFO order before later arrivals', () => {
    const state = runScaling(config(8, [4, 1, 8, 8]));
    const calls = state.events.filter((event) => event.kind === 'started' && event.step === 1);
    expect(calls.slice(0, 8).map((event) => event.job)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(calls).toHaveLength(PAYMENT_COUNT);
    expect(state.peak[1]).toBe(1);
    invariants(state);
  });
  it('counts cumulative worker waiting separately from elapsed time', () => {
    let state = playScaling(createScaling(config(8, [1, 1, 1, 1])));
    let waitedTicks = 0;
    while (state.phase === 'running') {
      waitedTicks += state.jobs.filter((job) => job.status === 'waiting').length;
      state = tickScaling(state);
    }
    expect(scalingMetrics(state).waitingSeconds).toBe(waitedTicks * 0.5);
    expect(scalingMetrics(state).waitingSeconds).toBeGreaterThan(scalingMetrics(state).seconds);
  });
  it('makes extra workers wait and cost more when they cannot accelerate the bottleneck', () => {
    const smaller = scalingMetrics(runScaling(config(4, [1, 1, 1, 1])));
    const larger = scalingMetrics(runScaling(config(8, [1, 1, 1, 1])));
    expect(larger.seconds).toBe(smaller.seconds);
    expect(larger.waitingSeconds).toBeGreaterThan(smaller.waitingSeconds);
    expect(larger.workerCost).toBe(smaller.workerCost * 2);
  });
  it('lets four workers win by preparing both receiving services', () => {
    const result = runScaling(config(4, [4, 4, 4, 5]));
    expect(result.phase).toBe('complete');
    expect(scalingMetrics(result).seconds).toBe(36);
    expect(scalingMetrics(result).cost).toBe(288);
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
  it('uses the full service capacity without introducing an unnecessary queue', () => {
    const result = runScaling(config(3, [4, 3, 3, 5]));
    expect(result.phase).toBe('complete');
    expect(result.peak[1]).toBe(3);
    expect(result.waitTicks[1]).toBe(0);
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
    expect(metrics.extraRateCost).toBe(36);
    expect(metrics.cost).toBe(metrics.workerCost + metrics.extraServiceCost + metrics.extraRateCost);
  });
  it('allows oversized engine experiments but never grants an oversized mission victory', () => {
    const result = runScaling(config(12, [4, 8, 8, 8]));
    expect(scalingVerdict(result).won).toBe(false);
  });
  it('returns 429 with free concurrency slots, preserving the rejected payment and earlier effects', () => {
    const settings = { ...scalingDefaults(), workers: 4, capacities: [4, 4, 2, 5] as ScalingConfig['capacities'] };
    const s = runScaling(settings);
    expect(s.phase).toBe('rate-limited');
    expect(s.rateLimit).toEqual({ step: 1, job: 4, limit: 3, retryAfterSeconds: 1 });
    expect(scalingMetrics(s).steps[1]!.active).toHaveLength(3);
    expect(scalingMetrics(s).steps[1]!.capacity).toBe(4);
    expect(s.jobs[3]).toMatchObject({ id: 4, worker: 4, step: 1, status: 'rejected', effects: [1, 0, 0, 0] });
    expect(s.jobs).toHaveLength(PAYMENT_COUNT);
    expect(s.events.filter((event) => event.kind === 'rate-limit')).toHaveLength(1);
    expect(scalingVerdict(s).won).toBe(false);
    expect(tickScaling(s)).toBe(s);
    expect(playScaling(s)).toBe(s);
    invariants(s);
  });
  it('waits for occupied slots before attempting another request, so no unnecessary 429 is sent', () => {
    const settings = { ...config(4, [4, 1, 2, 5]), rateLimits: { 1: 1, 3: 5 } };
    const s = runScaling(settings);
    expect(s.phase).toBe('complete');
    expect(s.rateLimit).toBeNull();
    expect(s.waitTicks[1]).toBeGreaterThan(0);
    expect(s.events.some((event) => event.kind === 'rate-limit')).toBe(false);
    invariants(s);
  });
  it('resets the HTTP quota at the next fixed one-second boundary without accumulating spare credits', () => {
    const settings = { ...config(4, [4, 2, 4, 5]), rateLimits: { 1: 2, 3: 5 } };
    let s = playScaling(createScaling(settings));
    s = tickScaling(tickScaling(s));
    expect(s.rateWindow).toBe(1);
    expect(s.requestsInWindow[1]).toBe(2);
    s = tickScaling(tickScaling(s));
    expect(s.rateWindow).toBe(2);
    expect(s.requestsInWindow[1]).toBe(0);
    const result = runScaling(settings);
    expect(result.phase).toBe('complete');
    const perWindow = new Map<number, number>();
    for (const event of result.events.filter((event) => event.kind === 'started' && event.step === 1)) {
      const window = Math.floor(event.tick / 2);
      perWindow.set(window, (perWindow.get(window) ?? 0) + 1);
    }
    expect([...perWindow.values()].every((count) => count <= 2)).toBe(true);
  });
  it('enforces email quota separately from the charge quota', () => {
    const settings = { ...config(4, [4, 4, 4, 4]), rateLimits: { 1: 4, 3: 2 } };
    const s = runScaling(settings);
    expect(s.phase).toBe('rate-limited');
    expect(s.rateLimit?.step).toBe(3);
    const rejected = s.jobs.find((job) => job.status === 'rejected')!;
    expect(rejected.effects).toEqual([1, 1, 1, 0]);
    expect(scalingMetrics(s).steps[3]!.active).toHaveLength(2);
    invariants(s);
  });
  it('validates resource capacity and worker counts', () => {
    expect(() => createScaling(config(0))).toThrow();
    expect(() => createScaling(config(25))).toThrow();
    expect(() => createScaling({ ...config(4), rateLimits: { 1: 0, 3: 5 } })).toThrow();
    expect(() => createScaling({ ...config(4), rateLimits: { 1: 3, 3: 9 } })).toThrow();
    expect(() => createScaling(config(4, [4, 0, 2, 5]))).toThrow();
    expect(() => createScaling(config(4, [4, 9, 2, 5]))).toThrow();
  });
});
