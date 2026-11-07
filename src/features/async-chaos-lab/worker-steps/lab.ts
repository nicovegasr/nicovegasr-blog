import type { AchievementId } from '../payment-simulation/achievements';
import type { PaymentLab } from '../payment-simulation/controller';
import type { PaymentLabDefinition } from '../payment-simulation/definition';
import type { ActionKind, SimulationState } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat, totals } from '../payment-simulation/engine';
import { button } from '../shared/lab-ui';
import { escapeHtml } from '../shared/text';
import { stepNature, stepOptions, workerStepsDiagram } from './diagram';
import { workerStepsGuideBeat } from './guide';
import { workerStepsLabels } from './labels';
import { usesCustomSteps, workerStepsFeedback, workerStepsIncidentCall, workerStepsTutorial } from './narration';
import { workerStepsConfig, workerStepsRules } from './rules';
import { workerStepsCopy } from './copy';

function resultLabel(lab: PaymentLab, index: number, count: number) {
  const kind = lab.config.steps[index]?.kind ?? 'append';
  if (kind === 'append')
    return `${count} ${lab.inLocale(count === 1 ? 'registro' : 'registros', count === 1 ? 'record' : 'records')}`;
  if (kind === 'check') return count ? workerStepsCopy(lab.es).validationOk : workerStepsCopy(lab.es).notValidated;
  if (kind === 'set-state') return count ? workerStepsCopy(lab.es).stateSet : workerStepsCopy(lab.es).unchanged;
  return `${count} ${lab.inLocale(count === 1 ? 'efecto externo' : 'efectos externos', count === 1 ? 'external effect' : 'external effects')}`;
}

export function earnedAchievements(state: SimulationState): AchievementId[] {
  const earned: AchievementId[] = [];
  const unprotected =
    state.config.steps.every((step) => !step.remember && !step.providerDeduplication) &&
    state.config.steps.some((step) => !isSafeToRepeat(step.kind));
  if (unprotected && ['lost', 'duplicate'].includes(state.phase)) earned.push('brave');
  if (state.phase === 'duplicate') earned.push('double');
  if (state.phase === 'won' && state.skipped >= 5 && state.wasted === 0) earned.push('efficient');
  return earned;
}

