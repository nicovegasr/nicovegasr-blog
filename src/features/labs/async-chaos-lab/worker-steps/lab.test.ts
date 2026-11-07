import { describe, expect, it } from 'vitest';
import { initialState, run } from '../payment-simulation/engine';
import { earnedAchievements } from './lab';
import { workerStepsConfig, workerStepsRules } from './rules';

describe('Worker steps achievements', () => {
  it('rewards running without protection and the duplicated effect', () => {
    expect(earnedAchievements(run(workerStepsConfig(), workerStepsRules))).toEqual(['brave', 'double']);
  });

  it('rewards finishing only when enough steps were skipped and none repeated', () => {
    const won = { ...initialState(workerStepsConfig()), phase: 'won' as const };

    expect(earnedAchievements({ ...won, skipped: 5, wasted: 0 })).toEqual(['efficient']);
    expect(earnedAchievements({ ...won, skipped: 4, wasted: 0 })).toEqual([]);
    expect(earnedAchievements({ ...won, skipped: 5, wasted: 1 })).toEqual([]);
  });
});
