import type { Attempt } from './attempts';
import { objectiveLabel } from './briefing';
import { isMet, type Challenge, type Objective } from './challenges';
import { cardCopy, resultCopy } from './copy';
import { isOver, outcomeOf, type CompleteBuild, type Outcome, type RunState } from './engine';
import { formatCount, formatMegabytes, formatSeconds } from './format';
import { hintFor } from './guide';

export const starsText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(3 - stars);

const liveValue = (objective: Objective, run: RunState): { value: string; failing: boolean } => {
  switch (objective.kind) {
    case 'survive': {
      const dead = run.phase === 'dead';
      return { value: dead ? 'muerto' : `${Math.round((run.megabytes / run.limitMegabytes) * 100)} % lleno`, failing: dead };
    }
    case 'seconds':
      return { value: formatSeconds(run.seconds), failing: run.seconds > objective.max };
    case 'megabytes':
      return { value: formatMegabytes(run.peakMegabytes), failing: run.peakMegabytes > objective.max };
    case 'write-trips':
      return { value: formatCount(Math.round(run.writeTrips)), failing: run.writeTrips > objective.max };
    case 'connection':
      return { value: formatSeconds(run.longestConnectionSeconds), failing: run.longestConnectionSeconds > objective.max };
  }
};

/** Each star shows, while the run goes, how the player is doing on it. */
export const renderLiveObjectives = (root: HTMLElement, challenge: Challenge, run: RunState | null) => {
  root.querySelectorAll<HTMLElement>('[data-objectives] li').forEach((item, index) => {
    const objective = challenge.objectives[index];
    if (objective === undefined) return;
    const { value, failing } = run === null ? { value: '—', failing: false } : liveValue(objective, run);
    const won = run !== null && isOver(run) && isMet(objective, outcomeOf(run));
    item.querySelector('[data-value]')!.textContent = value;
    item.classList.toggle('is-failing', failing);
    item.classList.toggle('is-won', won);
    item.querySelector('[data-mark]')!.textContent = failing ? '✕' : won ? '★' : '☆';
  });
};

interface Result {
  readonly challenge: Challenge;
  readonly build: CompleteBuild;
  readonly outcome: Outcome;
  readonly stars: number;
  readonly attempts: readonly Attempt[];
  readonly hasNext: boolean;
}

/** Fills the result dialog: stars, each objective, one hint and every attempt side by side. */
export const renderResult = (root: HTMLElement, { challenge, build, outcome, stars, attempts, hasNext }: Result) => {
  const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const survived = outcome.killedBy === null;
  part('[data-result-kicker]').textContent = `Reto ${challenge.id} · ${challenge.title}`;
  part('[data-result-stars]').textContent = starsText(stars);
  part('[data-result-title]').textContent = !survived ? resultCopy.killed : stars === 3 ? resultCopy.perfect : resultCopy.partial;
  const values: Record<Objective['kind'], string> = {
    survive: survived ? `pico de ${formatMegabytes(outcome.peakMegabytes)}` : `con ${formatCount(outcome.logsAnalyzed)} logs revisados`,
    seconds: formatSeconds(outcome.seconds),
    megabytes: formatMegabytes(outcome.peakMegabytes),
    'write-trips': `${formatCount(outcome.writeTrips)} viajes`,
    connection: `${formatSeconds(outcome.longestConnectionSeconds)} seguidos`,
  };
  part('[data-result-objectives]').replaceChildren(
    ...challenge.objectives.map((objective) => {
      const met = isMet(objective, outcome);
      return Object.assign(document.createElement('li'), {
        className: met ? 'is-met' : 'is-missed',
        textContent: `${met ? '★' : '✕'} ${objectiveLabel(objective)} · ${survived || objective.kind === 'survive' ? values[objective.kind] : '—'}`,
      });
    }),
  );
  part('[data-result-text]').textContent = hintFor(challenge, build, outcome) ?? challenge.takeaway;
  renderComparison(part('[data-compare]'), attempts);
  part('[data-next]').hidden = !(survived && hasNext);
  const dialog = part('[data-result]');
  dialog.classList.toggle('is-killed', !survived);
  dialog.classList.toggle('is-perfect', stars === 3);
};

/** The difference between two choices is what the lab teaches: every attempt side by side. */
const renderComparison = (body: HTMLElement, attempts: readonly Attempt[]) => {
  body.replaceChildren(
    ...attempts.map(({ build, batchSize, stars, outcome }, index) => {
      const write = build.write === 'batches' ? `Lotes de ${formatCount(batchSize)}` : cardCopy[build.write].shortLabel;
      const died = outcome.killedBy !== null;
      const row = document.createElement('tr');
      row.classList.toggle('is-latest', index === 0);
      row.classList.toggle('is-killed', died);
      [
        `${cardCopy[build.read].shortLabel} + ${write}`,
        starsText(stars),
        died ? 'OOM Killed' : formatMegabytes(outcome.peakMegabytes),
        died ? '—' : formatSeconds(outcome.seconds),
        died ? '—' : formatCount(outcome.queries),
        died ? '—' : formatCount(outcome.writeTrips),
      ].forEach((text) => row.append(Object.assign(document.createElement('td'), { textContent: text })));
      return row;
    }),
  );
};
