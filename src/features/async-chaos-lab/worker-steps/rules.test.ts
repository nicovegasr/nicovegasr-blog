import { describe, expect, it } from 'vitest';
import {
  advance as advanceWith,
  continueAfterIncident,
  initialState,
  run as runWith,
  totals,
} from '../payment-simulation/engine';
import type { SimulationConfig, SimulationState } from '../payment-simulation/engine';
import { workerStepsConfig, workerStepsRules } from './rules';

const advance = (state: SimulationState) => advanceWith(state, workerStepsRules);
const run = (config: SimulationConfig) => runWith(config, workerStepsRules);

describe('Inside a worker: checkpoints and external effects', () => {
  it('exposes the completed charge and incomplete activation at the first incident', () => {
    let s = initialState(workerStepsConfig());
    while (s.phase !== 'incident') s = advance(s);
    expect(s.active).toBe(1);
    expect(s.incident).toBe('activation-failed');
    expect(s.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(s.jobs[1]!.steps[2]!.effects).toBe(0);
    expect(run(workerStepsConfig()).phase).toBe('duplicate');
  });
  it('remembering the charge prevents a second charge but not an uncertain email', () => {
    const c = workerStepsConfig();
    c.steps[1]!.remember = true;
    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(totals(s).wasted).toBe(4);
    expect(s.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(s.jobs[2]!.steps[2]!.executions).toBe(2);
    expect(s.jobs[2]!.steps[3]!.effects).toBe(2);
  });
  it('local checkpoints cannot confirm an email sent just before a crash', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.remember = true));

    let interrupted = initialState(c);
    while (
      interrupted.phase !== 'incident' ||
      interrupted.incident !== 'email-uncertain'
    ) {
      interrupted =
        interrupted.phase === 'incident'
          ? continueAfterIncident(interrupted)
          : advance(interrupted);
    }

    expect(interrupted.jobs[2]!.steps[3]!.effects).toBe(1);
    expect(interrupted.jobs[2]!.steps[3]!.checkpoint).toBe(false);

    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(totals(s).skipped).toBe(5);
    expect(totals(s).wasted).toBe(1);
    expect(totals(s).executions).toBe(14);
    expect(s.jobs[1]!.steps[2]!.effects).toBe(1);
    expect(s.jobs[2]!.steps[3]!.effects).toBe(2);
    expect(totals(s).done).toBe(2);
  });
  it.each(['charge', 'email'] as const)(
    'a crash after %s effect defeats a local checkpoint alone',
    (gap) => {
      const c = workerStepsConfig();
      c.gap = gap;
      c.steps.forEach((step) => (step.remember = true));
      const s = run(c);
      const index = gap === 'charge' ? 1 : 3;
      expect(s.phase).toBe('duplicate');
      expect(s.active).toBe(0);
      expect(s.jobs[0]!.steps[index]!.effects).toBe(2);
    },
  );
  it.each(['charge', 'email'] as const)(
    'a receiver supporting stable identity reconciles the uncertain %s effect',
    (gap) => {
      const c = workerStepsConfig();
      c.gap = gap;
      c.steps.forEach((step) => (step.remember = true));
      c.steps[3]!.providerDeduplication = true;
      c.steps[gap === 'charge' ? 1 : 3]!.providerDeduplication = true;
      const s = run(c);
      expect(s.phase).toBe('won');
      expect(s.events.some((e) => e.kind === 'provider-dedup')).toBe(true);
      for (const j of s.jobs)
        for (const step of j.steps) expect(step.effects).toBe(1);
    },
  );
  it('customizing a repeatable step to an external action changes replay safety', () => {
    const c = workerStepsConfig();
    c.steps[1]!.remember = true;
    c.steps[0]!.kind = 'external';
    expect(run(c).phase).toBe('duplicate');
  });
  it('all scripted faults occur only once so recovery terminates', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.remember = true));
    const s = run(c);
    expect(s.injected).toEqual(['activation-2', 'email-3']);
    expect(s.jobs[1]!.attempt).toBe(2);
    expect(s.jobs[2]!.attempt).toBe(2);
  });
  it('the last payment cannot pass after its email is sent twice', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.remember = true));

    const s = run(c);

    expect(s.phase).toBe('duplicate');
    expect(s.active).toBe(2);
    expect(s.step).toBe(3);
    expect(s.jobs[2]!.steps[3]!.effects).toBe(2);
    expect(s.jobs[2]!.status).toBe('failed');
    expect(totals(s).done).toBe(2);
  });
  it('the last payment completes only if the email receiver deduplicates its stable ID', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.remember = true));
    c.steps[3]!.providerDeduplication = true;

    const s = run(c);

    expect(s.phase).toBe('won');
    expect(s.jobs[2]!.steps[3]!.effects).toBe(1);
    expect(
      s.events.some(
        (event) => event.job === 3 && event.kind === 'provider-dedup',
      ),
    ).toBe(true);
    expect(totals(s).done).toBe(3);
  });
  it('incidents pause until an explicit retry, without mutating the previous state', () => {
    let s = initialState(workerStepsConfig());
    while (s.phase !== 'incident') s = advance(s);
    const before = structuredClone(s);
    expect(advance(s)).toEqual(before);
    const resumed = continueAfterIncident(s);
    expect(resumed.phase).toBe('running');
    expect(s).toEqual(before);
  });
});

describe('External effects and replay safety are independent', () => {
  it('pure checks and repeatable local assignments need no deduplication to finish safely', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step, i) => (step.kind = i % 2 ? 'set-state' : 'check'));
    const s = run(c);
    expect(s.phase).toBe('won');
    expect(s.wasted).toBe(6);
    expect(s.skipped).toBe(0);
    expect(s.jobs[1]!.steps[0]!.executions).toBe(2);
    expect(s.jobs[1]!.steps[0]!.effects).toBe(1);
  });
  it('a non-idempotent local append can duplicate without any external effect', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(s.jobs[1]!.steps[1]!.effects).toBe(2);
  });
  it('a saved checkpoint can skip a prior local append in the normal scenario', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    c.steps[1]!.remember = true;
    const s = run(c);
    expect(s.phase).toBe('won');
    expect(s.jobs.every((j) => j.steps[1]!.effects === 1)).toBe(true);
  });
  it('a provider capability cannot deduplicate a local append', () => {
    const c = workerStepsConfig();
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    c.steps[1]!.providerDeduplication = true;
    expect(run(c).phase).toBe('duplicate');
  });
});
