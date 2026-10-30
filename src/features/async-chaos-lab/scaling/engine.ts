/** A fixed-clock simulation. One tick is 0.5 simulated seconds, never a frame. */
export const TICK_SECONDS = 0.5;
export const PAYMENT_COUNT = 24;
export const AVAILABLE_WORKERS = 8;
export const MAX_CONCURRENCY_PER_WORKER = 8;
export const TARGET_SECONDS = 25;
export const TARGET_COST = 120;
export type Four<T> = [T, T, T, T];
export type HttpStep = 1 | 3;
export const isHttpStep = (step: number): step is HttpStep => step === 1 || step === 3;
export const BASE_RATE_LIMITS: Record<HttpStep, number> = { 1: 2, 3: 2 };
export const RATE_WINDOW_TICKS = 1 / TICK_SECONDS;
export type ScalingConfig = {
  workers: number;
  concurrencyPerWorker: number; // payments a worker can hold at once
  capacities: Four<number>;
  durations: Four<number>; // ticks, including time spent using the resource
  rateLimits: Record<HttpStep, number>; // accepted HTTP requests per fixed 1 s window
};
export type Payment = {
  id: number;
  worker: number | null;
  step: number;
  status: 'pending' | 'waiting' | 'running' | 'done' | 'rejected';
  until: number;
  waitingSince: number;
  effects: Four<number>;
};
export type ScalingEvent = {
  tick: number;
  job: number;
  step: number;
  kind: 'started' | 'step-done' | 'completed' | 'rate-limit';
};
export type ScalingState = {
  config: ScalingConfig;
  phase: 'ready' | 'running' | 'paused' | 'complete' | 'rate-limited';
  tick: number;
  jobs: Payment[];
  waitTicks: Four<number>;
  busyTicks: Four<number>;
  peak: Four<number>;
  events: ScalingEvent[];
  rateWindow: number;
  requestsInWindow: Four<number>;
  rateLimit: { step: HttpStep; job: number; limit: number; retryAfterSeconds: number } | null;
};
export const scalingDefaults = (): ScalingConfig => ({
  workers: 1,
  concurrencyPerWorker: 1,
  capacities: [4, 3, 2, 5],
  durations: [2, 6, 2, 2],
  rateLimits: { ...BASE_RATE_LIMITS },
});
export const BASE_CAPACITIES: Four<number> = [4, 3, 2, 5];
export const resourceCapacities = (config: ScalingConfig): Four<number> => config.capacities;

