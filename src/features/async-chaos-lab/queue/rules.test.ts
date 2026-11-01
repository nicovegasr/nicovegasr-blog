import { describe, expect, it } from 'vitest';
import { recordCount, run as runWith, totals } from '../payment-simulation/engine';
import type { SimulationConfig } from '../payment-simulation/engine';
import { queueConfig, queueRules } from './rules';

const run = (config: SimulationConfig) => runWith(config, queueRules);

describe('Queue survival: three fixed jobs', () => {
  it('RAM belongs to the crashed worker process; completed effects survive separately', () => {
    const s = run(queueConfig());
    expect(s.jobs.map((job) => job.id)).toEqual([1, 2, 3]);
    expect(s.phase).toBe('lost');
    expect(s.active).toBe(1);
    expect(s.jobs[0]!.status).toBe('done');
    expect(totals(s).lost).toBe(2);
    expect(s.jobs[0]!.steps[0]!.effects).toBe(1);
  });
  it('durability recovers job 2 but alone cannot prevent lost-ACK duplicates on job 3', () => {
    const c = queueConfig();
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
      const c = queueConfig();
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
    const c = queueConfig();
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
    const c = queueConfig();
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
    const s = run(queueConfig());
    expect(s.jobs[1]!.steps.every((step) => step.effects === 0)).toBe(true);
  });
});
