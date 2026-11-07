export const READ_CARDS = ['load-all', 'cursor', 'pages'] as const;
export const WRITE_CARDS = ['one-by-one', 'batches'] as const;
export type ReadCard = (typeof READ_CARDS)[number];
export type WriteCard = (typeof WRITE_CARDS)[number];
export type Card = ReadCard | WriteCard;

export const BATCH_SIZES = [100, 1_000, 5_000, 10_000, 100_000] as const;
export type BatchSize = (typeof BATCH_SIZES)[number];

export const isReadCard = (card: Card): card is ReadCard => (READ_CARDS as readonly Card[]).includes(card);

export interface Build {
  readonly read: ReadCard | null;
  readonly write: WriteCard | null;
}

export interface CompleteBuild {
  readonly read: ReadCard;
  readonly write: WriteCard;
}

export const isComplete = (build: Build): build is CompleteBuild => build.read !== null && build.write !== null;

export type IncidentKind = 'restart-loop' | 'memory-squeeze';

/** Something that happens to the run between two points of the history, measured as a share of the logs. */
export interface Incident {
  readonly kind: IncidentKind;
  readonly from: number;
  readonly to: number;
  /** restart-loop: how many times more executions appear. memory-squeeze: megabytes another process takes. */
  readonly amount: number;
}

/** What the script has to chew through in a challenge. */
export interface Scenario {
  readonly logs: number;
  /** Executions of the application found in the logs, outside incidents: one summary each. */
  readonly runs: number;
  readonly memoryLimitMegabytes: number;
  /** Time until the query returns its first row. Every execution of the query pays it again. */
  readonly querySeconds: number;
  readonly incidents: readonly Incident[];
  /** Animation steps of a full run. More steps leave more time to react. */
  readonly steps: number;
}

/**
 * Deliberately round numbers: the lab teaches orders of magnitude, not a benchmark.
 * A LogEntry with its strings weighs about 500 bytes on the heap; a pending summary with its
 * statement parameters, about 4 KB.
 */
export const MACHINE = {
  baseMegabytes: 150,
  megabytesPerMillionLogs: 500,
  megabytesPerThousandSummaries: 4,
  rowsPerFetch: 1_000,
  secondsPerMillionLogs: 2,
  /** Opening a stream costs a transaction, a dedicated connection and fetch-size setup: noise on months of logs, the whole bill on a week. */
  secondsToOpenCursor: 1,
  secondsPerWriteTrip: 0.002,
  secondsPerThousandWrittenRows: 0.02,
} as const;

/** Share of the steps that loading the whole list takes before the analysis starts. */
export const LOADING_SHARE = 0.4;
/** A list that will never fit fills the backpack in this many steps, so the player sees it happen. */
const STEPS_TO_FILL_A_HOPELESS_LIST = 55;

export type Death = 'list' | 'batch';
export type Phase = 'loading' | 'analyzing' | 'dead' | 'done';
export type RunEvent = 'page' | 'trip' | 'flush' | 'incident';

export interface RunState {
  readonly build: CompleteBuild;
  readonly scenario: Scenario;
  readonly step: number;
  readonly phase: Phase;
  readonly killedBy: Death | null;
  readonly loadedMegabytes: number;
  readonly logsAnalyzed: number;
  readonly pendingSummaries: number;
  readonly summaries: number;
  readonly writeTrips: number;
  readonly queries: number;
  readonly seconds: number;
  readonly megabytes: number;
  readonly peakMegabytes: number;
  /** Longest stretch the read side kept a database connection busy without letting it go. */
  readonly longestConnectionSeconds: number;
  readonly limitMegabytes: number;
  readonly incident: Incident | null;
  /** What happened during the last step, for the animation. */
  readonly events: readonly RunEvent[];
}

export interface Outcome {
  readonly killedBy: Death | null;
  readonly diedDuring: IncidentKind | null;
  readonly peakMegabytes: number;
  readonly longestConnectionSeconds: number;
  readonly seconds: number;
  readonly queries: number;
  readonly writeTrips: number;
  readonly logsAnalyzed: number;
}