export function createScaling(config = scalingDefaults()): ScalingState {
  if (
    !Number.isInteger(config.workers) ||
    config.workers < 1 ||
    config.workers > 24 ||
    !Number.isInteger(config.concurrencyPerWorker) ||
    config.concurrencyPerWorker < 1 ||
    config.concurrencyPerWorker > MAX_CONCURRENCY_PER_WORKER ||
    config.capacities.length !== 4 ||
    config.durations.length !== 4 ||
    config.capacities.some((capacity) => !Number.isInteger(capacity) || capacity < 1 || capacity > 8) ||
    config.durations.some(
      (ticks) => !Number.isInteger(ticks) || ticks < 1 || ticks > 120,
    ) ||
    !config.rateLimits ||
    ([1, 3] as const).some((step) => !Number.isInteger(config.rateLimits[step]) || config.rateLimits[step] < 1 || config.rateLimits[step] > 8)
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
    waitTicks: [0, 0, 0, 0],
    busyTicks: [0, 0, 0, 0],
    peak: [0, 0, 0, 0],
    events: [],
    rateWindow: 0,
    requestsInWindow: [0, 0, 0, 0],
    rateLimit: null,
  };
}
function event(state: ScalingState, job: Payment, kind: ScalingEvent['kind']) {
  state.events.push({ tick: state.tick, job: job.id, step: job.step, kind });
}
function schedule(state: ScalingState) {
  const window = Math.floor(state.tick / RATE_WINDOW_TICKS);
  if (window !== state.rateWindow) {
    state.rateWindow = window;
    state.requestsInWindow = [0, 0, 0, 0];
  }
  const load = Array.from({ length: state.config.workers + 1 }, () => 0);
  for (const job of state.jobs) if (job.worker !== null) load[job.worker]!++;
  for (const job of state.jobs.filter((candidate) => candidate.status === 'pending')) {
    // Payments go to the least loaded worker, so a team shares them evenly.
    let worker = 1;
    for (let candidate = 2; candidate <= state.config.workers; candidate++)
      if (load[candidate]! < load[worker]!) worker = candidate;
    if (load[worker]! >= state.config.concurrencyPerWorker) break;
    load[worker]!++;
    job.worker = worker;
    job.status = 'waiting';
    job.waitingSince = state.tick;
  }
  const workersOnCpu = new Set(
    state.jobs.filter((job) => job.step === 0 && job.status === 'running').map((job) => job.worker),
  );
  const capacities = resourceCapacities(state.config);
  for (let step = 0; step < 4; step++) {
    let active = state.jobs.filter(
      (job) => job.step === step && job.status === 'running',
    ).length;
    const waiting = state.jobs
      .filter((job) => job.step === step && job.status === 'waiting')
      .sort((a, b) => a.waitingSince - b.waitingSince || a.id - b.id);
    for (const job of waiting) {
      // Explicit per-resource admission: the worker retains its payment and
      // waits locally before sending a call. Async I/O alone does not do this.
      // FIFO keeps later arrivals from overtaking a worker already waiting.
      if (active >= capacities[step]!) break;
      // Awaiting a reply frees the worker for another payment, but CPU work does
      // not: a worker validates one payment at a time however many it holds.
      if (step === 0 && workersOnCpu.has(job.worker)) continue;
      if (isHttpStep(step)) {
        const limit = state.config.rateLimits[step];
        // The provider quota is independent of the worker's concurrency gate.
        // A free slot does not guarantee that another request will be accepted.
        if (state.requestsInWindow[step] >= limit) {
          job.status = 'rejected';
          state.phase = 'rate-limited';
          state.rateLimit = {
            step, job: job.id, limit,
            retryAfterSeconds: ((window + 1) * RATE_WINDOW_TICKS - state.tick) * TICK_SECONDS,
          };
          event(state, job, 'rate-limit');
          return;
        }
        state.requestsInWindow[step]++;
      }
      if (step === 0) workersOnCpu.add(job.worker);
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
  const extraQuota = ([1, 3] as const).reduce((sum, step) =>
    sum + Math.max(0, state.config.rateLimits[step] - BASE_RATE_LIMITS[step]), 0);
  const extraRateCost = seconds * extraQuota;
  return {
    seconds,
    completed,
    pending: state.jobs.filter((job) => job.status === 'pending').length,
    occupied: new Set(state.jobs.flatMap((job) => job.worker ?? [])).size,
    inFlight: state.jobs.filter((job) => job.worker !== null).length,
    waiting: state.jobs.filter(
      (job) => job.status === 'waiting',
    ).length,
    waitingSeconds: state.waitTicks.reduce((sum, ticks) => sum + ticks, 0) * TICK_SECONDS,
    throughput: seconds ? completed / seconds : 0,
    workerCost,
    extraServiceCost,
    extraRateCost,
    cost: workerCost + extraServiceCost + extraRateCost,
    // Completed payments per unit reserved. No hidden score or arbitrary penalty.
    efficiency:
      workerCost + extraServiceCost + extraRateCost
        ? completed / (workerCost + extraServiceCost + extraRateCost)
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
      capacity: resourceCapacities(state.config)[step]!,
      rejected: state.jobs.filter((job) => job.step === step && job.status === 'rejected'),
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
    state.rateLimit === null && state.jobs.every((job) => job.effects.every((count) => count === 1));
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
