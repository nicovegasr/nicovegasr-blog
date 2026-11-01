import { describe, expect, it } from 'vitest';
import { defaultConfig, run } from '../payment-simulation/engine';
import { earnedAchievements } from './lab';

describe('Queue achievements', () => {
  it('rewards running without protection and the duplicate or loss it causes', () => {
    expect(earnedAchievements(run(defaultConfig(1)))).toEqual(['brave']);
  });

  it('rewards surviving the crash and keeping one record per ID', () => {
    const config = defaultConfig(1);
    config.storage = 'db';
    config.protectLocalRecord = true;
    expect(earnedAchievements(run(config))).toEqual(['survivor', 'identity']);
  });
});
