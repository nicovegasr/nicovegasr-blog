import { describe, expect, it } from 'vitest';
import { advance, defaultConfig, initialState, run } from './engine';
import { guideBeat } from './guide';
import type { GuideStage } from './guide';
import type { SimulationState } from './engine';

function beat(state: SimulationState, stage: GuideStage) {
  return guideBeat({
    level: state.config.level,
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
}

describe('Walkthrough instructions follow observed state', () => {
  it('asks to start without highlighting an unrelated choice', () => {
    const result = beat(initialState(), 'ram');
    expect(result.target).toBeNull();
    expect(result.task).toContain('Iniciar');
    expect(result.story).toContain('My intake');
    expect(result.story).toContain('My worker');
  });

  it('distinguishes a new design from an observed duplicate', () => {
    const config = defaultConfig(1);
    config.storage = 'db';
    const ready = beat(initialState(config), 'identity');
    expect(ready.target).toBe('identity');
    expect(ready.story).not.toContain('acabó con dos filas');
    const duplicate = beat(run(config), 'identity');
    expect(duplicate.story).toContain('Payment #3 acabó con dos filas');
  });

  it('asks to retry a real incident before suggesting another configuration', () => {
    const config = defaultConfig(1);
    config.storage = 'db';
    let state = initialState(config);
    while (state.phase !== 'incident') state = advance(state);
    const result = beat(state, 'durable');
    expect(result.target).toBeNull();
    expect(result.task).toContain('Reprocesar pago');
  });

  it('explains the receiver protection after a correct worker run', () => {
    const config = defaultConfig(2);
    config.steps[1]!.remember = true;
    config.steps[3]!.providerDeduplication = true;
    const state = run(config);
    expect(state.phase).toBe('won');
    expect(beat(state, 'safe').story).toContain('proveedor reconoció');
    expect(beat(state, 'optimize').task).toContain('opcional');
  });

  it('points to receiver deduplication after the final email is duplicated', () => {
    const config = defaultConfig(2);
    config.steps.forEach((step) => (step.remember = true));
    const duplicate = run(config);

    expect(duplicate.phase).toBe('duplicate');
    expect(duplicate.step).toBe(3);
    const result = beat(duplicate, 'email');
    expect(result.target).toBe('provider');
    expect(result.story).toContain('My notification');
    expect(result.task).toContain('proveedor');
  });
});
