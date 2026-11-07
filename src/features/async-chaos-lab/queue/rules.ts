import {
  injectFaultOnce,
  isSafeToRepeat,
  moveToNextStep,
  pauseForIncident,
  recordEvent,
} from '../payment-simulation/engine';
import type { ActionKind, SimulationConfig, SimulationRules } from '../payment-simulation/engine';

const stepKinds: ActionKind[] = ['check', 'append', 'check'];

export const queueConfig = (): SimulationConfig => ({
  storage: 'ram',
  protectLocalRecord: false,
  steps: stepKinds.map((kind) => ({ kind, remember: false, providerDeduplication: false })),
  gap: 'none',
});

export const queueRules: SimulationRules = {
  // Payment #2: the worker and its co-hosted RAM share the crash.
  // The independent database and already-produced business results survive.
  interruptBeforeStep(state, job) {
    if (job.id !== 2 || !injectFaultOnce(state, 'worker-2')) return false;
    recordEvent(state, 'worker-crash');
    if (state.config.storage === 'ram') {
      for (const pending of state.jobs) if (pending.status !== 'done') pending.status = 'lost';
      state.phase = 'lost';
      state.incident = 'ram-lost';
    } else pauseForIncident(state, 'worker-retry');
    return true;
  },
  skipsStep: (config, step, progress) =>
    config.protectLocalRecord && !isSafeToRepeat(step.kind) && progress.effects > 0,
  countsRepeatedWork: false,
  afterStep(state, _job, step, progress) {
    progress.checkpoint = state.config.protectLocalRecord && !isSafeToRepeat(step.kind);
    moveToNextStep(state);
  },
  interruptBeforeAcknowledge(state, job) {
    if (job.id !== 3 || !injectFaultOnce(state, 'ack-3')) return false;
    recordEvent(state, 'ack-lost');
    pauseForIncident(state, 'ack-retry');
    return true;
  },
};
