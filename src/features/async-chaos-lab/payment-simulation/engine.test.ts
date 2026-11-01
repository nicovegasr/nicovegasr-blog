import { describe, expect, it } from 'vitest';
import {
  advance,
  continueAfterIncident,
  initialState,
  run,
  totals,
} from './engine';
import type { SimulationConfig, SimulationRules, SimulationState } from './engine';
import { queueConfig, queueRules } from '../queue/rules';
import { workerStepsConfig, workerStepsRules } from '../worker-steps/rules';

describe('Simulation invariants', () => {
  it('does not invent checkpoint writes when remembering is disabled', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.kind = 'check'));
    const state = run(config, workerStepsRules);
    expect(state.phase).toBe('won');
    expect(state.events.some((event) => event.kind === 'saved')).toBe(false);
    expect(
      state.jobs.every((job) => job.steps.every((step) => !step.checkpoint)),
    ).toBe(true);

    config.steps[1]!.remember = true;
    const remembered = run(config, workerStepsRules);
    const writes = remembered.events.filter((event) => event.kind === 'saved');
    expect(writes).toHaveLength(3);
    expect(writes.every((event) => event.step === 1)).toBe(true);
  });

  it('isolates configuration edits and resets from a previous trial', () => {
    const config = queueConfig();
    const original = initialState(config);
    config.storage = 'db';
    config.protectLocalRecord = true;
    const completed = run(config, queueRules);
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
    function replay(config: SimulationConfig, rules: SimulationRules): SimulationState[] {
      const states = [initialState(config)];
      for (let command = 0; command < 200; command++) {
        const previous = states.at(-1)!;
        freeze(previous);
        const next =
          previous.phase === 'incident'
            ? continueAfterIncident(previous)
            : advance(previous, rules);
        if (next === previous) return states;
        states.push(next);
      }
      throw new Error('Scenario exceeded its command budget');
    }
    const configs = [
      queueConfig(),
      queueConfig(),
      workerStepsConfig(),
      workerStepsConfig(),
    ];
    configs[1]!.storage = 'db';
    configs[1]!.protectLocalRecord = true;
    configs[3]!.steps.forEach((step) => (step.remember = true));
    configs[3]!.gap = 'charge';
    configs[3]!.steps[1]!.providerDeduplication = true;
    for (const [index, config] of configs.entries()) {
      const rules = index < 2 ? queueRules : workerStepsRules;
      const states = replay(config, rules);
      expect(replay(config, rules)).toEqual(states);
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
