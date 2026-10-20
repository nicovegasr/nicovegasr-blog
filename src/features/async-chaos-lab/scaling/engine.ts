/** A fixed-clock simulation. One tick is 0.5 simulated seconds, never a frame. */
export const TICK_SECONDS = 0.5;
export const PAYMENT_COUNT = 24;
export const AVAILABLE_WORKERS = 8;
export const TARGET_SECONDS = 37;
export const TARGET_COST = 400;
export type Four<T> = [T, T, T, T];
export type ScalingConfig = {
  workers: number;
  capacities: Four<number>;
  durations: Four<number>; // ticks, including time spent using the resource
};
export type Payment = {
  id: number;
  worker: number | null;
  step: number;
  status: 'pending' | 'waiting' | 'running' | 'done' | 'failed';
  until: number;
  waitingSince: number;
  effects: Four<number>;
};
export type ScalingEvent = {
  tick: number;
  job: number;
  step: number;
  kind: 'started' | 'step-done' | 'service-down' | 'completed';
};
export type ScalingState = {
  config: ScalingConfig;
  phase: 'ready' | 'running' | 'paused' | 'complete' | 'blocked';
  tick: number;
  jobs: Payment[];
  outageStep: number | null;
  waitTicks: Four<number>;
  busyTicks: Four<number>;
  peak: Four<number>;
  events: ScalingEvent[];
};
export const scalingDefaults = (): ScalingConfig => ({
  workers: 1,
  capacities: [4, 3, 2, 5],
  durations: [2, 6, 2, 2],
});
export const BASE_CAPACITIES: Four<number> = [4, 3, 2, 5];
export const resourceCapacities = (config: ScalingConfig): Four<number> => config.capacities;

