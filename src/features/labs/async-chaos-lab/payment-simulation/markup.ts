import { JOB_COUNT, PLAYBACK_SPEEDS } from './engine';
import { escapeHtml } from '../shared/text';
import { button } from '../shared/lab-ui';
import { actorMarkup } from './worker-actor';
import { achievements } from './achievements';
import type { AchievementId } from './achievements';
import type { PaymentLabView } from './lab-view';

// Templates render data and never advance the engine.
export function labShell(lab: PaymentLabView) {
  return /* HTML */ ` <aside class="lab-feedback" data-feedback role="status" aria-live="polite"></aside>
    <div class="lab-stage">
      <div class="lab-system">${lab.definition.diagram(lab)}</div>
      <aside
        class="lab-tutorial"
        id="lab-guide"
        data-guide
        tabindex="-1"
        aria-label="${lab.copy.guidedWalkthrough}"
      ></aside>
    </div>
    <div class="lab-dock" aria-label="${lab.copy.simulationControls}">
      <div class="lab-transport">
        ${button('play', lab.copy.start)}<button
          type="button"
          class="lab-dock-icon"
          data-action="reset"
          aria-label="${lab.copy.resetWalkthrough}"
          title="${lab.copy.reset}"
        >
          <span aria-hidden="true">↺</span>
        </button>
      </div>
      <div class="lab-speeds" role="group" aria-label="${lab.copy.playbackSpeed}">
        ${PLAYBACK_SPEEDS.map((speed) => button(`speed:${speed}`, `×${speed}`).replace('<button ', `<button aria-pressed="${speed === lab.speed}" `)).join('')}
      </div>
      <div class="lab-progress" aria-label="${lab.copy.completedPayments}">
        <div class="lab-progress-dots" aria-hidden="true">
          ${Array.from({ length: JOB_COUNT }, (_, index) => /* HTML */ `<span data-progress="${index}"></span>`).join('')}
        </div>
        <span class="lab-score" data-score>0/${JOB_COUNT}</span>
      </div>
      <div class="lab-tools">
        <button type="button" data-action="guide" aria-label="${lab.copy.openTutorial}" title="${lab.copy.tutorial}">
          <span class="lab-tool-symbol" aria-hidden="true">?</span
          ><span class="lab-tool-label" data-tutorial-label>${lab.copy.tutorial}</span>
        </button>
      </div>
    </div>
    <div class="lab-result-metrics" data-results aria-label="${lab.copy.trialMetrics}"></div>
    <details class="lab-achievements">
      <summary data-achievement-summary></summary>
      <p>${lab.copy.achievementsForThisBrowserSession}</p>
      <div data-achievements></div>
    </details>
    <aside class="lab-toast" data-toast role="status" aria-live="polite"></aside>
    <dialog
      class="lab-outcome"
      data-outcome
      aria-labelledby="lab-outcome-title"
      aria-describedby="lab-outcome-text"
    ></dialog>`;
}

export function editor(key: string, value: string, label: string) {
  return /* HTML */ `<span class="lab-editable"
    ><strong data-display-label="${key}">${escapeHtml(value)}</strong
    ><input
      class="lab-name"
      type="text"
      data-label="${key}"
      value="${escapeHtml(value)}"
      maxlength="64"
      aria-label="${escapeHtml(label)}"
      spellcheck="false"
  /></span>`;
}

export function jobRows(lab: PaymentLabView) {
  return lab.labels.jobs
    .map(
      (value, index) =>
        /* HTML */ `<div class="lab-job" data-job-row="${index}">
          ${button('inspect:' + index, String(index + 1).padStart(2, '0'))}
          <div>
            ${editor('job-' + index, value, lab.copy.paymentName + ' ' + (index + 1))}<small
              data-job-status="${index}"
            ></small>
          </div>
          <span class="lab-job-icon" data-job-icon="${index}">○</span>
        </div>`,
    )
    .join('');
}

export function namingControl(lab: PaymentLabView) {
  return /* HTML */ `<div class="lab-edit-controls">
    <button
      type="button"
      class="lab-rename-button"
      data-action="personalize"
      aria-label="${lab.copy.editNames}"
      title="${lab.copy.editNames}"
    >
      <span class="lab-tool-symbol" aria-hidden="true">✎</span
      ><span class="lab-rename-label" data-personalize-label>${lab.copy.names}</span>
    </button>
  </div>`;
}

export function workerJourney(lab: PaymentLabView) {
  return /* HTML */ `<div class="lab-worker-journey" data-worker-journey>
    <div class="lab-actor-track">
      <div class="lab-actor-stations" aria-hidden="true">
        ${lab.config.steps.map((_, index) => `<span data-actor-station="${index}">${String(index + 1).padStart(2, '0')}</span>`).join('')}
      </div>
      ${actorMarkup()}
    </div>
    <p class="lab-actor-caption" data-actor-caption></p>
  </div>`;
}

export function stepCards(lab: PaymentLabView) {
  return lab.config.steps
    .map(
      (step, index) =>
        /* HTML */ `<article class="lab-step" data-step-card="${index}">
          <div class="lab-step-heading">
            <span class="lab-step-number">${String(index + 1).padStart(2, '0')}</span
            >${editor('step-' + index, lab.step(index), lab.copy.stepName + ' ' + (index + 1))}<span
              data-step-icon="${index}"
              >○</span
            >
          </div>
          ${lab.definition.stepDescription(lab, step, index)}
          <p class="lab-step-state" data-step-state="${index}"></p>
          ${lab.definition.stepOptions(lab, step, index)}
        </article>`,
    )
    .join('');
}

export function achievementList(lab: PaymentLabView, unlocked: ReadonlySet<AchievementId>) {
  return achievements
    .map((achievement) => {
      const [title, description] = lab.es ? achievement.es : achievement.en;
      return /* HTML */ `<article class="${unlocked.has(achievement.id) ? 'is-unlocked' : ''}">
        <span aria-hidden="true">${unlocked.has(achievement.id) ? '✦' : '◇'}</span>
        <div>
          <h3>
            ${escapeHtml(title)}${unlocked.has(achievement.id) ? /* HTML */ ` <small>· ${lab.copy.unlocked}</small>` : ''}
          </h3>
          <p>${escapeHtml(description)}</p>
        </div>
      </article>`;
    })
    .join('');
}

export function achievementToast(lab: PaymentLabView) {
  if (!lab.notices.length) return '';
  return /* HTML */ `<span class="lab-eyebrow">✦ ${lab.copy.achievementUnlockedToast}</span>${lab.notices
      .map((id) => {
        const achievement = achievements.find((candidate) => candidate.id === id)!;
        const [title, description] = lab.es ? achievement.es : achievement.en;
        return /* HTML */ `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small>`;
      })
      .join('')}${button('toast-close', lab.copy.gotIt)}`;
}
