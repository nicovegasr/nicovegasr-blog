import { defineCopy } from '@/i18n/copy';
import {
  BASE_CAPACITIES,
  BASE_RATE_LIMITS,
  PAYMENT_COUNT,
  TARGET_SECONDS,
  TICK_SECONDS,
  scalingVerdict,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';

export function minimumWorkers(config: Pick<ScalingConfig, 'durations'>): number {
  // A worker validates one payment at a time, however many it holds, and the
  // last validation must leave time for the remaining operations. No resource
  // upgrade or extra concurrency can shorten this.
  const [cpuTicks, ...remainingTicks] = config.durations;
  const cpuSeconds = PAYMENT_COUNT * cpuTicks * TICK_SECONDS;
  const remainingSeconds = remainingTicks.reduce((sum, ticks) => sum + ticks, 0) * TICK_SECONDS;
  return Math.ceil(cpuSeconds / (TARGET_SECONDS - remainingSeconds));
}
export type ScalingAchievementId = 'pods-only' | 'on-time' | 'minimum-team';
export const scalingAchievementIds: readonly ScalingAchievementId[] = ['pods-only', 'on-time', 'minimum-team'];

type ScalingAchievementText = Record<ScalingAchievementId, [title: string, description: string]>;

const es: ScalingAchievementText = {
  'pods-only': ['Échale más pods', 'Prueba a escalar añadiendo solo workers.'],
  'on-time': [
    'Justo a tiempo',
    `Completaste los 24 pagos en ${TARGET_SECONDS} segundos o menos, sin duplicar sus efectos.`,
  ],
  'minimum-team': ['Con lo justo', 'Completa el nivel con el mínimo de workers.'],
};

const en: ScalingAchievementText = {
  'pods-only': ['Just add more pods', 'Try scaling by adding only workers.'],
  'on-time': [
    'Right on time',
    `You completed all 24 payments in at most ${TARGET_SECONDS} seconds without duplicate effects.`,
  ],
  'minimum-team': ['Just enough', 'Complete the level with the minimum number of workers.'],
};

export const scalingAchievementCopy = defineCopy({ es, en });

/** Evaluate completed runs, never configuration clicks or unfinished playback. */
export function eligibleAchievements(state: ScalingState): ScalingAchievementId[] {
  if (state.phase !== 'complete') return [];
  const verdict = scalingVerdict(state);
  const conditions: Record<ScalingAchievementId, boolean> = {
    'pods-only':
      state.config.workers > 1 &&
      state.config.concurrencyPerWorker === 1 &&
      state.config.capacities.every((capacity, index) => capacity === BASE_CAPACITIES[index]) &&
      ([1, 3] as const).every((step) => state.config.rateLimits[step] === BASE_RATE_LIMITS[step]),
    'on-time': verdict.fast && verdict.safe,
    'minimum-team': verdict.won && state.config.workers === minimumWorkers(state.config),
  };
  return scalingAchievementIds.filter((id) => conditions[id]);
}