export const listMegabytes = ({ logs }: Scenario) => (logs / 1_000_000) * MACHINE.megabytesPerMillionLogs;
const fetchWindowMegabytes = (MACHINE.rowsPerFetch / 1_000_000) * MACHINE.megabytesPerMillionLogs;
const summariesMegabytes = (summaries: number) => (summaries / 1_000) * MACHINE.megabytesPerThousandSummaries;
const transferSeconds = (logs: number) => (logs / 1_000_000) * MACHINE.secondsPerMillionLogs;

const loadingSteps = ({ build, scenario }: Pick<RunState, 'build' | 'scenario'>) =>
  build.read === 'load-all' ? Math.round(scenario.steps * LOADING_SHARE) : 0;

export const incidentAt = (scenario: Scenario, progress: number): Incident | null =>
  scenario.incidents.find(({ from, to }) => progress >= from && progress < to) ?? null;

const limitAt = (scenario: Scenario, incident: Incident | null) =>
  scenario.memoryLimitMegabytes - (incident?.kind === 'memory-squeeze' ? incident.amount : 0);

export const startRun = (build: CompleteBuild, scenario: Scenario): RunState => ({
  build,
  scenario,
  step: 0,
  phase: build.read === 'load-all' ? 'loading' : 'analyzing',
  killedBy: null,
  loadedMegabytes: 0,
  logsAnalyzed: 0,
  pendingSummaries: 0,
  summaries: 0,
  writeTrips: 0,
  queries: 0,
  seconds: 0,
  megabytes: MACHINE.baseMegabytes,
  peakMegabytes: MACHINE.baseMegabytes,
  longestConnectionSeconds: 0,
  limitMegabytes: scenario.memoryLimitMegabytes,
  incident: null,
  events: [],
});

const die = (state: RunState, killedBy: Death, changes: Partial<RunState>): RunState => ({
  ...state,
  ...changes,
  phase: 'dead',
  killedBy,
  megabytes: changes.limitMegabytes ?? state.limitMegabytes,
  peakMegabytes: changes.limitMegabytes ?? state.limitMegabytes,
});

const loadStep = (state: RunState): RunState => {
  const { scenario } = state;
  const total = listMegabytes(scenario);
  const steps = loadingSteps(state);
  const room = scenario.memoryLimitMegabytes - MACHINE.baseMegabytes;
  const perStep = total > room ? room / STEPS_TO_FILL_A_HOPELESS_LIST : total / steps;
  const loadedMegabytes = Math.min(total, state.loadedMegabytes + perStep);
  const step = state.step + 1;
  const seconds =
    state.seconds + (step === 1 ? scenario.querySeconds : 0) + transferSeconds(scenario.logs) * (perStep / total);
  const megabytes = MACHINE.baseMegabytes + loadedMegabytes;
  // Loading the list keeps the connection busy until the last row arrives.
  const changes = {
    step,
    loadedMegabytes,
    seconds,
    queries: 1,
    longestConnectionSeconds: seconds,
    events: [] as RunEvent[],
  };
  if (megabytes > scenario.memoryLimitMegabytes) return die(state, 'list', changes);
  return {
    ...state,
    ...changes,
    megabytes,
    peakMegabytes: Math.max(state.peakMegabytes, megabytes),
    phase: loadedMegabytes >= total ? 'analyzing' : 'loading',
  };
};

