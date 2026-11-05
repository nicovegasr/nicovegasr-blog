import { describe, expect, it } from 'vitest';
import { CHALLENGES, starsFor, type Challenge } from './challenges';
import { advance, outcomeOf, playToEnd, startRun, type BatchSize, type CompleteBuild, type ReadCard, type RunState, type WriteCard } from './engine';
import { hintFor } from './guide';
import { codeLines } from './script-code';

const challenge = (id: number): Challenge => CHALLENGES.find((candidate) => candidate.id === id)!;
const build = (read: ReadCard, write: WriteCard = 'one-by-one'): CompleteBuild => ({ read, write });
const play = (id: number, script: CompleteBuild, batchSizeAt?: (state: RunState) => BatchSize) => {
  const outcome = outcomeOf(playToEnd(script, challenge(id).scenario, batchSizeAt));
  return { outcome, stars: starsFor(challenge(id), outcome), hint: hintFor(challenge(id), script, outcome) };
};
const always = (size: BatchSize) => () => size;

describe('challenge 1: a week of logs', () => {
  it('loading everything wins the three stars', () => {
    expect(play(1, build('load-all')).stars).toBe(3);
  });

  it('a stream pays its setup on so few logs: no time star, and a hint that the simple way wins', () => {
    const { stars, hint } = play(1, build('cursor'));
    expect(stars).toBe(2);
    expect(hint).toMatch(/lo simple gana/);
  });

  it('loading everything fills the backpack first and analyses afterwards', () => {
    let state = startRun(build('load-all'), challenge(1).scenario);
    state = advance(state, 1_000);
    expect(state.phase).toBe('loading');
    expect(state.logsAnalyzed).toBe(0);
    expect(state.megabytes).toBeGreaterThan(150);
  });
});

describe('challenge 2: months of history', () => {
  it('loading everything dies before analysing a single log, after a visible fill', () => {
    const state = playToEnd(build('load-all'), challenge(2).scenario);
    const { outcome, stars, hint } = play(2, build('load-all'));
    expect(state.step).toBeGreaterThan(40);
    expect(outcome.killedBy).toBe('list');
    expect(outcome.logsAnalyzed).toBe(0);
    expect(stars).toBe(0);
    expect(hint).toContain('antes de revisar');
  });

  it.each(['cursor', 'pages'] as const)('%s survives with a flat memory', (read) => {
    const { outcome } = play(2, build(read));
    expect(outcome.killedBy).toBeNull();
    expect(outcome.peakMegabytes).toBeLessThan(160);
  });

  it('only pages win: a cursor keeps the connection busy for the whole walk', () => {
    expect(play(2, build('pages')).stars).toBe(3);
    const cursor = play(2, build('cursor'));
    expect(cursor.stars).toBe(2);
    expect(cursor.outcome.longestConnectionSeconds).toBeGreaterThan(60);
    expect(cursor.hint).toMatch(/Pide páginas/);
  });
});

describe('challenge 3: the heavy query', () => {
  it('paging repeats the 30 s query on every page', () => {
    const { outcome, stars, hint } = play(3, build('pages'));
    expect(outcome.queries).toBe(5_000);
    expect(outcome.seconds).toBeGreaterThan(40 * 3_600);
    expect(stars).toBe(2);
    expect(hint).toContain('30 s');
  });

  it('the cursor pays it once', () => {
    const { outcome, stars } = play(3, build('cursor'));
    expect(outcome.queries).toBe(1);
    expect(stars).toBe(3);
  });
});

describe('challenge 4: restarts and another job', () => {
  it('saving one by one makes millions of trips', () => {
    const { outcome, stars, hint } = play(4, build('cursor', 'one-by-one'));
    expect(outcome.writeTrips).toBeGreaterThan(3_000_000);
    expect(stars).toBe(1);
    expect(hint).toContain('viaje');
  });

  it('the largest batch that fits the worst moment wins the three stars', () => {
    expect(play(4, build('cursor', 'batches'), always(5_000)).stars).toBe(3);
  });

  it('a safe but small batch survives with too many trips', () => {
    const { outcome, stars, hint } = play(4, build('cursor', 'batches'), always(1_000));
    expect(outcome.killedBy).toBeNull();
    expect(stars).toBe(2);
    expect(hint).toContain('pequeños');
  });

  it('a big batch dies when the other job starts', () => {
    const { outcome, hint } = play(4, build('cursor', 'batches'), always(10_000));
    expect(outcome.killedBy).toBe('batch');
    expect(outcome.diedDuring).toBe('memory-squeeze');
    expect(hint).toContain('otro job');
  });

  it('a huge batch fills the backpack on its own', () => {
    const { outcome, hint } = play(4, build('cursor', 'batches'), always(100_000));
    expect(outcome.killedBy).toBe('batch');
    expect(outcome.diedDuring).toBeNull();
    expect(hint).toContain('lote');
  });

  it('announces each incident once, when it starts', () => {
    let state = startRun(build('cursor', 'batches'), challenge(4).scenario);
    let incidents = 0;
    while (state.phase === 'analyzing') {
      state = advance(state, 5_000);
      if (state.events.includes('incident')) incidents += 1;
    }
    expect(incidents).toBe(2);
  });
});

describe('the code shown to the player', () => {
  const text = (lines: ReturnType<typeof codeLines>) =>
    lines.map((line) => (line.kind === 'batch-size' ? 'int batchSize = …;' : line.text)).join('\n');

  it('has holes until both cards are placed', () => {
    const lines = codeLines({ read: null, write: null });
    expect(lines.filter(({ kind }) => kind === 'hole')).toHaveLength(2);
  });

  it('is the code of the article for the cursor with batches', () => {
    const code = text(codeLines(build('cursor', 'batches')));
    expect(code).toContain('int batchSize = …;');
    expect(code).toContain('repo.streamAllOrdered(id)');
    expect(code).toContain('if (batch.size() == batchSize) {');
    expect(code).toContain('if (!batch.isEmpty()) write(batch);');
  });
});

describe('opening a stream', () => {
  it('is noise on months of history', () => {
    expect(play(2, build('cursor')).outcome.seconds).toBeLessThan(30 * 60);
  });
});
