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
import { queueCopy } from './copy';

function resultLabel(lab: PaymentLab, i: number, count: number) {
  const kind = lab.config.steps[i]?.kind ?? 'append';
  if (kind === 'check')
    return count
      ? i === 0
        ? queueCopy(lab.es).validated
        : queueCopy(lab.es).prepared
      : queueCopy(lab.es).pending;
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
    /* HTML */ `<p class="qs-step-contract">${step.kind === 'append' ? queueCopy(lab.es).only1RecordPerId : queueCopy(lab.es).safeToRepeat}</p>`,
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
        ? queueCopy(lab.es).sameProcesssharedFate
        : queueCopy(lab.es).independentDbsurvivesWorker;
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
        ? queueCopy(lab.es).pendingWorkInsideTheWorker
        : queueCopy(lab.es).pendingWorkSurvivesTheWorker;
    lab.q('[data-protection-note]').textContent = lab.config
      .protectLocalRecord
      ? queueCopy(lab.es).keepOneRowPerId
      : queueCopy(lab.es).eachAttemptCanCreateAnother;
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
    return /* HTML */ `<span><b>${repeatedDeliveries}</b> ${queueCopy(lab.es).redeliveries}</span><span><b>${extraRecords}</b> ${queueCopy(lab.es).extraRecords}</span>`;
  },
  feedback: queueFeedback,
  tutorial: queueTutorial,
  incidentCall: queueIncidentCall,
  guideBeat: queueGuideBeat,
  guideOptionalAction: () => '',
  wonOptionalAction: () => '',
  duplicateTitle: (lab) => queueCopy(lab.es).onePaymentTwoRecords,
  wonCaption: (lab) => {
    const m = totals(lab.state);
    return queueCopy(lab.es).attempts3RecordsOnePer(m.attempts);
  },
  duplicateFooters: (lab) => [
    queueCopy(lab.es).firstRecord,
    queueCopy(lab.es).secondRecord,
  ],
  interruptedEvidence(lab) {
    const s = lab.state,
      j = s.jobs[Math.max(0, s.active)]!;
    return /* HTML */ `<div class="qs-ack-evidence">
      <div>
        <span>${queueCopy(lab.es).paymentId}</span
        ><strong
          >${String(j.id).padStart(2, '0')} · ${esc(lab.job(j.id - 1))}</strong
        >
      </div>
      <div>
        <span>${queueCopy(lab.es).itsRecord}</span
        ><strong
          >${s.incident === 'ack-retry' ? '✓ ' + queueCopy(lab.es).oneRowAlreadyExists : '— ' + queueCopy(lab.es).notRecordedYet}</strong
        >
      </div>
      <div>
        <span>${queueCopy(lab.es).inThedatabase}</span
        ><strong
          >↻
          ${queueCopy(lab.es).availableToRetry}</strong
        >
      </div>
    </div>`;
  },
  earnedAchievements,
};
