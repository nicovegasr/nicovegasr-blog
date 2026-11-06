import type { Attempt } from './attempts';
import { objectiveLabel } from './briefing';
import { isMet, type Challenge, type Objective } from './challenges';
import { isOver, outcomeOf, type CompleteBuild, type Outcome, type RunState } from './engine';
import { hintFor } from './guide';
import type { LabText } from './lab-text';

export const starsText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(3 - stars);

const liveValue = ({ copy, format }: LabText, objective: Objective, run: RunState): { value: string; failing: boolean } => {
  switch (objective.kind) {
    case 'survive': {
      const dead = run.phase === 'dead';
      return { value: dead ? copy.live.dead : copy.live.full(Math.round((run.megabytes / run.limitMegabytes) * 100)), failing: dead };
    }
    case 'seconds':
      return { value: format.seconds(run.seconds), failing: run.seconds > objective.max };
    case 'megabytes':
      return { value: format.megabytes(run.peakMegabytes), failing: run.peakMegabytes > objective.max };
    case 'write-trips':
      return { value: format.count(Math.round(run.writeTrips)), failing: run.writeTrips > objective.max };
    case 'connection':
      return { value: format.seconds(run.longestConnectionSeconds), failing: run.longestConnectionSeconds > objective.max };
  }
};

/** Each star shows, while the run goes, how the player is doing on it. */
export const renderLiveObjectives = (text: LabText, root: HTMLElement, challenge: Challenge, run: RunState | null) => {
  root.querySelectorAll<HTMLElement>('[data-objectives] li').forEach((item, index) => {
    const objective = challenge.objectives[index];
    if (objective === undefined) return;
    const { value, failing } = run === null ? { value: '—', failing: false } : liveValue(text, objective, run);
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
export const renderResult = (text: LabText, root: HTMLElement, { challenge, build, outcome, stars, attempts, hasNext }: Result) => {
  const { copy, format } = text;
  const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const survived = outcome.killedBy === null;
  const words = copy.challenges[challenge.id];
  part('[data-result-kicker]').textContent = copy.challengeHeading(challenge.id, words?.title ?? '');
  part('[data-result-stars]').textContent = starsText(stars);
  part('[data-result-title]').textContent = !survived ? copy.result.killed : stars === 3 ? copy.result.perfect : copy.result.partial;
  const values: Record<Objective['kind'], string> = {
    survive: survived ? copy.result.peak(format.megabytes(outcome.peakMegabytes)) : copy.result.logsReviewed(format.count(outcome.logsAnalyzed)),
    seconds: format.seconds(outcome.seconds),
    megabytes: format.megabytes(outcome.peakMegabytes),
    'write-trips': copy.result.trips(format.count(outcome.writeTrips)),
    connection: copy.result.inARow(format.seconds(outcome.longestConnectionSeconds)),
  };
  part('[data-result-objectives]').replaceChildren(
    ...challenge.objectives.map((objective) => {
      const met = isMet(objective, outcome);
      return Object.assign(document.createElement('li'), {
        className: met ? 'is-met' : 'is-missed',
        textContent: `${met ? '★' : '✕'} ${objectiveLabel(text, objective)} · ${survived || objective.kind === 'survive' ? values[objective.kind] : '—'}`,
      });
    }),
  );
  const hint = hintFor(challenge, build, outcome);
  part('[data-result-text]').textContent = hint === null ? (words?.takeaway ?? '') : copy.hints[hint];
  renderComparison(text, part('[data-compare]'), attempts);
  part('[data-next]').hidden = !(survived && hasNext);
  const dialog = part('[data-result]');
  dialog.classList.toggle('is-killed', !survived);
  dialog.classList.toggle('is-perfect', stars === 3);
};

/** The difference between two choices is what the lab teaches: every attempt side by side. */
const renderComparison = ({ copy, format }: LabText, body: HTMLElement, attempts: readonly Attempt[]) => {
  body.replaceChildren(
    ...attempts.map(({ build, batchSize, stars, outcome }, index) => {
      const write = build.write === 'batches' ? copy.result.batchesOf(format.count(batchSize)) : copy.cards[build.write].shortLabel;
      const died = outcome.killedBy !== null;
      const row = document.createElement('tr');
      row.classList.toggle('is-latest', index === 0);
      row.classList.toggle('is-killed', died);
      [
        `${copy.cards[build.read].shortLabel} + ${write}`,
        starsText(stars),
        died ? copy.result.killed : format.megabytes(outcome.peakMegabytes),
        died ? '—' : format.seconds(outcome.seconds),
        died ? '—' : format.count(outcome.queries),
        died ? '—' : format.count(outcome.writeTrips),
      ].forEach((cell) => row.append(Object.assign(document.createElement('td'), { textContent: cell })));
      return row;
    }),
  );
};
