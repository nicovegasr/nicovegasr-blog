import { describe, expect, it } from 'vitest';
import { createScaling, pauseScaling, playScaling, scalingDefaults, tickScaling } from './engine';
import { teamWorkerFrame } from './team-actors';

describe('Worker team poses preserve resource semantics', () => {
  it('keeps a payment on its worker while CPU capacity is unavailable', () => {
    const config = { ...scalingDefaults(), workers: 2, capacities: [1, 3, 2, 5] as [number, number, number, number] };
    const s = playScaling(createScaling(config));
    expect(teamWorkerFrame(s, 1)).toEqual({ pose: 'working', job: 1, step: 0 });
    expect(teamWorkerFrame(s, 2)).toEqual({ pose: 'waiting-cpu', job: 2, step: 0 });
  });

  it('shows an external call as awaiting a response and freezes the pose on pause', () => {
    let s = playScaling(createScaling());
    s = tickScaling(tickScaling(s));
    expect(teamWorkerFrame(s, 1)).toEqual({ pose: 'waiting-service', job: 1, step: 1 });
    expect(teamWorkerFrame(pauseScaling(s), 1)).toEqual({ pose: 'paused', job: 1, step: 1 });
  });

  it('distinguishes waiting for admission from an accepted call awaiting its response', () => {
    let s = playScaling(createScaling({ ...scalingDefaults(), workers: 4 }));
    s = tickScaling(tickScaling(s));
    expect(s.phase).toBe('running');
    expect(teamWorkerFrame(s, 1)).toEqual({ pose: 'waiting-service', job: 1, step: 1 });
    expect(teamWorkerFrame(s, 4)).toEqual({ pose: 'waiting-slot', job: 4, step: 1 });
  });
  it('keeps a worker alive after a 429 and freezes accepted calls without pretending that they crashed', () => {
    let s = playScaling(createScaling({ ...scalingDefaults(), workers: 4, capacities: [4, 4, 2, 5] }));
    s = tickScaling(tickScaling(s));
    expect(teamWorkerFrame(s, 4)).toEqual({ pose: 'rejected', job: 4, step: 1 });
    expect(teamWorkerFrame(s, 1)).toEqual({ pose: 'paused', job: 1, step: 1 });
  });
});
