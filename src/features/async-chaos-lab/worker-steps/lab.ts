import type { AchievementId } from '../payment-simulation/achievements';
import type { PaymentLab } from '../payment-simulation/controller';
import type { PaymentLabDefinition } from '../payment-simulation/definition';
import type { ActionKind, SimulationState } from '../payment-simulation/engine';
import { isExternal, isSafeToRepeat, totals } from '../payment-simulation/engine';
import { button } from '../shared/lab-ui';
import { escapeHtml as esc } from '../shared/text';
import { stepNature, stepOptions, workerStepsDiagram } from './diagram';
import { workerStepsGuideBeat } from './guide';
import { workerStepsLabels } from './labels';
import { usesCustomSteps, workerStepsFeedback, workerStepsIncidentCall, workerStepsTutorial } from './narration';
import { workerStepsConfig, workerStepsRules } from './rules';
import { workerStepsCopy } from './copy';

function resultLabel(lab: PaymentLab, i: number, count: number) {
  const kind = lab.config.steps[i]?.kind ?? 'append';
  if (kind === 'append')
    return `${count} ${lab.t(count === 1 ? 'registro' : 'registros', count === 1 ? 'record' : 'records')}`;
  if (kind === 'check')
    return count
      ? workerStepsCopy(lab.es).validationOk
      : workerStepsCopy(lab.es).notValidated;
  if (kind === 'set-state')
    return count
      ? workerStepsCopy(lab.es).stateSet
      : workerStepsCopy(lab.es).unchanged;
  return `${count} ${lab.t(count === 1 ? 'efecto externo' : 'efectos externos', count === 1 ? 'external effect' : 'external effects')}`;
}

export function earnedAchievements(s: SimulationState): AchievementId[] {
  const earned: AchievementId[] = [];
  const unprotected =
    s.config.steps.every((step) => !step.remember && !step.providerDeduplication) &&
    s.config.steps.some((step) => !isSafeToRepeat(step.kind));
  if (unprotected && ['lost', 'duplicate'].includes(s.phase)) earned.push('brave');
  if (s.phase === 'duplicate') earned.push('double');
  if (s.phase === 'won' && s.skipped >= 5 && s.wasted === 0) earned.push('efficient');
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
  stepState(lab, i, { progress: st, active, restarting, uncertain, failed }) {
    const s = lab.state;
    return restarting
      ? workerStepsCopy(lab.es).restartingBackToTheFirst
  : uncertain
    ? workerStepsCopy(lab.es).stepUnconfirmedTimeoutAfterRequesting(i + 1)
  : failed
    ? workerStepsCopy(lab.es).stepFailedDidNotComplete(i + 1)
  : active
    ? s.cursor === 'save'
      ? workerStepsCopy(lab.es).actionDoneSavingProgress
      : workerStepsCopy(lab.es).runningNow
    : st.executions === 0
      ? workerStepsCopy(lab.es).pending
      : `${st.executions} ${lab.t(st.executions === 1 ? 'intento' : 'intentos', st.executions === 1 ? 'attempt' : 'attempts')} · ${resultLabel(lab, i, st.effects)}${st.checkpoint ? ' · ✓ ' + workerStepsCopy(lab.es).saved : ''}${st.skipped ? ' · ' + st.skipped + ' ↷' : ''}`;
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
      i = Number(index),
      step = lab.config.steps[i];
    if (step && group === 'remember') {
      step.remember = (input as HTMLInputElement).checked;
      if (lab.guide !== 'off') {
        if (lab.config.steps.every((s) => s.remember))
          lab.guide = 'efficient';
        else if (lab.config.steps[1]?.remember && lab.guide !== 'optimize')
          lab.guide = 'safe';
        else if (!lab.config.steps[1]?.remember && lab.guide !== 'partial')
          lab.guide = 'charge';
      }
    }
    if (step && group === 'provider')
      step.providerDeduplication = (input as HTMLInputElement).checked;
    if (
      step &&
      group === 'kind' &&
      ['check', 'external', 'set-state', 'notify', 'append'].includes(
        input.value,
      )
    ) {
      const expanded = [
        ...lab.querySelectorAll<HTMLElement>(
          '.qs-step-editor',
        ),
      ].map((panel) => panel.matches(':popover-open'));
      step.kind = input.value as ActionKind;
      step.providerDeduplication = false;
      lab.buildSteps();
      [
        ...lab.querySelectorAll<HTMLElement>(
          '.qs-step-editor',
        ),
      ].forEach((panel, index) => { if (expanded[index]) panel.showPopover(); });
      lab.q<HTMLSelectElement>(`[data-setting="kind-${i}"]`).focus({
        preventScroll: true,
      });
    }
  },
  paintSystem(lab) {
    for (let i = 0; i < lab.config.steps.length; i++)
      lab.q<HTMLInputElement>(`[data-setting="remember-${i}"]`).checked =
        lab.config.steps[i]!.remember;
  },
  metrics(lab) {
    const s = lab.state,
      m = totals(s),
      external = s.jobs.reduce(
        (n, j) =>
          n +
          j.steps.reduce(
            (sum, st, i) =>
              sum + (isExternal(lab.config.steps[i]!.kind) ? st.effects : 0),
            0,
          ),
        0,
      );
    return /* HTML */ `<span><b>${external}</b> ${workerStepsCopy(lab.es).externalEffects}</span><span><b>${m.attempts}</b> ${workerStepsCopy(lab.es).attempts}</span><span><b>${m.skipped}</b> ${workerStepsCopy(lab.es).skippedSteps}</span><span><b>${m.wasted}</b> ${workerStepsCopy(lab.es).repeatedSteps}</span>`;
  },
  feedback: workerStepsFeedback,
  tutorial: workerStepsTutorial,
  incidentCall: workerStepsIncidentCall,
  guideBeat: workerStepsGuideBeat,
  guideOptionalAction: (lab) =>
    lab.state.phase === 'won' &&
    lab.guide !== 'optimize' &&
    !lab.config.steps.every((step) => step.remember)
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
    const m = totals(lab.state);
    return workerStepsCopy(lab.es).attemptsSkippedStepsNoDuplicate(m.attempts, m.skipped);
  },
  duplicateFooters: (lab) => [
    workerStepsCopy(lab.es).firstEffect,
    workerStepsCopy(lab.es).repeatedEffect,
  ],
  interruptedEvidence(lab) {
    const s = lab.state,
      j = s.jobs[Math.max(0, s.active)]!;
      return /* HTML */ `<div class="qs-action-evidence">
          ${j.steps
            .map(
              (st, i) =>
                /* HTML */ `<article
                  class="${i === s.step && s.incident === 'email-uncertain' ? 'is-uncertain' : st.effects ? 'is-finished' : i === s.step ? 'was-interrupted' : ''}"
                >
                  <span class="qs-evidence-step"
                    >${String(i + 1).padStart(2, '0')}
                    <b>${i === s.step && s.incident === 'email-uncertain' ? '?' : st.effects ? '✓' : i === s.step ? '×' : '○'}</b></span
                  ><strong>${esc(lab.step(i))}</strong
                  ><small>${i === s.step && s.incident === 'email-uncertain' ? workerStepsCopy(lab.es).unconfirmedTimeout : resultLabel(lab, i, st.effects)}</small>
                </article>`,
            )
            .join('')}
        </div>
        <p class="qs-evidence-caption">
          ${esc(lab.job(j.id - 1))} · ID ${String(j.id).padStart(2, '0')} ·
          ${workerStepsCopy(lab.es).whatAlreadyHappenedStillExists}
        </p>`;
  },
  earnedAchievements,
};
