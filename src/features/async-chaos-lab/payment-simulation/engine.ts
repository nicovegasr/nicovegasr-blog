export const JOB_COUNT = 3;
export type ActionKind =
  'check' | 'external' | 'set-state' | 'notify' | 'append';
export type StepConfig = {
  kind: ActionKind;
  // Persist successful progress so a later attempt can skip this action.
  remember: boolean;
  // A capability of the simulated receiver, not a key generated per attempt.
  providerDeduplication: boolean;
};
export type SimulationConfig = {
  storage: 'ram' | 'db';
  // The local record and its stable ID share an atomic write.
  protectLocalRecord: boolean;
  steps: StepConfig[];
  // Engine-only regression scenarios: external effect happened, local mark did not.
  gap: 'none' | 'charge' | 'email';
};
export const isExternal = (kind: ActionKind) =>
  kind === 'external' || kind === 'notify';
export const isSafeToRepeat = (kind: ActionKind) =>
  kind === 'check' || kind === 'set-state';
export type StepProgress = {
  // Includes an attempt interrupted before producing a result.
  executions: number;
  // Logical results: pure checks/set-state stay at 1; unsafe repeats can reach 2.
  // This is not an external-effect count. Inspect `kind` for that distinction.
  effects: number;
  checkpoint: boolean;
  skipped: number;
};
export type Job = {
  id: number;
  status: 'pending' | 'working' | 'retrying' | 'done' | 'lost' | 'failed';
  attempt: number;
  steps: StepProgress[];
};
export type EventKind =
  | 'claimed'
  | 'effect'
  | 'saved'
  | 'skipped'
  | 'provider-dedup'
  | 'worker-crash'
  | 'response-timeout'
  | 'ack-lost'
  | 'recovered'
  | 'duplicate'
  | 'completed'
  | 'gap'
  | 'wasted';
export type Event = {
  tick: number;
  job: number;
  step: number;
  kind: EventKind;
};
export type Incident =
  | 'none'
  | 'ram-lost'
  | 'worker-retry'
  | 'ack-retry'
  | 'activation-failed'
  | 'email-uncertain'
  | 'effect-uncertain'
  | 'duplicate';
