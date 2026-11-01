import { describe, expect, it } from 'vitest';
import { createScaling, pauseScaling, playScaling, scalingDefaults, tickScaling } from './engine';
import { teamWorkerFrame } from './team-actors';

describe('Worker team poses preserve resource semantics', () => {
  it('keeps a payment on its worker while CPU capacity is unavailable', () => {
    const config = { ...scalingDefaults(), workers: 2, capacities: [1, 3, 2, 5] as [number, number, number, number] };
    const state = playScaling(createScaling(config));
    expect(teamWorkerFrame(state, 1)).toEqual({ pose: 'working', job: 1, step: 0, load: 1 });
    expect(teamWorkerFrame(state, 2)).toEqual({ pose: 'waiting-cpu', job: 2, step: 0, load: 1 });
  });

  it('shows an external call as awaiting a response and freezes the pose on pause', () => {
    let state = playScaling(createScaling());
    state = tickScaling(tickScaling(state));
    expect(teamWorkerFrame(state, 1)).toEqual({ pose: 'waiting-service', job: 1, step: 1, load: 1 });
    expect(teamWorkerFrame(pauseScaling(state), 1)).toEqual({ pose: 'paused', job: 1, step: 1, load: 1 });
  });

  it('distinguishes waiting for admission from an accepted call awaiting its response', () => {
    let state = playScaling(createScaling({ ...scalingDefaults(), workers: 4, rateLimits: { 1: 3, 3: 2 } }));
    state = tickScaling(tickScaling(state));
    expect(state.phase).toBe('running');
    expect(teamWorkerFrame(state, 1)).toEqual({ pose: 'waiting-service', job: 1, step: 1, load: 1 });
    expect(teamWorkerFrame(state, 4)).toEqual({ pose: 'waiting-slot', job: 4, step: 1, load: 1 });
  });
  it('shows CPU work first when a worker also holds payments awaiting replies', () => {
    let state = playScaling(createScaling({ ...scalingDefaults(), concurrencyPerWorker: 3 }));
    state = tickScaling(tickScaling(state));
    expect(teamWorkerFrame(state, 1)).toEqual({ pose: 'working', job: 2, step: 0, load: 3 });
  });
  it('keeps a worker alive after a 429 and freezes accepted calls without pretending that they crashed', () => {
    let state = playScaling(createScaling({ ...scalingDefaults(), workers: 3 }));
    state = tickScaling(tickScaling(state));
    expect(teamWorkerFrame(state, 3)).toEqual({ pose: 'rejected', job: 3, step: 1, load: 1 });
    expect(teamWorkerFrame(state, 1)).toEqual({ pose: 'paused', job: 1, step: 1, load: 1 });
  });
});
