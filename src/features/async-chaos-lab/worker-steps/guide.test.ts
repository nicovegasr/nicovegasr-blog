import { describe, expect, it } from 'vitest';
import { run } from '../payment-simulation/engine';
import type { SimulationState } from '../payment-simulation/engine';
import type { GuideStage } from '../payment-simulation/guide';
import { workerStepsGuideBeat } from './guide';
import { workerStepsConfig, workerStepsRules } from './rules';

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
const beat = (state: SimulationState, stage: GuideStage) => workerStepsGuideBeat(context(state, stage));

describe('Worker steps walkthrough follows observed state', () => {
  it('explains the receiver protection after a correct worker run', () => {
    const config = workerStepsConfig();
    config.steps[1]!.remember = true;
    config.steps[3]!.providerDeduplication = true;
    const state = run(config, workerStepsRules);
    expect(state.phase).toBe('won');
    expect(beat(state, 'safe').story).toContain('proveedor reconoció');
    expect(beat(state, 'optimize').task).toContain('opcional');
  });

  it('teaches the saved charge checkpoint before the ambiguous email outcome', () => {
    const state = run(workerStepsConfig(), workerStepsRules);
    expect(state.phase).toBe('duplicate');
    expect(state.step).toBe(1);
    const result = beat(state, 'charge');
    expect(result.target).toBe('charge');
    expect(result.task).toContain('Guardar avance al recibir confirmación');
  });

  it('points to receiver deduplication after the final email is duplicated', () => {
    const config = workerStepsConfig();
    config.steps.forEach((step) => (step.remember = true));
    const duplicate = run(config, workerStepsRules);

    expect(duplicate.phase).toBe('duplicate');
    expect(duplicate.step).toBe(3);
    const result = beat(duplicate, 'email');
    expect(result.target).toBe('provider');
    expect(result.story).toContain('My notification');
    expect(result.task).toContain('deduplicación por clave');
  });
});
