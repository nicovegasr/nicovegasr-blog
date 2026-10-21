import { describe, expect, it } from 'vitest';
import { advance, continueAfterIncident, defaultConfig, initialState } from './engine';
import type { Incident } from './engine';
import { workerFrame } from './worker-actor';

function incident(kind: Incident) {
  const config = defaultConfig(2);
  config.steps[1]!.remember = true;
  let s = initialState(config);
  for (let i = 0; i < 200; i++) {
    s = s.phase === 'incident' ? continueAfterIncident(s) : advance(s);
    if (s.incident === kind) return s;
  }
  throw new Error(`Did not reach ${kind}`);
}

describe('The worker character tells the engine story', () => {
  it('falls at the interrupted activation, then returns with the same stable payment ID', () => {
    const s = incident('activation-failed');
    const snapshot = structuredClone(s);
    expect(workerFrame(s, undefined)).toEqual({ state: 'dead', step: 2, job: 2 });
    expect(workerFrame(s, 'failure')).toEqual({ state: 'dead', step: 2, job: 2 });
    expect(workerFrame(s, 'restart')).toEqual({ state: 'returning', step: 0, job: 2 });
    expect(s).toEqual(snapshot);
  });

  it('keeps the worker alive when the email response times out after an effect', () => {
    const s = incident('email-uncertain');
    expect(s.jobs[2]!.steps[3]!.effects).toBe(1);
    expect(s.jobs[2]!.steps[3]!.checkpoint).toBe(false);
    expect(workerFrame(s, undefined)).toEqual({ state: 'uncertain', step: 3, job: 3 });
    expect(workerFrame(s, 'restart')).toEqual({ state: 'returning', step: 0, job: 3 });
  });

  it('points to the saved step actually skipped, instead of pretending to execute it', () => {
    let s = continueAfterIncident(incident('activation-failed'));
    for (let i = 0; i < 20; i++) {
      s = advance(s);
      if (s.events.at(-1)?.kind === 'skipped') break;
    }
    expect(s.events.at(-1)?.kind).toBe('skipped');
    expect(workerFrame(s, undefined)).toEqual({ state: 'skipping', step: 1, job: 2 });
    expect(s.jobs[1]!.steps[1]!.effects).toBe(1);
  });
});
