import { describe, expect, it } from 'vitest';
import { advance, continueAfterIncident, initialState } from './engine';
import { workerStepsConfig, workerStepsRules } from '../worker-steps/rules';
import type { Incident } from './engine';
import { workerFrame } from './worker-actor';

function incident(kind: Incident) {
  const config = workerStepsConfig();
  config.steps[1]!.remember = true;
  let state = initialState(config);
  for (let index = 0; index < 200; index++) {
    state = state.phase === 'incident' ? continueAfterIncident(state) : advance(state, workerStepsRules);
    if (state.incident === kind) return state;
  }
  throw new Error(`Did not reach ${kind}`);
}

describe('The worker character tells the engine story', () => {
  it('falls at the interrupted activation, then returns with the same stable payment ID', () => {
    const state = incident('activation-failed');
    const snapshot = structuredClone(state);
    expect(workerFrame(state, undefined)).toEqual({ state: 'dead', step: 2, job: 2 });
    expect(workerFrame(state, 'failure')).toEqual({ state: 'dead', step: 2, job: 2 });
    expect(workerFrame(state, 'restart')).toEqual({ state: 'returning', step: 0, job: 2 });
    expect(state).toEqual(snapshot);
  });

  it('keeps the worker alive when the email response times out after an effect', () => {
    const state = incident('email-uncertain');
    expect(state.jobs[2]!.steps[3]!.effects).toBe(1);
    expect(state.jobs[2]!.steps[3]!.checkpoint).toBe(false);
    expect(workerFrame(state, undefined)).toEqual({ state: 'uncertain', step: 3, job: 3 });
    expect(workerFrame(state, 'restart')).toEqual({ state: 'returning', step: 0, job: 3 });
  });

  it('points to the saved step actually skipped, instead of pretending to execute it', () => {
    let state = continueAfterIncident(incident('activation-failed'));
    for (let index = 0; index < 20; index++) {
      state = advance(state, workerStepsRules);
      if (state.events.at(-1)?.kind === 'skipped') break;
    }
    expect(state.events.at(-1)?.kind).toBe('skipped');
    expect(workerFrame(state, undefined)).toEqual({ state: 'skipping', step: 1, job: 2 });
    expect(state.jobs[1]!.steps[1]!.effects).toBe(1);
  });
});
