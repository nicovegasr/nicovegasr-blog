import type { BatchSize, CompleteBuild, Outcome } from './engine';

export interface Attempt {
  readonly build: CompleteBuild;
  readonly batchSize: BatchSize;
  readonly stars: number;
  readonly outcome: Outcome;
}

export const MAX_COMPARED_ATTEMPTS = 4;

const sameChoice = (first: Attempt, second: Attempt) =>
  first.build.read === second.build.read &&
  first.build.write === second.build.write &&
  (first.build.write !== 'batches' || first.batchSize === second.batchSize);

/** Latest first. Repeating a choice replaces its row: the table compares choices, not retries. */
export const recordAttempt = (attempts: readonly Attempt[], attempt: Attempt): readonly Attempt[] =>
  [attempt, ...attempts.filter((previous) => !sameChoice(previous, attempt))].slice(0, MAX_COMPARED_ATTEMPTS);
