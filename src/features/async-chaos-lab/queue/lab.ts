import type { AchievementId } from '../payment-simulation/achievements';
import type { PaymentLab } from '../payment-simulation/controller';
import type { PaymentLabDefinition } from '../payment-simulation/definition';
import type { SimulationState } from '../payment-simulation/engine';
import { totals } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml as esc } from '../shared/text';
import { queueDiagram } from './diagram';
import { queueGuideBeat } from './guide';
import { queueLabels } from './labels';
import { queueFeedback, queueIncidentCall, queueTutorial } from './narration';
import { queueConfig, queueRules } from './rules';

function resultLabel(lab: PaymentLab, i: number, count: number) {
  const kind = lab.config.steps[i]?.kind ?? 'append';
  if (kind === 'check')
    return count
      ? i === 0
        ? lab.t('Validado', 'Validated')
        : lab.t('Preparado', 'Prepared')
      : lab.t('Pendiente', 'Pending');
  return `${count} ${lab.t(count === 1 ? 'registro' : 'registros', count === 1 ? 'record' : 'records')}`;
}

export function earnedAchievements(s: SimulationState): AchievementId[] {
  const earned: AchievementId[] = [];
  const unprotected = s.config.storage === 'ram' && !s.config.protectLocalRecord;
  if (unprotected && ['lost', 'duplicate'].includes(s.phase)) earned.push('brave');
  if (s.phase === 'duplicate') earned.push('double');
  if (s.config.storage === 'db' && s.events.some((e) => e.kind === 'recovered' && e.job === 2))
    earned.push('survivor');
  if (s.phase === 'won' && s.config.protectLocalRecord) earned.push('identity');
  return earned;
}

export const queueLab: PaymentLabDefinition = {
  defaultConfig: queueConfig,
  rules: queueRules,
  defaultLabels: queueLabels,
  stepNamesKey: 'steps1',
  firstGuideStage: 'ram',
  diagram: queueDiagram,
  stepDescription: (lab, step) =>
    /* HTML */ `<p class="qs-step-contract">${step.kind === 'append' ? lab.t('Solo 1 registro por ID.', 'Only 1 record per ID.') : lab.t('Repetirlo es seguro.', 'Safe to repeat.')}</p>`,
  stepOptions: () => '',
  stepState: (lab, i, { progress, shown, active }) =>
    active
      ? `▶ ID ${String(shown + 1).padStart(2, '0')} · ${lab.job(shown)}`
      : `${resultLabel(lab, i, progress.effects)}${progress.skipped ? ' · ' + progress.skipped + ' ↷' : ''}`,
  lessonStage: (lab) => (lab.state.phase === 'lost' ? 'storage' : 'identity'),
  applySetting(lab, key, input) {
    if (key === 'storage') {
      lab.config.storage = input.value === 'db' ? 'db' : 'ram';
      lab.syncStorageName();
      if (lab.guide !== 'off')
        lab.guide =
          lab.config.storage === 'ram'
            ? 'ram'
            : lab.config.protectLocalRecord
              ? 'safe'
              : 'durable';
    }
    if (key === 'protect') {
      lab.config.protectLocalRecord = input.value === 'on';
      if (lab.guide !== 'off')
        lab.guide =
          lab.config.storage === 'ram'
            ? 'ram'
            : lab.config.protectLocalRecord
              ? 'safe'
              : 'identity';
    }
  },
  paintSystem(lab) {
    lab.q('[data-process]').className =
      `qs-process ${lab.config.storage === 'ram' ? 'is-ram' : 'is-durable'}`;
    lab.q('[data-boundary]').textContent =
      lab.config.storage === 'ram'
        ? lab.t(
            'MISMO PROCESO · comparten la caída',
            'SAME PROCESS · shared fate',
          )
        : lab.t(
            'BDD INDEPENDIENTE · sobrevive al worker',
            'INDEPENDENT DB · survives worker',
          );
    lab.replace(
      '[data-store-figure]',
      labFigure(lab.config.storage === 'ram' ? 'ram' : 'db'),
    );
    lab.q<HTMLSelectElement>('[data-setting=storage]').value =
      lab.config.storage;
    lab.q<HTMLSelectElement>('[data-setting=protect]').value = lab.config
      .protectLocalRecord
      ? 'on'
      : 'off';
    lab.q('[data-storage-note]').textContent =
      lab.config.storage === 'ram'
        ? lab.t(
            'Pendientes dentro del worker.',
            'Pending work inside the worker.',
          )
        : lab.t(
            'Los pendientes sobreviven al worker.',
            'Pending work survives the worker.',
          );
    lab.q('[data-protection-note]').textContent = lab.config
      .protectLocalRecord
      ? lab.t('Conserva una sola fila por ID.', 'Keep one row per ID.')
      : lab.t(
          'Cada intento puede crear otra fila.',
          'Each attempt can create another row.',
        );
  },
  metrics(lab) {
    const s = lab.state,
      repeatedDeliveries = s.jobs.reduce(
        (n, j) => n + Math.max(0, j.attempt - 1),
        0,
      ),
      extraRecords = s.jobs.reduce(
        (n, j) =>
          n +
          j.steps.reduce(
            (sum, st, i) =>
              sum +
              (s.config.steps[i]?.kind === 'append'
                ? Math.max(0, st.effects - 1)
                : 0),
            0,
          ),
        0,
      );
    return /* HTML */ `<span><b>${repeatedDeliveries}</b> ${lab.t('reentregas', 'redeliveries')}</span><span><b>${extraRecords}</b> ${lab.t('registros de más', 'extra records')}</span>`;
  },
  feedback: queueFeedback,
  tutorial: queueTutorial,
  incidentCall: queueIncidentCall,
  guideBeat: queueGuideBeat,
  guideOptionalAction: () => '',
  wonOptionalAction: () => '',
  duplicateTitle: (lab) => lab.t('Un pago. Dos registros.', 'One payment. Two records.'),
  wonCaption: (lab) => {
    const m = totals(lab.state);
    return lab.t(`${m.attempts} intentos · 3 registros · uno por ID`, `${m.attempts} attempts · 3 records · one per ID`);
  },
  duplicateFooters: (lab) => [
    lab.t('Primer registro', 'First record'),
    lab.t('Segundo registro', 'Second record'),
  ],
  interruptedEvidence(lab) {
    const s = lab.state,
      j = s.jobs[Math.max(0, s.active)]!;
    return /* HTML */ `<div class="qs-ack-evidence">
      <div>
        <span>${lab.t('ID DEL PAGO', 'PAYMENT ID')}</span
        ><strong
          >${String(j.id).padStart(2, '0')} · ${esc(lab.job(j.id - 1))}</strong
        >
      </div>
      <div>
        <span>${lab.t('SU REGISTRO', 'ITS RECORD')}</span
        ><strong
          >${s.incident === 'ack-retry' ? '✓ ' + lab.t('Ya existe una fila', 'One row already exists') : '— ' + lab.t('Todavía sin registrar', 'Not recorded yet')}</strong
        >
      </div>
      <div>
        <span>${lab.t('EN LA BASE DE DATOS', 'IN THE DATABASE')}</span
        ><strong
          >↻
          ${lab.t('Disponible para reintentar', 'Available to retry')}</strong
        >
      </div>
    </div>`;
  },
  earnedAchievements,
};
