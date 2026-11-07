import type { AchievementId } from '../payment-simulation/achievements';
import type { PaymentLabView } from '../payment-simulation/lab-view';
import type { PaymentLabDefinition } from '../payment-simulation/definition';
import type { SimulationState } from '../payment-simulation/engine';
import { totals } from '../payment-simulation/engine';
import { labFigure } from '../shared/figures';
import { escapeHtml } from '../shared/text';
import { queueDiagram } from './diagram';
import { queueGuideBeat } from './guide';
import { queueLabels } from './labels';
import { queueFeedback, queueIncidentCall, queueTutorial } from './narration';
import { queueConfig, queueRules } from './rules';
import { queueCopy } from './copy';

function resultLabel(lab: PaymentLabView, index: number, count: number) {
  const kind = lab.config.steps[index]?.kind ?? 'append';
  if (kind === 'check')
    return count
      ? index === 0
        ? queueCopy(lab.locale).validated
        : queueCopy(lab.locale).prepared
      : queueCopy(lab.locale).pending;
  return queueCopy(lab.locale).records(count);
}

export function earnedAchievements(state: SimulationState): AchievementId[] {
  const earned: AchievementId[] = [];
  const unprotected = state.config.storage === 'ram' && !state.config.protectLocalRecord;
  if (unprotected && ['lost', 'duplicate'].includes(state.phase)) earned.push('brave');
  if (state.phase === 'duplicate') earned.push('double');
  if (state.config.storage === 'db' && state.events.some((event) => event.kind === 'recovered' && event.job === 2))
    earned.push('survivor');
  if (state.phase === 'won' && state.config.protectLocalRecord) earned.push('identity');
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
    /* HTML */ `<p class="lab-step-contract">
      ${step.kind === 'append' ? queueCopy(lab.locale).onlyOneRecordPerId : queueCopy(lab.locale).safeToRepeat}
    </p>`,
  stepOptions: () => '',
  stepState: (lab, index, { progress, shown, active }) =>
    active
      ? `▶ ID ${String(shown + 1).padStart(2, '0')} · ${lab.job(shown)}`
      : `${resultLabel(lab, index, progress.effects)}${progress.skipped ? ' · ' + progress.skipped + ' ↷' : ''}`,
  lessonStage: (lab) => (lab.state.phase === 'lost' ? 'storage' : 'identity'),
  applySetting(lab, key, input) {
    if (key === 'storage') {
      lab.config.storage = input.value === 'db' ? 'db' : 'ram';
      lab.syncStorageName();
      if (lab.guide !== 'off')
        lab.guide = lab.config.storage === 'ram' ? 'ram' : lab.config.protectLocalRecord ? 'safe' : 'durable';
    }
    if (key === 'protect') {
      lab.config.protectLocalRecord = input.value === 'on';
      if (lab.guide !== 'off')
        lab.guide = lab.config.storage === 'ram' ? 'ram' : lab.config.protectLocalRecord ? 'safe' : 'identity';
    }
  },
  paintSystem(lab) {
    lab.element('[data-process]').className = `lab-process ${lab.config.storage === 'ram' ? 'is-ram' : 'is-durable'}`;
    lab.element('[data-boundary]').textContent =
      lab.config.storage === 'ram'
        ? queueCopy(lab.locale).sameProcessSharedFate
        : queueCopy(lab.locale).independentDatabaseSurvivesWorker;
    lab.replace('[data-store-figure]', labFigure(lab.config.storage === 'ram' ? 'ram' : 'db'));
    lab.element<HTMLSelectElement>('[data-setting=storage]').value = lab.config.storage;
    lab.element<HTMLSelectElement>('[data-setting=protect]').value = lab.config.protectLocalRecord ? 'on' : 'off';
    lab.element('[data-storage-note]').textContent =
      lab.config.storage === 'ram'
        ? queueCopy(lab.locale).pendingWorkInsideTheWorker
        : queueCopy(lab.locale).pendingWorkSurvivesTheWorker;
    lab.element('[data-protection-note]').textContent = lab.config.protectLocalRecord
      ? queueCopy(lab.locale).keepOneRowPerId
      : queueCopy(lab.locale).eachAttemptCanCreateAnotherRow;
  },
  metrics(lab) {
    const state = lab.state,
      repeatedDeliveries = state.jobs.reduce((total, job) => total + Math.max(0, job.attempt - 1), 0),
      extraRecords = state.jobs.reduce(
        (total, job) =>
          total +
          job.steps.reduce(
            (sum, progress, index) =>
              sum + (state.config.steps[index]?.kind === 'append' ? Math.max(0, progress.effects - 1) : 0),
            0,
          ),
        0,
      );
    return /* HTML */ `<span><b>${repeatedDeliveries}</b> ${queueCopy(lab.locale).redeliveries}</span
      ><span><b>${extraRecords}</b> ${queueCopy(lab.locale).extraRecords}</span>`;
  },
  feedback: queueFeedback,
  tutorial: queueTutorial,
  incidentCall: queueIncidentCall,
  guideBeat: queueGuideBeat,
  guideOptionalAction: () => '',
  wonOptionalAction: () => '',
  duplicateTitle: (lab) => queueCopy(lab.locale).onePaymentTwoRecords,
  wonCaption: (lab) => {
    const counts = totals(lab.state);
    return queueCopy(lab.locale).attemptsThreeRecordsOnePerId(counts.attempts);
  },
  duplicateFooters: (lab) => [queueCopy(lab.locale).firstRecord, queueCopy(lab.locale).secondRecord],
  interruptedEvidence(lab) {
    const state = lab.state,
      job = state.jobs[Math.max(0, state.active)]!;
    return /* HTML */ `<div class="lab-ack-evidence">
      <div>
        <span>${queueCopy(lab.locale).paymentId}</span
        ><strong>${String(job.id).padStart(2, '0')} · ${escapeHtml(lab.job(job.id - 1))}</strong>
      </div>
      <div>
        <span>${queueCopy(lab.locale).itsRecord}</span
        ><strong
          >${state.incident === 'ack-retry' ? '✓ ' + queueCopy(lab.locale).oneRowAlreadyExists : '— ' + queueCopy(lab.locale).notRecordedYet}</strong
        >
      </div>
      <div>
        <span>${queueCopy(lab.locale).inTheDatabase}</span><strong>↻ ${queueCopy(lab.locale).availableToRetry}</strong>
      </div>
    </div>`;
  },
  earnedAchievements,
};
