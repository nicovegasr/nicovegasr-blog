import { describe, expect, it } from 'vitest';
import { run } from '../payment-simulation/engine';
import { earnedAchievements } from './lab';
import { queueConfig, queueRules } from './rules';

describe('Queue achievements', () => {
  it('rewards running without protection and the duplicate or loss it causes', () => {
    expect(earnedAchievements(run(queueConfig(), queueRules))).toEqual(['brave']);
  });

  it('rewards surviving the crash and keeping one record per ID', () => {
    const config = queueConfig();
    config.storage = 'db';
    config.protectLocalRecord = true;
    expect(earnedAchievements(run(config, queueRules))).toEqual(['survivor', 'identity']);
  });
});
