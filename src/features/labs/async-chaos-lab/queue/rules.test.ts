import { describe, expect, it } from 'vitest';
import { recordCount, run as runWith, totals } from '../payment-simulation/engine';
import type { SimulationConfig } from '../payment-simulation/engine';
import { queueConfig, queueRules } from './rules';

const run = (config: SimulationConfig) => runWith(config, queueRules);

describe('Queue survival: three fixed jobs', () => {
  it('RAM belongs to the crashed worker process; completed effects survive separately', () => {
    const state = run(queueConfig());
    expect(state.jobs.map((job) => job.id)).toEqual([1, 2, 3]);
    expect(state.phase).toBe('lost');
    expect(state.active).toBe(1);
    expect(state.jobs[0]!.status).toBe('done');
    expect(totals(state).lost).toBe(2);
    expect(state.jobs[0]!.steps[0]!.effects).toBe(1);
  });
  it('durability recovers job 2 but alone cannot prevent lost-ACK duplicates on job 3', () => {
    const config = queueConfig();
    config.storage = 'db';
    const state = run(config);
    expect(state.phase).toBe('duplicate');
    expect(state.active).toBe(2);
    expect(state.jobs[1]!.attempt).toBe(2);
    expect(state.jobs[2]!.steps[1]!.effects).toBe(2);
    expect(state.jobs[2]!.status).toBe('failed');
  });
  it.each([1, 2, 4, 6])('protects every local effect with %s configurable steps', (count) => {
    const config = queueConfig();
    config.storage = 'db';
    config.protectLocalRecord = true;
    config.steps = Array.from({ length: count }, () => ({
      kind: 'append' as const,
      remember: false,
      providerDeduplication: false,
    }));
    const state = run(config);
    expect(state.phase).toBe('won');
    expect(totals(state).done).toBe(3);
    expect(state.jobs[2]!.attempt).toBe(2);
    expect(totals(state).skipped).toBe(count);
    for (const job of state.jobs) for (const step of job.steps) expect(step.effects).toBe(1);
  });
  it('only recording duplicates; validation can repeat before the duplicate is detected', () => {
    const config = queueConfig();
    config.storage = 'db';
    const state = run(config),
      job = state.jobs[2]!;
    expect(config.steps.map((step) => step.kind)).toEqual(['check', 'append', 'check']);
    expect(state.phase).toBe('duplicate');
    expect(state.step).toBe(1);
    expect(job.steps[0]!.executions).toBe(2);
    expect(job.steps[0]!.effects).toBe(1);
    expect(job.steps[1]!.effects).toBe(2);
    expect(job.steps[2]!.executions).toBe(1);
    expect(recordCount(state, job)).toBe(2);
  });
  it('protects the record while safely repeating pure actions on redelivery', () => {
    const config = queueConfig();
    config.storage = 'db';
    config.protectLocalRecord = true;
    const state = run(config),
      job = state.jobs[2]!;
    expect(state.phase).toBe('won');
    expect(state.skipped).toBe(1);
    expect(job.steps.map((step) => step.executions)).toEqual([2, 1, 2]);
    expect(job.steps.map((step) => step.checkpoint)).toEqual([false, true, false]);
    expect(job.steps.map((step) => step.effects)).toEqual([1, 1, 1]);
    expect(recordCount(state, job)).toBe(1);
    expect(state.jobs.reduce((total, job) => total + recordCount(state, job), 0)).toBe(3);
  });
  it('the first worker fault occurs before any effect on job 2', () => {
    const state = run(queueConfig());
    expect(state.jobs[1]!.steps.every((step) => step.effects === 0)).toBe(true);
  });
});
