import { objectiveLabel } from './briefing';
import type { Challenge } from './challenges';
import { formatAmount, formatSeconds } from './format';
import type { Progress } from './progress';
import { starsText } from './result-view';

/** The top bar and the stage labels: which challenge, its stars so far, its three objectives and its data. */
export const renderHud = (root: HTMLElement, challenge: Challenge, progress: Progress) => {
  const part = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const { id, title, mission, objectives, scenario, period } = challenge;
  part('[data-title]').textContent = `Reto ${id} · ${title}`;
  part('[data-mission]').textContent = mission;
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
      item.querySelector('[data-label]')!.textContent = objectiveLabel(objective);
      return item;
    }),
  );
  const memoryGoal = objectives.find((objective) => objective.kind === 'megabytes');
  const goalMarker = part('[data-memory-goal]');
  goalMarker.hidden = memoryGoal === undefined;
  if (memoryGoal !== undefined) goalMarker.style.left = `${(memoryGoal.max / scenario.memoryLimitMegabytes) * 100}%`;
  part('[data-shelf-caption]').textContent =
    `${formatAmount(scenario.logs)}${period ? ` · ${period}` : ''}${scenario.querySeconds >= 1 ? ` · consulta de ${formatSeconds(scenario.querySeconds)}` : ''}`;
};