export type SimulationState = {
  config: SimulationConfig;
  tick: number;
  phase: 'ready' | 'running' | 'incident' | 'lost' | 'duplicate' | 'won';
  cursor: 'claim' | 'execute' | 'save' | 'ack';
  active: number; // Zero-based job index; -1 before the first claim.
  step: number; // Zero-based step index; steps.length means awaiting final ACK.
  jobs: Job[];
  injected: string[];
  events: Event[];
  incident: Incident;
  skipped: number;
  wasted: number;
};
/** What each lab decides about how the shared simulation behaves. */
export type SimulationRules = {
  /** Returns true when a fault used up this tick, before the step runs. */
  interruptBeforeStep(state: SimulationState, job: Job, progress: StepProgress): boolean;
  skipsStep(config: SimulationConfig, step: StepConfig, progress: StepProgress): boolean;
  countsRepeatedWork: boolean;
  afterStep(state: SimulationState, job: Job, step: StepConfig, progress: StepProgress): void;
  /** Returns true when a fault used up this tick, before the job is acknowledged. */
  interruptBeforeAcknowledge(state: SimulationState, job: Job): boolean;
};
export function initialState(config: SimulationConfig): SimulationState {
  if (config.steps.length < 1 || config.steps.length > 6)
    throw new Error('Invalid step count');
  return {
    config: structuredClone(config),
    tick: 0,
    phase: 'ready',
    cursor: 'claim',
    active: -1,
    step: 0,
    jobs: Array.from({ length: JOB_COUNT }, (_, index) => ({
      id: index + 1,
      status: 'pending',
      attempt: 0,
      steps: config.steps.map(() => ({
        executions: 0,
        effects: 0,
        checkpoint: false,
        skipped: 0,
      })),
    })),
    injected: [],
    events: [],
    incident: 'none',
    skipped: 0,
    wasted: 0,
  };
}
export function recordEvent(state: SimulationState, kind: EventKind) {
  state.events.push({
    tick: state.tick,
    job: state.active + 1,
    step: state.step,
    kind,
  });
}
export function injectFaultOnce(state: SimulationState, id: string) {
  if (state.injected.includes(id)) return false;
  state.injected.push(id);
  return true;
}
export function pauseForIncident(state: SimulationState, kind: Incident) {
  state.phase = 'incident';
  state.incident = kind;
  state.jobs[state.active]!.status = 'retrying';
  state.cursor = 'claim';
}
export function moveToNextStep(state: SimulationState) {
  state.step++;
  state.cursor = state.step >= state.config.steps.length ? 'ack' : 'execute';
}
export function continueAfterIncident(
  previous: SimulationState,
): SimulationState {
  if (previous.phase !== 'incident') return previous;
  const state = structuredClone(previous);
  state.phase = 'running';
  state.incident = 'none';
  recordEvent(state, 'recovered');
  return state;
}
export function advance(previous: SimulationState, rules: SimulationRules): SimulationState {
  if (['incident', 'lost', 'duplicate', 'won'].includes(previous.phase))
    return previous;
  const state = structuredClone(previous);
  state.phase = 'running';
  state.tick++;
  const config = state.config;
  if (state.cursor === 'claim') {
    state.active = state.jobs.findIndex(
      (job) => job.status === 'pending' || job.status === 'retrying',
    );
    if (state.active < 0) {
      state.phase = 'won';
      return state;
    }
    const job = state.jobs[state.active]!;
    job.status = 'working';
    job.attempt++;
    state.step = 0;
    state.cursor = 'execute';
    recordEvent(state, 'claimed');
    return state;
  }
  const job = state.jobs[state.active]!,
    stepConfig = config.steps[state.step],
    stepProgress = job.steps[state.step];
  if (state.cursor === 'execute' && stepConfig && stepProgress) {
    if (rules.interruptBeforeStep(state, job, stepProgress)) return state;
    if (rules.skipsStep(config, stepConfig, stepProgress)) {
      stepProgress.skipped++;
      state.skipped++;
      recordEvent(state, 'skipped');
      moveToNextStep(state);
      return state;
    }
    stepProgress.executions++;
    const repeated = stepProgress.effects > 0;
    if (repeated && rules.countsRepeatedWork) {
      state.wasted++;
      recordEvent(state, 'wasted');
    }
    const nonrepeatable = !isSafeToRepeat(stepConfig.kind);
    if (
      repeated &&
      isExternal(stepConfig.kind) &&
      stepConfig.providerDeduplication
    ) {
      recordEvent(state, 'provider-dedup');
    } else {
      stepProgress.effects = nonrepeatable ? stepProgress.effects + 1 : 1;
      recordEvent(state, 'effect');
      if (repeated && nonrepeatable) {
        state.phase = 'duplicate';
        state.incident = 'duplicate';
        job.status = 'failed';
        recordEvent(state, 'duplicate');
        return state;
      }
    }
    rules.afterStep(state, job, stepConfig, stepProgress);
    return state;
  }
  if (state.cursor === 'save' && stepProgress && stepConfig) {
    stepProgress.checkpoint = stepConfig.remember;
    recordEvent(state, 'saved');
    moveToNextStep(state);
    return state;
  }
  if (state.cursor === 'ack') {
    if (rules.interruptBeforeAcknowledge(state, job)) return state;
    job.status = 'done';
    recordEvent(state, 'completed');
    state.cursor = 'claim';
    if (state.jobs.every((job) => job.status === 'done')) state.phase = 'won';
    return state;
  }
  return state;
}
export function run(config: SimulationConfig, rules: SimulationRules) {
  // Test/reproduction helper. The UI uses explicit user retries instead.
  let state = initialState(config);
  for (let index = 0; index < 500; index++) {
    state =
      state.phase === 'incident'
        ? continueAfterIncident(state)
        : advance(state, rules);
    if (['lost', 'duplicate', 'won'].includes(state.phase)) return state;
  }
  throw new Error('Scenario did not terminate');
}
export const totals = (state: SimulationState) => ({
  done: state.jobs.filter((job) => job.status === 'done').length,
  lost: state.jobs.filter((job) => job.status === 'lost').length,
  attempts: state.jobs.reduce((total, job) => total + job.attempt, 0),
  executions: state.jobs.reduce(
    (total, job) => total + job.steps.reduce((sum, step) => sum + step.executions, 0),
    0,
  ),
  skipped: state.skipped,
  wasted: state.wasted,
});

export const recordCount = (state: SimulationState, job: Job) =>
  job.steps.reduce(
    (total, step, index) =>
      total + (state.config.steps[index]?.kind === 'append' ? step.effects : 0),
    0,
  );
