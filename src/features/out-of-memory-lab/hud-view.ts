import { objectiveLabel } from './briefing';
import type { Challenge } from './challenges';
import type { LabText } from './lab-text';
import type { Progress } from './progress';
import { starsText } from './result-view';

/** The top bar and the stage labels: which challenge, its stars so far, its three objectives and its data. */
export const renderHud = (text: LabText, root: HTMLElement, challenge: Challenge, progress: Progress) => {
  const { copy, format } = text;
  const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const { id, objectives, scenario } = challenge;
  const words = copy.challenges[id];
  part('[data-title]').textContent = copy.challengeHeading(id, words?.title ?? '');
  part('[data-mission]').textContent = words?.mission ?? '';
  root.querySelectorAll<HTMLButtonElement>('[data-challenge]').forEach((button) => {
    const challengeId = Number(button.dataset.challenge);
    if (challengeId === id) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.querySelector('[data-stars]')!.textContent = starsText(progress.stars[challengeId] ?? 0);
  });
  part('[data-objectives]').replaceChildren(
    ...objectives.map((objective) => {
      const item = document.createElement('li');
      item.dataset.objective = objective.kind;
      item.innerHTML = '<span class="oom-objective-mark" data-mark>☆</span><span class="oom-objective-label" data-label></span><span class="oom-objective-value" data-value>—</span>';
      item.querySelector('[data-label]')!.textContent = objectiveLabel(text, objective);
      return item;
    }),
  );
  const memoryGoal = objectives.find((objective) => objective.kind === 'megabytes');
  const goalMarker = part('[data-memory-goal]');
  goalMarker.hidden = memoryGoal === undefined;
  if (memoryGoal !== undefined) goalMarker.style.left = `${(memoryGoal.max / scenario.memoryLimitMegabytes) * 100}%`;
  const period = words?.period;
  const query = scenario.querySeconds >= 1 ? ` · ${copy.facts.query(format.seconds(scenario.querySeconds))}` : '';
  part('[data-shelf-caption]').textContent = `${format.amount(scenario.logs)}${period ? ` · ${period}` : ''}${query}`;
};
