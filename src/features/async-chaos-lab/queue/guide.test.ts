import { describe, expect, it } from 'vitest';
import { advance, initialState, run } from '../payment-simulation/engine';
import type { SimulationState } from '../payment-simulation/engine';
import type { GuideStage } from '../payment-simulation/guide';
import { queueGuideBeat } from './guide';
import { queueConfig, queueRules } from './rules';

const context = (state: SimulationState, stage: GuideStage) => ({
  es: true,
  stage,
  state,
  playing: false,
  api: 'My intake',
  worker: 'My worker',
  job: `Payment #${Math.max(0, state.active) + 1}`,
  chargeStep: 'My charge',
  lastStep: 'My notification',
  steps: state.config.steps.map((_, index) => `My step ${index + 1}`),
});
const beat = (state: SimulationState, stage: GuideStage) => queueGuideBeat(context(state, stage));

describe('Queue walkthrough follows observed state', () => {
  it('asks to start without highlighting an unrelated choice', () => {
    const result = beat(initialState(queueConfig()), 'ram');
    expect(result.target).toBeNull();
    expect(result.task).toContain('Iniciar');
    expect(result.story).toContain('My intake');
    expect(result.story).toContain('My worker');
  });

  it('distinguishes a new design from an observed duplicate', () => {
    const config = queueConfig();
    config.storage = 'db';
    const ready = beat(initialState(config), 'identity');
    expect(ready.target).toBe('identity');
    expect(ready.story).not.toContain('acabó con dos filas');
    const duplicate = beat(run(config, queueRules), 'identity');
    expect(duplicate.story).toContain('Payment #3 acabó con dos filas');
  });

  it('asks to retry a real incident before suggesting another configuration', () => {
    const config = queueConfig();
    config.storage = 'db';
    let state = initialState(config);
    while (state.phase !== 'incident') state = advance(state, queueRules);
    const result = beat(state, 'durable');
    expect(result.target).toBeNull();
    expect(result.task).toContain('Reprocesar pago');
  });
});
