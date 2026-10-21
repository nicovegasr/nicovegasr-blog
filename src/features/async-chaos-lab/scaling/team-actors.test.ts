import { describe, expect, it } from 'vitest';
import { createScaling, pauseScaling, playScaling, runScaling, scalingDefaults, tickScaling } from './engine';
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

  it('shows callers interrupted by overload without turning workers into corpses', () => {
    const s = runScaling({ ...scalingDefaults(), workers: 4 });
    expect(s.phase).toBe('blocked');
    for (let worker = 1; worker <= 4; worker++)
      expect(teamWorkerFrame(s, worker)).toEqual({ pose: 'interrupted', job: worker, step: 1 });
  });
});
