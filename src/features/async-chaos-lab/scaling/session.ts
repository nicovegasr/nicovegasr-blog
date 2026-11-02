import { scalingAchievements } from './achievements';
import type { ScalingAchievementId } from './achievements';
import { cleanLabel } from '../shared/text';
import type { Names } from './content';
import {
  AVAILABLE_WORKERS,
  createScaling,
  isHttpStep,
  PAYMENT_COUNT,
  TARGET_COST,
  TARGET_SECONDS,
} from './engine';
import type { ScalingConfig } from './engine';

export type Trial = {
  config: ScalingConfig;
  seconds: number;
  cost: number;
  completed: number;
  waitingSeconds: number;
  rateLimitedStep: number | null;
  won: boolean;
};

export const MAXIMUM_RESTORED_TRIALS = 8;
const achievementsKey = 'async-scaling-achievements-v1';
const sessionKey = (es: boolean) => `async-scaling-v7-${es ? 'es' : 'en'}`;
const previousSessionKey = (es: boolean) => `async-scaling-v6-${es ? 'es' : 'en'}`;

const isRestorableTrial = (trial: Trial): boolean => {
  try {
    createScaling(trial.config);
  } catch {
    return false;
  }
  return (
    trial.config.workers <= AVAILABLE_WORKERS &&
    (trial.rateLimitedStep === null || isHttpStep(trial.rateLimitedStep)) &&
    [trial.seconds, trial.cost, trial.completed, trial.waitingSeconds].every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100_000,
    )
  );
};

const withCurrentVerdict = (trial: Trial): Trial => ({
  ...trial,
  won:
    trial.completed === PAYMENT_COUNT &&
    trial.config.workers <= AVAILABLE_WORKERS &&
    trial.seconds <= TARGET_SECONDS &&
    trial.cost <= TARGET_COST &&
    trial.rateLimitedStep === null,
});

// Browser storage is optional: every function works, without persisting, when it is blocked.
export function restoreSession(defaults: Names, es: boolean): { names: Names; history: Trial[] } {
  const names = structuredClone(defaults);
  let history: Trial[] = [];
  try {
    const current = sessionStorage.getItem(sessionKey(es));
    // Keep customized names; runs where a worker held a single payment are not comparable.
    const saved = JSON.parse(current ?? sessionStorage.getItem(previousSessionKey(es)) ?? '{}');
    if (saved.names && typeof saved.names === 'object') {
      for (const key of ['api', 'queue', 'worker'] as const)
        names[key] = cleanLabel(saved.names[key], names[key]);
      for (const key of ['steps', 'jobs'] as const)
        names[key] = names[key].map((fallback, index) =>
          cleanLabel(saved.names[key]?.[index], fallback),
        );
    }
    if (current && Array.isArray(saved.history))
      history = saved.history
        .slice(-MAXIMUM_RESTORED_TRIALS)
        .filter(isRestorableTrial)
        .map(withCurrentVerdict);
  } catch {
    return { names, history };
  }
  return { names, history };
}

export function saveSession(names: Names, history: Trial[], es: boolean) {
  try {
    sessionStorage.setItem(sessionKey(es), JSON.stringify({ names, history }));
  } catch {
    return;
  }
}

export function restoreAchievements(): Set<ScalingAchievementId> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(achievementsKey) ?? '{}');
    if (Array.isArray(saved.ids))
      return new Set(
        scalingAchievements.filter(({ id }) => saved.ids.includes(id)).map(({ id }) => id),
      );
  } catch {
    return new Set();
  }
  return new Set();
}

export function saveAchievements(unlocked: Set<ScalingAchievementId>) {
  try {
    sessionStorage.setItem(achievementsKey, JSON.stringify({ ids: [...unlocked] }));
  } catch {
    return;
  }
}
