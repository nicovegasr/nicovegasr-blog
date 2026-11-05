import { isMet, type Challenge } from './challenges';
import { hints } from './copy';
import type { CompleteBuild, Outcome } from './engine';

const SMALL_VOLUME_LOGS = 100_000;

/** One hint, only when something failed: the first broken objective decides which. */
export const hintFor = (challenge: Challenge, build: CompleteBuild, outcome: Outcome): string | null => {
  if (outcome.killedBy === 'list') return hints.list;
  if (outcome.killedBy === 'batch') return outcome.diedDuring === 'memory-squeeze' ? hints.squeeze : hints.batch;
  const failed = challenge.objectives.find((objective) => !isMet(objective, outcome));
  if (failed === undefined) return null;
  if (failed.kind === 'megabytes') return hints.memory;
  // A week of logs fits easily: the stream only adds its setup.
  if (failed.kind === 'seconds' && build.read === 'cursor' && challenge.scenario.logs <= SMALL_VOLUME_LOGS) return hints.smallStream;
  if (failed.kind === 'connection') return hints.longConnection;
  if (failed.kind === 'write-trips') return build.write === 'one-by-one' ? hints.oneByOne : hints.smallBatch;
  if (build.read === 'pages' && challenge.scenario.querySeconds >= 1) return hints.repeatedQuery;
  if (build.write === 'one-by-one' && challenge.scenario.runs > 100_000) return hints.oneByOne;
  if (build.read === 'pages') return hints.manyPages;
  return hints.smallBatch;
};
