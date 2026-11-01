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

function resultLabel(lab: PaymentLab, i: number, count: number) {
  const kind = lab.config.steps[i]?.kind ?? 'append';
  if (kind === 'append')
    return `${count} ${lab.t(count === 1 ? 'registro' : 'registros', count === 1 ? 'record' : 'records')}`;
  if (kind === 'check')
    return count
      ? lab.t('validación OK', 'validation OK')
      : lab.t('sin validar', 'not validated');
  if (kind === 'set-state')
    return count
      ? lab.t('estado fijado', 'state set')
      : lab.t('sin modificar', 'unchanged');
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
      ? lab.t('↻ Reiniciando · volvemos al primer paso del mismo pago', '↻ Restarting · back to the first step of the same payment')
  : uncertain
    ? lab.t(`? Paso ${i + 1} sin confirmar · timeout tras solicitar el envío`, `? Step ${i + 1} unconfirmed · timeout after requesting the send`)
  : failed
    ? lab.t(
        `× Paso ${i + 1} falló · no llegó a completarse`,
        `× Step ${i + 1} failed · did not complete`,
      )
  : active
    ? s.cursor === 'save'
      ? lab.t(
          '✓ Acción hecha · guardando avance',
          '✓ Action done · saving progress',
        )
      : lab.t('▶ Ejecutando ahora', '▶ Running now')
    : st.executions === 0
      ? lab.t('Pendiente', 'Pending')
      : `${st.executions} ${lab.t(st.executions === 1 ? 'intento' : 'intentos', st.executions === 1 ? 'attempt' : 'attempts')} · ${resultLabel(lab, i, st.effects)}${st.checkpoint ? ' · ✓ ' + lab.t('guardado', 'saved') : ''}${st.skipped ? ' · ' + st.skipped + ' ↷' : ''}`;
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
    return /* HTML */ `<span><b>${external}</b> ${lab.t('efectos externos', 'external effects')}</span><span><b>${m.attempts}</b> ${lab.t('intentos', 'attempts')}</span><span><b>${m.skipped}</b> ${lab.t('pasos saltados', 'skipped steps')}</span><span><b>${m.wasted}</b> ${lab.t('pasos repetidos', 'repeated steps')}</span>`;
  },
  feedback: workerStepsFeedback,
  tutorial: workerStepsTutorial,
  incidentCall: workerStepsIncidentCall,
  guideBeat: workerStepsGuideBeat,
  guideOptionalAction: (lab) =>
    lab.state.phase === 'won' &&
    lab.guide !== 'optimize' &&
    !lab.config.steps.every((step) => step.remember)
      ? button('lesson', lab.t('Comparar el trabajo repetido', 'Compare repeated work'))
      : '',
  wonOptionalAction: (lab) =>
    lab.guide !== 'off' && !lab.config.steps.every((step) => step.remember)
      ? button('lesson', lab.t('Opcional: ahorrar trabajo', 'Optional: save repeated work'))
      : '',
  duplicateTitle: (lab) =>
    !usesCustomSteps(lab) && lab.state.step === 1
      ? lab.t('Le has cobrado dos veces.', 'You charged them twice.')
      : lab.t('Un pago. Dos efectos.', 'One payment. Two effects.'),
  wonCaption: (lab) => {
    const m = totals(lab.state);
    return lab.t(`${m.attempts} intentos · ${m.skipped} pasos saltados · ningún resultado duplicado`, `${m.attempts} attempts · ${m.skipped} skipped steps · no duplicate results`);
  },
  duplicateFooters: (lab) => [
    lab.t('Primer efecto', 'First effect'),
    lab.t('Efecto repetido', 'Repeated effect'),
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
                  ><small>${i === s.step && s.incident === 'email-uncertain' ? lab.t('Sin confirmar · timeout', 'Unconfirmed · timeout') : resultLabel(lab, i, st.effects)}</small>
                </article>`,
            )
            .join('')}
        </div>
        <p class="qs-evidence-caption">
          ${esc(lab.job(j.id - 1))} · ID ${String(j.id).padStart(2, '0')} ·
          ${lab.t('lo que ya ocurrió sigue existiendo', 'what already happened still exists')}
        </p>`;
  },
  earnedAchievements,
};
