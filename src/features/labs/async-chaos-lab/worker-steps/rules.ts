import { injectFaultOnce, moveToNextStep, pauseForIncident, recordEvent } from '../payment-simulation/engine';
import type { ActionKind, SimulationConfig, SimulationRules } from '../payment-simulation/engine';

const stepKinds: ActionKind[] = ['check', 'external', 'set-state', 'notify'];

export const workerStepsConfig = (): SimulationConfig => ({
  storage: 'db',
  protectLocalRecord: true,
  steps: stepKinds.map((kind) => ({ kind, remember: false, providerDeduplication: false })),
  gap: 'none',
});

export const workerStepsRules: SimulationRules = {
  // Payment #2 crashes before activation takes effect, once per run.
  interruptBeforeStep(state, job, progress) {
    if (job.id !== 2 || state.step !== 2 || !injectFaultOnce(state, 'activation-2')) return false;
    progress.executions++;
    recordEvent(state, 'worker-crash');
    pauseForIncident(state, 'activation-failed');
    return true;
  },
  skipsStep: (_config, step, progress) => step.remember && progress.checkpoint,
  countsRepeatedWork: true,
  afterStep(state, job, step) {
    // The effect exists before the consumer can persist its local checkpoint.
    const gapStep = state.config.gap === 'charge' ? 1 : 3;
    if (state.config.gap !== 'none' && job.id === 1 && state.step === gapStep && injectFaultOnce(state, 'gap-1')) {
      recordEvent(state, 'gap');
      pauseForIncident(state, 'effect-uncertain');
      return;
    }
    // Payment #3: the service accepts the email, but its response times out
    // before the worker can save a checkpoint. A retry is ambiguous locally.
    if (job.id === 3 && state.step === 3 && injectFaultOnce(state, 'email-3')) {
      recordEvent(state, 'response-timeout');
      pauseForIncident(state, 'email-uncertain');
      return;
    }
    // Only a configured checkpoint writes progress; an unchecked action leaves no marker.
    if (step.remember) state.cursor = 'save';
    else moveToNextStep(state);
  },
  interruptBeforeAcknowledge: () => false,
};
