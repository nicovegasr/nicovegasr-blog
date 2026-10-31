import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultLabels } from './labels';
import {
  restoreAchievements,
  restoreLabels,
  saveAchievements,
  saveLabel,
} from './session';

const useStorage = () => {
  const entries = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
};

describe('lab session', () => {
  beforeEach(useStorage);
  afterEach(() => vi.unstubAllGlobals());

  it('restores a saved name for the same language only', () => {
    const labels = defaultLabels(1, true);
    labels.api = 'Mi API';
    saveLabel('api', labels, 1, true);

    expect(restoreLabels(defaultLabels(1, true), 1, true).api).toBe('Mi API');
    expect(restoreLabels(defaultLabels(1, false), 1, false).api).toBe('Payment API');
  });

  it('keeps the step names of each level apart', () => {
    const labels = defaultLabels(2, true);
    labels.steps[0] = 'Paso propio';
    saveLabel('step-0', labels, 2, true);

    expect(restoreLabels(defaultLabels(2, true), 2, true).steps[0]).toBe('Paso propio');
    expect(restoreLabels(defaultLabels(1, true), 1, true).steps[0]).toBe('Validar pago');
  });

  it('falls back to the default for a blank saved name without touching the defaults', () => {
    const defaults = defaultLabels(1, true);
    const labels = structuredClone(defaults);
    labels.jobs[0] = '   ';
    saveLabel('job-0', labels, 1, true);

    const restored = restoreLabels(defaults, 1, true);

    expect(restored.jobs[0]).toBe(defaults.jobs[0]);
    expect(restored).not.toBe(defaults);
  });

  it('restores only achievements that still exist', () => {
    sessionStorage.setItem('queue-story-achievements', JSON.stringify(['brave', 'removed']));

    expect([...restoreAchievements()]).toEqual(['brave']);
  });

  it('round-trips unlocked achievements', () => {
    saveAchievements(new Set(['brave']));

    expect([...restoreAchievements()]).toEqual(['brave']);
  });

  it('uses the defaults with corrupt data', () => {
    sessionStorage.setItem('queue-story-names-es', '{broken');
    sessionStorage.setItem('queue-story-achievements', '{broken');
    const defaults = defaultLabels(1, true);

    expect(restoreLabels(defaults, 1, true)).toEqual(defaults);
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
    const defaults = defaultLabels(1, true);

    expect(restoreLabels(defaults, 1, true)).toEqual(defaults);
    expect(() => saveLabel('api', defaults, 1, true)).not.toThrow();
    expect(() => saveAchievements(new Set(['brave']))).not.toThrow();
    expect(restoreAchievements().size).toBe(0);
  });
});
