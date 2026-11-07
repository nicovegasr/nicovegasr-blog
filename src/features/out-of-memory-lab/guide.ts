import { isMet, type Challenge } from './challenges';
import type { CompleteBuild, Outcome } from './engine';

const SMALL_VOLUME_LOGS = 100_000;

export type HintKey =
  | 'list'
  | 'batch'
  | 'squeeze'
  | 'repeatedQuery'
  | 'manyPages'
  | 'oneByOne'
  | 'smallBatch'
  | 'memory'
  | 'longConnection'
  | 'smallStream';

/** One hint, only when something failed: the first broken objective decides which. */
export const hintFor = (challenge: Challenge, build: CompleteBuild, outcome: Outcome): HintKey | null => {
  if (outcome.killedBy === 'list') return 'list';
  if (outcome.killedBy === 'batch') return outcome.diedDuring === 'memory-squeeze' ? 'squeeze' : 'batch';
  const failed = challenge.objectives.find((objective) => !isMet(objective, outcome));
  if (failed === undefined) return null;
  if (failed.kind === 'megabytes') return 'memory';
  // A week of logs fits easily: the stream only adds its setup.
  if (failed.kind === 'seconds' && build.read === 'cursor' && challenge.scenario.logs <= SMALL_VOLUME_LOGS)
    return 'smallStream';
  if (failed.kind === 'connection') return 'longConnection';
  if (failed.kind === 'write-trips') return build.write === 'one-by-one' ? 'oneByOne' : 'smallBatch';
  if (build.read === 'pages' && challenge.scenario.querySeconds >= 1) return 'repeatedQuery';
  if (build.write === 'one-by-one' && challenge.scenario.runs > 100_000) return 'oneByOne';
  if (build.read === 'pages') return 'manyPages';
  return 'smallBatch';
};
