import { describe, expect, it } from 'vitest';
import {
  advance,
  continueAfterIncident,
  defaultConfig,
  initialState,
  recordCount,
  run,
  totals,
} from './engine';
import type { SimulationConfig, SimulationState } from './engine';
describe('Queue survival: three fixed jobs', () => {
  it('RAM belongs to the crashed worker process; completed effects survive separately', () => {
    const s = run(defaultConfig(1));
    expect(s.jobs.map((job) => job.id)).toEqual([1, 2, 3]);
    expect(s.phase).toBe('lost');
    expect(s.active).toBe(1);
    expect(s.jobs[0]!.status).toBe('done');
    expect(totals(s).lost).toBe(2);
    expect(s.jobs[0]!.steps[0]!.effects).toBe(1);
  });
  it('durability recovers job 2 but alone cannot prevent lost-ACK duplicates on job 3', () => {
    const c = defaultConfig(1);
    c.storage = 'db';
    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(s.active).toBe(2);
    expect(s.jobs[1]!.attempt).toBe(2);
    expect(s.jobs[2]!.steps[1]!.effects).toBe(2);
    expect(s.jobs[2]!.status).toBe('failed');
  });
  it.each([1, 2, 4, 6])(
    'protects every local effect with %s configurable steps',
    (count) => {
      const c = defaultConfig(1);
      c.storage = 'db';
      c.protectLocalRecord = true;
      c.steps = Array.from({ length: count }, () => ({
        kind: 'append' as const,
        remember: false,
        providerDeduplication: false,
      }));
      const s = run(c);
      expect(s.phase).toBe('won');
      expect(totals(s).done).toBe(3);
      expect(s.jobs[2]!.attempt).toBe(2);
      expect(totals(s).skipped).toBe(count);
      for (const j of s.jobs)
        for (const step of j.steps) expect(step.effects).toBe(1);
    },
  );
  it('only recording duplicates; validation can repeat before the duplicate is detected', () => {
    const c = defaultConfig(1);
    c.storage = 'db';
    const s = run(c),
      j = s.jobs[2]!;
    expect(c.steps.map((step) => step.kind)).toEqual([
      'check',
      'append',
      'check',
    ]);
    expect(s.phase).toBe('duplicate');
    expect(s.step).toBe(1);
    expect(j.steps[0]!.executions).toBe(2);
    expect(j.steps[0]!.effects).toBe(1);
    expect(j.steps[1]!.effects).toBe(2);
    expect(j.steps[2]!.executions).toBe(1);
    expect(recordCount(s, j)).toBe(2);
  });
  it('protects the record while safely repeating pure actions on redelivery', () => {
    const c = defaultConfig(1);
    c.storage = 'db';
    c.protectLocalRecord = true;
    const s = run(c),
      j = s.jobs[2]!;
    expect(s.phase).toBe('won');
    expect(s.skipped).toBe(1);
    expect(j.steps.map((step) => step.executions)).toEqual([2, 1, 2]);
    expect(j.steps.map((step) => step.checkpoint)).toEqual([
      false,
      true,
      false,
    ]);
    expect(j.steps.map((step) => step.effects)).toEqual([1, 1, 1]);
    expect(recordCount(s, j)).toBe(1);
    expect(s.jobs.reduce((n, job) => n + recordCount(s, job), 0)).toBe(3);
  });
  it('the first worker fault occurs before any effect on job 2', () => {
    const s = run(defaultConfig(1));
    expect(s.jobs[1]!.steps.every((step) => step.effects === 0)).toBe(true);
  });
});
describe('Inside a worker: checkpoints and external effects', () => {
  it('exposes the completed charge and incomplete activation at the first incident', () => {
    let s = initialState(defaultConfig(2));
    while (s.phase !== 'incident') s = advance(s);
    expect(s.active).toBe(1);
    expect(s.incident).toBe('activation-failed');
    expect(s.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(s.jobs[1]!.steps[2]!.effects).toBe(0);
    expect(run(defaultConfig(2)).phase).toBe('duplicate');
  });
  it('remembering the charge prevents a second charge but not an uncertain email', () => {
    const c = defaultConfig(2);
    c.steps[1]!.remember = true;
    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(totals(s).wasted).toBe(4);
    expect(s.jobs[1]!.steps[1]!.effects).toBe(1);
    expect(s.jobs[2]!.steps[2]!.executions).toBe(2);
    expect(s.jobs[2]!.steps[3]!.effects).toBe(2);
  });
  it('local checkpoints cannot confirm an email sent just before a crash', () => {
    const c = defaultConfig(2);
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
      const c = defaultConfig(2);
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
      const c = defaultConfig(2);
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
    const c = defaultConfig(2);
    c.steps[1]!.remember = true;
    c.steps[0]!.kind = 'external';
    expect(run(c).phase).toBe('duplicate');
  });
  it('all scripted faults occur only once so recovery terminates', () => {
    const c = defaultConfig(2);
    c.steps.forEach((step) => (step.remember = true));
    const s = run(c);
    expect(s.injected).toEqual(['activation-2', 'email-3']);
    expect(s.jobs[1]!.attempt).toBe(2);
    expect(s.jobs[2]!.attempt).toBe(2);
  });
  it('the last payment cannot pass after its email is sent twice', () => {
    const c = defaultConfig(2);
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
    const c = defaultConfig(2);
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
    let s = initialState(defaultConfig(2));
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
    const c = defaultConfig(2);
    c.steps.forEach((step, i) => (step.kind = i % 2 ? 'set-state' : 'check'));
    const s = run(c);
    expect(s.phase).toBe('won');
    expect(s.wasted).toBe(6);
    expect(s.skipped).toBe(0);
    expect(s.jobs[1]!.steps[0]!.executions).toBe(2);
    expect(s.jobs[1]!.steps[0]!.effects).toBe(1);
  });
  it('a non-idempotent local append can duplicate without any external effect', () => {
    const c = defaultConfig(2);
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    const s = run(c);
    expect(s.phase).toBe('duplicate');
    expect(s.jobs[1]!.steps[1]!.effects).toBe(2);
  });
  it('a saved checkpoint can skip a prior local append in the normal scenario', () => {
    const c = defaultConfig(2);
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    c.steps[1]!.remember = true;
    const s = run(c);
    expect(s.phase).toBe('won');
    expect(s.jobs.every((j) => j.steps[1]!.effects === 1)).toBe(true);
  });
  it('a provider capability cannot deduplicate a local append', () => {
    const c = defaultConfig(2);
    c.steps.forEach((step) => (step.kind = 'check'));
    c.steps[1]!.kind = 'append';
    c.steps[1]!.providerDeduplication = true;
    expect(run(c).phase).toBe('duplicate');
  });
});

describe('Simulation invariants', () => {
  it('does not invent checkpoint writes when remembering is disabled', () => {
    const config = defaultConfig(2);
    config.steps.forEach((step) => (step.kind = 'check'));
    const state = run(config);
    expect(state.phase).toBe('won');
    expect(state.events.some((event) => event.kind === 'saved')).toBe(false);
    expect(
      state.jobs.every((job) => job.steps.every((step) => !step.checkpoint)),
    ).toBe(true);

    config.steps[1]!.remember = true;
    const remembered = run(config);
    const writes = remembered.events.filter((event) => event.kind === 'saved');
    expect(writes).toHaveLength(3);
    expect(writes.every((event) => event.step === 1)).toBe(true);
  });

  it('isolates configuration edits and resets from a previous trial', () => {
    const config = defaultConfig(1);
    const original = initialState(config);
    config.storage = 'db';
    config.protectLocalRecord = true;
    const completed = run(config);
    expect(completed.phase).toBe('won');
    expect(original.config.storage).toBe('ram');
    expect(original.jobs.every((job) => job.attempt === 0)).toBe(true);
    const reset = initialState(config);
    expect(reset.tick).toBe(0);
    expect(reset.events).toEqual([]);
    expect(reset.injected).toEqual([]);
    expect(
      reset.jobs.every((job) =>
        job.steps.every((step) => step.effects === 0 && !step.checkpoint),
      ),
    ).toBe(true);
    expect(totals(completed).done).toBe(3);
  });

  it('replays the same commands without mutating any earlier state', () => {
    function freeze(value: unknown): void {
      if (value && typeof value === 'object') {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
      }
    }
    function replay(config: SimulationConfig): SimulationState[] {
      const states = [initialState(config)];
      for (let command = 0; command < 200; command++) {
        const previous = states.at(-1)!;
        freeze(previous);
        const next =
          previous.phase === 'incident'
            ? continueAfterIncident(previous)
            : advance(previous);
        if (next === previous) return states;
        states.push(next);
      }
      throw new Error('Scenario exceeded its command budget');
    }
    const configs = [
      defaultConfig(1),
      defaultConfig(1),
      defaultConfig(2),
      defaultConfig(2),
    ];
    configs[1]!.storage = 'db';
    configs[1]!.protectLocalRecord = true;
    configs[3]!.steps.forEach((step) => (step.remember = true));
    configs[3]!.gap = 'charge';
    configs[3]!.steps[1]!.providerDeduplication = true;
    for (const config of configs) {
      const states = replay(config);
      expect(replay(config)).toEqual(states);
      for (const state of states) {
        expect(state.jobs.map((job) => job.id)).toEqual([1, 2, 3]);
        expect(
          state.jobs
            .flatMap((job) => job.steps)
            .every((step) => !step.checkpoint || step.effects > 0),
        ).toBe(true);
        expect(
          state.jobs
            .filter((job) => job.status === 'done')
            .every((job) => job.steps.every((step) => step.effects > 0)),
        ).toBe(true);
        expect(
          state.events.every(
            (event, i) =>
              event.tick <= state.tick &&
              (!i || event.tick >= state.events[i - 1]!.tick),
          ),
        ).toBe(true);
      }
    }
  });
});
