import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scalingNames } from './content';
import { scalingDefaults } from './engine';
import { restoreAchievements, restoreSession, saveAchievements, saveSession } from './session';
import type { Trial } from './session';

const trial = (overrides: Partial<Trial> = {}): Trial => ({
  config: scalingDefaults(),
  seconds: 10,
  cost: 10,
  completed: 24,
  waitingSeconds: 1,
  rateLimitedStep: null,
  won: false,
  ...overrides,
});

const useStorage = () => {
  const entries = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
};

describe('scaling session', () => {
  beforeEach(useStorage);
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips the customized names per language', () => {
    const names = scalingNames('es');
    names.api = 'Mi API';
    saveSession(names, [], 'es');

    expect(restoreSession(scalingNames('es'), 'es').names.api).toBe('Mi API');
    expect(restoreSession(scalingNames('en'), 'en').names.api).toBe('Payment API');
  });

  it('keeps names but not trials from the previous session version', () => {
    const names = scalingNames('es');
    names.queue = 'Mi cola';
    sessionStorage.setItem('async-scaling-v6-es', JSON.stringify({ names, history: [trial()] }));

    const restored = restoreSession(scalingNames('es'), 'es');

    expect(restored.names.queue).toBe('Mi cola');
    expect(restored.history).toEqual([]);
  });

  it('restores only the latest eight trials', () => {
    saveSession(
      scalingNames('es'),
      Array.from({ length: 10 }, (_, seconds) => trial({ seconds })),
      'es',
    );

    expect(restoreSession(scalingNames('es'), 'es').history.map(({ seconds }) => seconds)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('discards trials with invalid data', () => {
    const invalid = [
      trial({ seconds: -1 }),
      trial({ cost: 100_001 }),
      trial({ rateLimitedStep: 0 }),
      { ...trial(), config: null },
      null,
    ] as Trial[];
    saveSession(scalingNames('es'), invalid, 'es');

    expect(restoreSession(scalingNames('es'), 'es').history).toEqual([]);
  });

  it('recomputes the verdict instead of trusting the stored one', () => {
    saveSession(scalingNames('es'), [trial({ completed: 1, won: true })], 'es');

    expect(restoreSession(scalingNames('es'), 'es').history[0]!.won).toBe(false);
  });

  it('round-trips only existing achievements', () => {
    sessionStorage.setItem('async-scaling-achievements-v1', JSON.stringify({ ids: ['removed'] }));
    expect(restoreAchievements().size).toBe(0);

    saveAchievements(new Set());
    expect(restoreAchievements().size).toBe(0);
  });

  it('keeps working with the storage blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const defaults = scalingNames('es');

    expect(restoreSession(defaults, 'es')).toEqual({ names: defaults, history: [] });
    expect(() => saveSession(defaults, [], 'es')).not.toThrow();
    expect(() => saveAchievements(new Set())).not.toThrow();
    expect(restoreAchievements().size).toBe(0);
  });
});
