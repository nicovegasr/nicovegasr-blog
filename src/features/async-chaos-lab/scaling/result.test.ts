import { describe, expect, it } from 'vitest';
import { scalingNames } from './content';
import { runScaling, scalingDefaults, scalingMetrics } from './engine';
import type { ScalingConfig } from './engine';
import { rateLimitScene, trialResult } from './result';
import type { ResultContext } from './result';
import type { Trial } from './session';

const contextFor = (config: ScalingConfig, history: Trial[] = []): ResultContext => ({
  es: true,
  state: runScaling(config),
  config,
  names: scalingNames(true),
  history,
  awards: '<aside>award</aside>',
});

const fastConfig = (): ScalingConfig => ({
  ...scalingDefaults(),
  workers: 4,
  concurrencyPerWorker: 4,
  capacities: [8, 8, 8, 8],
  rateLimits: { 1: 8, 3: 8 },
});

describe('Scaling trial result', () => {
  it('calls the first completed trial out instead of comparing it', () => {
    const { body } = trialResult(contextFor(scalingDefaults()));

    expect(body).toContain('Es tu primer intento completado');
    expect(body).not.toContain('TU INTENTO ANTERIOR');
  });

  it('compares with the previous completed trial, ignoring the current one', () => {
    const previous: Trial = {
      config: scalingDefaults(),
      seconds: 99,
      cost: 7,
      completed: 24,
      waitingSeconds: 1,
      rateLimitedStep: null,
      won: false,
    };
    const context = contextFor(scalingDefaults(), [previous, previous]);

    expect(trialResult(context).body).toContain('TU INTENTO ANTERIOR');
    expect(trialResult(context).body).toContain('99 s');
  });

  it('includes the awards and its checks', () => {
    const { body } = trialResult(contextFor(scalingDefaults()));

    expect(body).toContain('<aside>award</aside>');
    expect(body).toContain('Un efecto por paso');
  });

  it('asks to adjust the system when the mission is not met', () => {
    const context = contextFor(scalingDefaults());

    expect(scalingMetrics(context.state).completed).toBe(24);
    expect(trialResult(context).tone).toBe('review');
    expect(trialResult(context).title).toContain('Llegaron');
  });
});

describe('Scaling rate limit scene', () => {
  it('explains the rejected request without calling the service down', () => {
    const context = contextFor(fastConfig());
    const scene = rateLimitScene(
      { ...context, state: { ...context.state, requestsInWindow: [0, 2, 0, 0] } },
      { step: 1, job: 3, limit: 2, retryAfterSeconds: 0.5 },
    );

    expect(scene).toContain('HTTP 429');
    expect(scene).toContain('Había plazas');
    expect(scene).toContain('El servicio sigue activo');
    expect(scene).toContain('Cobrar en Stripe');
  });
});
