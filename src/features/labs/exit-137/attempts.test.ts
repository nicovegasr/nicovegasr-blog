import { describe, expect, it } from 'vitest';
import { MAX_COMPARED_ATTEMPTS, recordAttempt, type Attempt } from './attempts';
import type { BatchSize, ReadCard, WriteCard } from './engine';

const attempt = (read: ReadCard, write: WriteCard, batchSize: BatchSize = 1_000, stars = 1): Attempt => ({
  build: { read, write },
  batchSize,
  stars,
  outcome: {
    killedBy: null,
    diedDuring: null,
    peakMegabytes: 200,
    longestConnectionSeconds: 1,
    seconds: 1,
    queries: 1,
    writeTrips: 1,
    logsAnalyzed: 1,
  },
});

describe('recordAttempt', () => {
  it('puts the latest attempt first', () => {
    const attempts = recordAttempt([attempt('load-all', 'one-by-one')], attempt('cursor', 'one-by-one'));
    expect(attempts.map(({ build }) => build.read)).toEqual(['cursor', 'load-all']);
  });

  it('replaces the row when the same choice is repeated', () => {
    const attempts = recordAttempt(
      [attempt('cursor', 'one-by-one', 1_000, 1)],
      attempt('cursor', 'one-by-one', 1_000, 3),
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.stars).toBe(3);
  });

  it('treats another batch size as another choice, but only when batching', () => {
    expect(recordAttempt([attempt('cursor', 'batches', 1_000)], attempt('cursor', 'batches', 5_000))).toHaveLength(2);
    expect(
      recordAttempt([attempt('cursor', 'one-by-one', 1_000)], attempt('cursor', 'one-by-one', 5_000)),
    ).toHaveLength(1);
  });

  it('keeps only the rows that fit the table', () => {
    const reads: ReadCard[] = ['load-all', 'cursor', 'pages'];
    const attempts = [...reads, ...reads].reduce<readonly Attempt[]>(
      (all, read, index) => recordAttempt(all, attempt(read, 'batches', index < 3 ? 100 : 5_000)),
      [],
    );
    expect(attempts).toHaveLength(MAX_COMPARED_ATTEMPTS);
  });
});
