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
    let state = initialState(workerStepsConfig());
    while (state.phase !== 'incident') state = advance(state);
    expect(state.active).toBe(1);
    expect(state.incident).toBe('activation-failed');
    expect(state.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(state.jobs[1]!.steps[2]!.effects).toBe(0);
    expect(run(workerStepsConfig()).phase).toBe('duplicate');
  });
  it('remembering the charge prevents a second charge but not an uncertain email', () => {
    const config = workerStepsConfig();
    config.steps[1]!.remember = true;
    const state = run(config);
    expect(state.phase).toBe('duplicate');
    expect(totals(state).wasted).toBe(4);
    expect(state.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(state.jobs[2]!.steps[2]!.executions).toBe(2);
    expect(state.jobs[2]!.steps[3]!.effects).toBe(2);
  });
  it('local checkpoints cannot confirm an email sent just before a crash', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.remember = true));

    let interrupted = initialState(config);
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

    const state = run(config);
    expect(state.phase).toBe('duplicate');
    expect(totals(state).skipped).toBe(5);
    expect(totals(state).wasted).toBe(1);
    expect(totals(state).executions).toBe(14);
    expect(state.jobs[1]!.steps[2]!.effects).toBe(1);
    expect(state.jobs[2]!.steps[3]!.effects).toBe(2);
    expect(totals(state).done).toBe(2);
  });
  it.each(['charge', 'email'] as const)(
    'a crash after %s effect defeats a local checkpoint alone',
    (gap) => {
      const config = workerStepsConfig();
      config.gap = gap;
      config.steps.forEach((step) => (step.remember = true));
      const state = run(config);
      const index = gap === 'charge' ? 1 : 3;
      expect(state.phase).toBe('duplicate');
      expect(state.active).toBe(0);
      expect(state.jobs[0]!.steps[index]!.effects).toBe(2);
    },
  );
  it.each(['charge', 'email'] as const)(
    'a receiver supporting stable identity reconciles the uncertain %s effect',
    (gap) => {
      const config = workerStepsConfig();
      config.gap = gap;
      config.steps.forEach((step) => (step.remember = true));
      config.steps[3]!.providerDeduplication = true;
      config.steps[gap === 'charge' ? 1 : 3]!.providerDeduplication = true;
      const state = run(config);
      expect(state.phase).toBe('won');
      expect(state.events.some((event) => event.kind === 'provider-dedup')).toBe(true);
      for (const job of state.jobs)
        for (const step of job.steps) expect(step.effects).toBe(1);
    },
  );
  it('customizing a repeatable step to an external action changes replay safety', () => {
    const config = workerStepsConfig();
    config.steps[1]!.remember = true;
    config.steps[0]!.kind = 'external';
    expect(run(config).phase).toBe('duplicate');
  });
  it('all scripted faults occur only once so recovery terminates', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.remember = true));
    const state = run(config);
    expect(state.injected).toEqual(['activation-2', 'email-3']);
    expect(state.jobs[1]!.attempt).toBe(2);
    expect(state.jobs[2]!.attempt).toBe(2);
  });
  it('the last payment cannot pass after its email is sent twice', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.remember = true));

    const state = run(config);

    expect(state.phase).toBe('duplicate');
    expect(state.active).toBe(2);
    expect(state.step).toBe(3);
    expect(state.jobs[2]!.steps[3]!.effects).toBe(2);
    expect(state.jobs[2]!.status).toBe('failed');
    expect(totals(state).done).toBe(2);
  });
  it('the last payment completes only if the email receiver deduplicates its stable ID', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.remember = true));
    config.steps[3]!.providerDeduplication = true;

    const state = run(config);

    expect(state.phase).toBe('won');
    expect(state.jobs[2]!.steps[3]!.effects).toBe(1);
    expect(
      state.events.some(
        (event) => event.job === 3 && event.kind === 'provider-dedup',
      ),
    ).toBe(true);
    expect(totals(state).done).toBe(3);
  });
  it('incidents pause until an explicit retry, without mutating the previous state', () => {
    let state = initialState(workerStepsConfig());
    while (state.phase !== 'incident') state = advance(state);
    const before = structuredClone(state);
    expect(advance(state)).toEqual(before);
    const resumed = continueAfterIncident(state);
    expect(resumed.phase).toBe('running');
    expect(state).toEqual(before);
  });
});

describe('External effects and replay safety are independent', () => {
  it('pure checks and repeatable local assignments need no deduplication to finish safely', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step, index) => (step.kind = index % 2 ? 'set-state' : 'check'));
    const state = run(config);
    expect(state.phase).toBe('won');
    expect(state.wasted).toBe(6);
    expect(state.skipped).toBe(0);
    expect(state.jobs[1]!.steps[0]!.executions).toBe(2);
    expect(state.jobs[1]!.steps[0]!.effects).toBe(1);
  });
  it('a non-idempotent local append can duplicate without any external effect', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.kind = 'check'));
    config.steps[1]!.kind = 'append';
    const state = run(config);
    expect(state.phase).toBe('duplicate');
    expect(state.jobs[1]!.steps[1]!.effects).toBe(2);
  });
  it('a saved checkpoint can skip a prior local append in the normal scenario', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.kind = 'check'));
    config.steps[1]!.kind = 'append';
    config.steps[1]!.remember = true;
    const state = run(config);
    expect(state.phase).toBe('won');
    expect(state.jobs.every((job) => job.steps[1]!.effects === 1)).toBe(true);
  });
  it('a provider capability cannot deduplicate a local append', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.kind = 'check'));
    config.steps[1]!.kind = 'append';
    config.steps[1]!.providerDeduplication = true;
    expect(run(config).phase).toBe('duplicate');
  });
});