export const workerStepsLab: PaymentLabDefinition = {
  defaultConfig: workerStepsConfig,
  rules: workerStepsRules,
  defaultLabels: workerStepsLabels,
  stepNamesKey: 'steps2',
  firstGuideStage: 'partial',
  diagram: workerStepsDiagram,
  stepDescription: stepNature,
  stepOptions,
  stepState(lab, index, { progress: progress, active, restarting, uncertain, failed }) {
    const state = lab.state;
    return restarting
      ? workerStepsCopy(lab.es).restartingBackToFirstStep
      : uncertain
        ? workerStepsCopy(lab.es).stepUnconfirmedTimeoutAfterRequesting(index + 1)
        : failed
          ? workerStepsCopy(lab.es).stepFailedDidNotComplete(index + 1)
          : active
            ? state.cursor === 'save'
              ? workerStepsCopy(lab.es).actionDoneSavingProgress
              : workerStepsCopy(lab.es).runningNow
            : progress.executions === 0
              ? workerStepsCopy(lab.es).pending
              : `${progress.executions} ${lab.inLocale(progress.executions === 1 ? 'intento' : 'intentos', progress.executions === 1 ? 'attempt' : 'attempts')} · ${resultLabel(lab, index, progress.effects)}${progress.checkpoint ? ' · ✓ ' + workerStepsCopy(lab.es).saved : ''}${progress.skipped ? ' · ' + progress.skipped + ' ↷' : ''}`;
  },
  lessonStage(lab) {
    if (lab.state.phase === 'won') return 'optimize';
    if (
      lab.state.phase === 'duplicate' &&
      lab.state.step === lab.config.steps.length - 1 &&
      isExternal(lab.config.steps[lab.state.step]?.kind ?? 'check')
    )
      return 'email';
    return 'charge';
  },
  applySetting(lab, key, input) {
    const [group, index] = key.split('-'),
      stepIndex = Number(index),
      step = lab.config.steps[stepIndex];
    if (step && group === 'remember') {
      step.remember = (input as HTMLInputElement).checked;
      if (lab.guide !== 'off') {
        if (lab.config.steps.every((step) => step.remember)) lab.guide = 'efficient';
        else if (lab.config.steps[1]?.remember && lab.guide !== 'optimize') lab.guide = 'safe';
        else if (!lab.config.steps[1]?.remember && lab.guide !== 'partial') lab.guide = 'charge';
      }
    }
    if (step && group === 'provider') step.providerDeduplication = (input as HTMLInputElement).checked;
    if (step && group === 'kind' && ['check', 'external', 'set-state', 'notify', 'append'].includes(input.value)) {
      const expanded = [...lab.querySelectorAll<HTMLElement>('.lab-step-editor')].map((panel) =>
        panel.matches(':popover-open'),
      );
      step.kind = input.value as ActionKind;
      step.providerDeduplication = false;
      lab.buildSteps();
      [...lab.querySelectorAll<HTMLElement>('.lab-step-editor')].forEach((panel, index) => {
        if (expanded[index]) panel.showPopover();
      });
      lab.element<HTMLSelectElement>(`[data-setting="kind-${stepIndex}"]`).focus({
        preventScroll: true,
      });
    }
  },
  paintSystem(lab) {
    for (let index = 0; index < lab.config.steps.length; index++)
      lab.element<HTMLInputElement>(`[data-setting="remember-${index}"]`).checked = lab.config.steps[index]!.remember;
  },
  metrics(lab) {
    const state = lab.state,
      counts = totals(state),
      external = state.jobs.reduce(
        (total, job) =>
          total +
          job.steps.reduce(
            (sum, progress, index) => sum + (isExternal(lab.config.steps[index]!.kind) ? progress.effects : 0),
            0,
          ),
        0,
      );
    return /* HTML */ `<span><b>${external}</b> ${workerStepsCopy(lab.es).externalEffects}</span
      ><span><b>${counts.attempts}</b> ${workerStepsCopy(lab.es).attempts}</span
      ><span><b>${counts.skipped}</b> ${workerStepsCopy(lab.es).skippedSteps}</span
      ><span><b>${counts.wasted}</b> ${workerStepsCopy(lab.es).repeatedSteps}</span>`;
  },
  feedback: workerStepsFeedback,
  tutorial: workerStepsTutorial,
  incidentCall: workerStepsIncidentCall,
  guideBeat: workerStepsGuideBeat,
  guideOptionalAction: (lab) =>
    lab.state.phase === 'won' && lab.guide !== 'optimize' && !lab.config.steps.every((step) => step.remember)
      ? button('lesson', workerStepsCopy(lab.es).compareRepeatedWork)
      : '',
  wonOptionalAction: (lab) =>
    lab.guide !== 'off' && !lab.config.steps.every((step) => step.remember)
      ? button('lesson', workerStepsCopy(lab.es).optionalSaveRepeatedWork)
      : '',
  duplicateTitle: (lab) =>
    !usesCustomSteps(lab) && lab.state.step === 1
      ? workerStepsCopy(lab.es).youChargedThemTwice
      : workerStepsCopy(lab.es).onePaymentTwoEffects,
  wonCaption: (lab) => {
    const counts = totals(lab.state);
    return workerStepsCopy(lab.es).attemptsSkippedStepsNoDuplicate(counts.attempts, counts.skipped);
  },
  duplicateFooters: (lab) => [workerStepsCopy(lab.es).firstEffect, workerStepsCopy(lab.es).repeatedEffect],
  interruptedEvidence(lab) {
    const state = lab.state,
      job = state.jobs[Math.max(0, state.active)]!;
    return /* HTML */ `<div class="lab-action-evidence">
        ${job.steps
          .map(
            (progress, index) =>
              /* HTML */ `<article
                class="${index === state.step && state.incident === 'email-uncertain' ? 'is-uncertain' : progress.effects ? 'is-finished' : index === state.step ? 'was-interrupted' : ''}"
              >
                <span class="lab-evidence-step"
                  >${String(index + 1).padStart(2, '0')}
                  <b
                    >${index === state.step && state.incident === 'email-uncertain' ? '?' : progress.effects ? '✓' : index === state.step ? '×' : '○'}</b
                  ></span
                ><strong>${escapeHtml(lab.step(index))}</strong
                ><small
                  >${index === state.step && state.incident === 'email-uncertain' ? workerStepsCopy(lab.es).unconfirmedTimeout : resultLabel(lab, index, progress.effects)}</small
                >
              </article>`,
          )
          .join('')}
      </div>
      <p class="lab-evidence-caption">
        ${escapeHtml(lab.job(job.id - 1))} · ID ${String(job.id).padStart(2, '0')} ·
        ${workerStepsCopy(lab.es).whatAlreadyHappenedStillExists}
      </p>`;
  },
  earnedAchievements,
};