const analyzeStep = (state: RunState, batchSize: BatchSize): RunState => {
  const { build, scenario } = state;
  const step = state.step + 1;
  const analyzingSteps = scenario.steps - loadingSteps(state);
  const chunk = scenario.logs / analyzingSteps;
  const before = state.logsAnalyzed;
  const logsAnalyzed = Math.min(scenario.logs, before + chunk);
  const incident = incidentAt(scenario, before / scenario.logs);
  const limitMegabytes = limitAt(scenario, incident);
  const events: RunEvent[] = incident !== null && incident !== state.incident ? ['incident'] : [];

  let seconds = state.seconds + transferSeconds(logsAnalyzed - before);
  let queries = state.queries;
  if (build.read === 'pages') {
    const pages = Math.ceil(logsAnalyzed / MACHINE.rowsPerFetch) - Math.ceil(before / MACHINE.rowsPerFetch);
    queries += pages;
    seconds += pages * scenario.querySeconds;
    if (pages > 0) events.push('page');
  } else if (queries === 0) {
    queries = 1;
    seconds += scenario.querySeconds + (build.read === 'cursor' ? MACHINE.secondsToOpenCursor : 0);
  }

  const multiplier = incident?.kind === 'restart-loop' ? incident.amount : 1;
  const found = (logsAnalyzed - before) * (scenario.runs / scenario.logs) * multiplier;
  const summaries = state.summaries + found;
  const steadyMegabytes =
    MACHINE.baseMegabytes + (build.read === 'load-all' ? state.loadedMegabytes : fetchWindowMegabytes);
  const rowsSeconds = (rows: number) => (rows / 1_000) * MACHINE.secondsPerThousandWrittenRows;

  let pendingSummaries = 0;
  let writeTrips = state.writeTrips;
  if (build.write === 'one-by-one') {
    writeTrips += found;
    seconds += found * MACHINE.secondsPerWriteTrip + rowsSeconds(found);
    if (found > 0) events.push('trip');
  } else {
    const pending = state.pendingSummaries + found;
    const changes = { step, logsAnalyzed, incident, limitMegabytes, seconds, queries, summaries, events };
    if (steadyMegabytes + summariesMegabytes(Math.min(pending, batchSize)) > limitMegabytes)
      return die(state, 'batch', changes);
    const flushes = Math.floor(pending / batchSize);
    pendingSummaries = pending - flushes * batchSize;
    writeTrips += flushes;
    seconds += flushes * MACHINE.secondsPerWriteTrip + rowsSeconds(flushes * batchSize);
    if (flushes > 0) events.push('flush');
  }

  const finished = logsAnalyzed >= scenario.logs;
  if (finished && pendingSummaries > 0) {
    writeTrips += 1;
    seconds += MACHINE.secondsPerWriteTrip + rowsSeconds(pendingSummaries);
    pendingSummaries = 0;
    events.push('flush');
  }
  // A cursor holds its connection for the whole walk; a page lets it go after each query.
  const longestConnectionSeconds =
    build.read === 'cursor'
      ? seconds
      : build.read === 'pages'
        ? Math.max(state.longestConnectionSeconds, scenario.querySeconds + transferSeconds(MACHINE.rowsPerFetch))
        : state.longestConnectionSeconds;
  const megabytes = steadyMegabytes + summariesMegabytes(pendingSummaries);
  return {
    ...state,
    step,
    phase: finished ? 'done' : 'analyzing',
    logsAnalyzed,
    pendingSummaries,
    summaries,
    writeTrips,
    queries,
    seconds,
    megabytes,
    peakMegabytes: Math.max(state.peakMegabytes, megabytes),
    longestConnectionSeconds,
    limitMegabytes,
    incident,
    events,
  };
};

/** Advances the run one step with the batch size the player has dialled in right now. */
export const advance = (state: RunState, batchSize: BatchSize): RunState => {
  if (state.phase === 'dead' || state.phase === 'done') return state;
  return state.phase === 'loading' ? loadStep(state) : analyzeStep(state, batchSize);
};

export const isOver = ({ phase }: RunState): boolean => phase === 'dead' || phase === 'done';

export const outcomeOf = (state: RunState): Outcome => ({
  killedBy: state.killedBy,
  diedDuring: state.killedBy === null ? null : (state.incident?.kind ?? null),
  peakMegabytes: state.peakMegabytes,
  longestConnectionSeconds: state.longestConnectionSeconds,
  seconds: state.seconds,
  queries: state.queries,
  writeTrips: Math.round(state.writeTrips),
  logsAnalyzed: Math.round(state.logsAnalyzed),
});

/** Plays a whole run. `batchSizeAt` lets tests turn the dial as a player would. */
export const playToEnd = (
  build: CompleteBuild,
  scenario: Scenario,
  batchSizeAt: (state: RunState) => BatchSize = () => 1_000,
): RunState => {
  let state = startRun(build, scenario);
  while (!isOver(state)) state = advance(state, batchSizeAt(state));
  return state;
};
