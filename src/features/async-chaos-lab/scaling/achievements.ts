import {
  BASE_CAPACITIES, PAYMENT_COUNT, TARGET_SECONDS, TICK_SECONDS,
  scalingVerdict,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';

export function minimumWorkers(config: Pick<ScalingConfig, 'durations'>): number {
  // Every payment holds its worker through all four operations. No resource
  // upgrade can reduce this total service time per worker.
  const workSeconds = PAYMENT_COUNT * config.durations.reduce((sum, ticks) => sum + ticks, 0) * TICK_SECONDS;
  return Math.ceil(workSeconds / TARGET_SECONDS);
}
export type ScalingAchievementId = 'pods-only' | 'on-time' | 'minimum-team';
export const scalingAchievements: {
  id: ScalingAchievementId;
  es: [string, string];
  en: [string, string];
}[] = [
  { id: 'pods-only',
    es: ['Échale más pods', 'Prueba a escalar añadiendo solo workers.'],
    en: ['Just add more pods', 'Try scaling by adding only workers.'] },
  { id: 'on-time',
    es: ['Justo a tiempo', `Completaste los 24 pagos en ${TARGET_SECONDS} segundos o menos, sin tumbar ningún servicio.`],
    en: ['Right on time', `You completed all 24 payments in at most ${TARGET_SECONDS} seconds without an outage.`] },
  { id: 'minimum-team',
    es: ['Con lo justo', 'Completa el nivel con el mínimo de workers.'],
    en: ['Just enough', 'Complete the level with the minimum number of workers.'] },

];

/** Evaluate actual completed/interrupted runs, never configuration clicks. */
export function eligibleAchievements(state: ScalingState): ScalingAchievementId[] {
  if (!['complete', 'blocked'].includes(state.phase)) return [];
  const verdict = scalingVerdict(state);
  const completed = state.phase === 'complete';
  const conditions: Record<ScalingAchievementId, boolean> = {
    'pods-only': state.config.workers > 1 && state.config.capacities.every((capacity, i) => capacity === BASE_CAPACITIES[i]),
    'on-time': completed && verdict.fast && verdict.safe,
    'minimum-team': verdict.won && state.config.workers === minimumWorkers(state.config),
  };
  return scalingAchievements.filter((achievement) => conditions[achievement.id]).map((achievement) => achievement.id);
}