export function createScaling(config = scalingDefaults()): ScalingState {
  if (
    !Number.isInteger(config.workers) ||
    config.workers < 1 ||
    config.workers > 24 ||
    config.capacities.length !== 4 ||
    config.durations.length !== 4 ||
    config.capacities.some((capacity) => !Number.isInteger(capacity) || capacity < 1 || capacity > 8) ||
    config.durations.some(
      (ticks) => !Number.isInteger(ticks) || ticks < 1 || ticks > 120,
    )
  )
    throw new Error('Invalid scaling configuration');
  return {
    config: structuredClone(config),
    phase: 'ready',
    tick: 0,
    jobs: Array.from({ length: PAYMENT_COUNT }, (_, index) => ({
      id: index + 1,
      worker: null,
      step: 0,
      status: 'pending',
      until: 0,
      waitingSince: 0,
      effects: [0, 0, 0, 0],
    })),
    outageStep: null,
    waitTicks: [0, 0, 0, 0],
    busyTicks: [0, 0, 0, 0],
    peak: [0, 0, 0, 0],
    events: [],
  };
}
function event(state: ScalingState, job: Payment, kind: ScalingEvent['kind']) {
  state.events.push({ tick: state.tick, job: job.id, step: job.step, kind });
}
function schedule(state: ScalingState) {
  const occupied = new Set(state.jobs.map((job) => job.worker));
  for (let worker = 1; worker <= state.config.workers; worker++) {
    if (occupied.has(worker)) continue;
    const job = state.jobs.find((candidate) => candidate.status === 'pending');
    if (!job) break;
    job.worker = worker;
    job.status = 'waiting';
    job.waitingSince = state.tick;
  }
  const capacities = resourceCapacities(state.config);
  for (let step = 0; step < 4; step++) {
    let active = state.jobs.filter(
      (job) => job.step === step && job.status === 'running',
    ).length;
    const waiting = state.jobs
      .filter((job) => job.step === step && job.status === 'waiting')
      .sort((a, b) => a.waitingSince - b.waitingSince || a.id - b.id);
    for (const job of waiting) {
      if (active >= capacities[step]!) {
        // CPU work waits for a core. External calls are sent immediately:
        // excess demand collapses the receiving service in this scenario.
        if (step === 0) continue;
        state.phase = 'blocked';
        state.outageStep = step;
        for (const affected of state.jobs)
          if (affected.step === step && affected.worker !== null)
            affected.status = 'failed';
        state.events.push({ tick: state.tick, job: job.id, step, kind: 'service-down' });
        return;
      }
      job.status = 'running';
      job.until = state.tick + state.config.durations[step]!;
      active++;
      state.peak[step] = Math.max(state.peak[step]!, active);
      event(state, job, 'started');
    }
  }
}
export function playScaling(previous: ScalingState): ScalingState {
  if (previous.phase !== 'ready' && previous.phase !== 'paused')
    return previous;
  const state = structuredClone(previous);
  state.phase = 'running';
  if (previous.phase === 'ready') schedule(state);
  return state;
}
export function pauseScaling(previous: ScalingState): ScalingState {
  return previous.phase === 'running'
    ? { ...previous, phase: 'paused' }
    : previous;
}
export function tickScaling(previous: ScalingState): ScalingState {
  if (previous.phase !== 'running') return previous;
  const state = structuredClone(previous);
  for (const job of state.jobs) {
    if (job.status === 'waiting')
      state.waitTicks[job.step]!++;
    if (job.status === 'running') state.busyTicks[job.step]!++;
  }
  state.tick++;
  for (const job of state.jobs) {
    if (job.status !== 'running' || job.until > state.tick) continue;
    // Each accepted operation applies its effect only when it finishes.
    job.effects[job.step]!++;
    event(state, job, 'step-done');
    job.step++;
    if (job.step === 4) {
      job.status = 'done';
      job.worker = null;
      event(state, job, 'completed');
    } else {
      job.status = 'waiting';
      job.waitingSince = state.tick;
    }
  }
  schedule(state);
  if (state.jobs.every((job) => job.status === 'done'))
    state.phase = 'complete';
  return state;
}
export function scalingMetrics(state: ScalingState) {
  const seconds = state.tick * TICK_SECONDS;
  const completed = state.jobs.filter((job) => job.status === 'done').length;
  const workerCost = seconds * state.config.workers;
  const extraCapacity = state.config.capacities.reduce((total, capacity, step) =>
    total + Math.max(0, capacity - BASE_CAPACITIES[step]!), 0);
  const extraServiceCost = seconds * extraCapacity;
  return {
    seconds,
    completed,
    pending: state.jobs.filter((job) => job.status === 'pending').length,
    occupied: state.jobs.filter((job) => job.worker !== null).length,
    waiting: state.jobs.filter(
      (job) => job.status === 'waiting',
    ).length,
    throughput: seconds ? completed / seconds : 0,
    workerCost,
    extraServiceCost,
    cost: workerCost + extraServiceCost,
    // Completed payments per unit reserved. No hidden score or arbitrary penalty.
    efficiency:
      workerCost + extraServiceCost
        ? completed / (workerCost + extraServiceCost)
        : 0,
    steps: [0, 1, 2, 3].map((step) => ({
      active: state.jobs.filter(
        (job) => job.step === step && job.status === 'running',
      ),
      waiting: state.jobs.filter(
        (job) =>
          job.step === step &&
          (job.status === 'waiting'),
      ),
      interrupted: state.jobs.filter((job) => job.step === step && job.status === 'failed'),
      capacity: resourceCapacities(state.config)[step]!,
      utilization: state.tick
        ? state.busyTicks[step]! /
          (state.tick * resourceCapacities(state.config)[step]!)
        : 0,
    })),
  };
}
export function scalingVerdict(state: ScalingState) {
  const metrics = scalingMetrics(state);
  const safe =
    state.outageStep === null &&
    state.jobs.every((job) => job.effects.every((count) => count === 1));
  return {
    fast: metrics.seconds <= TARGET_SECONDS,
    economical: metrics.cost <= TARGET_COST,
    safe,
    won:
      state.phase === 'complete' &&
      state.config.workers <= AVAILABLE_WORKERS &&
      metrics.seconds <= TARGET_SECONDS &&
      metrics.cost <= TARGET_COST &&
      safe,
  };
}
export function runScaling(config: ScalingConfig): ScalingState {
  let state = playScaling(createScaling(config));
  for (let ticks = 0; ticks < 10_000 && state.phase === 'running'; ticks++)
    state = tickScaling(state);
  if (state.phase === 'running')
    throw new Error('Simulation did not terminate');
  return state;
}
