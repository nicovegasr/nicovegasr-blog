import { button } from '../shared/lab-ui';
import { escapeHtml as esc } from '../shared/text';
import type { Names } from './content';
import { scalingNames } from './content';
import { scalingCopy } from './copy';
import { BASE_CAPACITIES, scalingMetrics } from './engine';
import type { ScalingConfig, ScalingState } from './engine';
import { number, teamLabel } from './format';
import type { Trial } from './session';

export function namesDialog(es: boolean, names: Names, currentName: (key: string) => string) {
  const copy = scalingCopy(es),
    defaults = scalingNames(es);
  const field = (key: string, label: string) =>
    `<label>${esc(label)}<input data-rename="${key}" maxlength="64" value="${esc(currentName(key))}" /></label>`;
  return `<p>${copy.namesChangeTheStoryThe}</p><div class="sc-name-fields">${field('api', 'API')}${field('queue', copy.queue)}${field('worker', 'Worker')}${names.steps.map((_, index) => field(`step-${index}`, `${copy.step} ${index + 1}`)).join('')}<details><summary>${copy.namesOfThe24Payments}</summary>${names.jobs.map((_, index) => field(`job-${index}`, defaults.jobs[index]!)).join('')}</details></div>`;
}

export function costDialog(es: boolean, state: ScalingState, config: ScalingConfig) {
  const copy = scalingCopy(es),
    metrics = scalingMetrics(state);
  return `<p>${copy.theseAreTeachingUnitsNot}</p><p><strong>${config.workers} × ${number(metrics.seconds, 1)} s = ${number(metrics.workerCost)} u</strong></p><p>${copy.theOriginalServiceContractIs} ${config.capacities.reduce((total, capacity, step) => total + Math.max(0, capacity - BASE_CAPACITIES[step]!), 0)} × ${number(metrics.seconds, 1)} s = ${number(metrics.extraServiceCost)} u.</p><p>${copy.eachExtraRequestSof(number(metrics.extraRateCost))}</p><p>${copy.efficiencyCompletedPaymentsReservedUnits}</p>`;
}

export function comparisonDialog(es: boolean, history: Trial[]) {
  const copy = scalingCopy(es);
  return history.length
        ? `<div class="sc-comparison"><table><thead><tr>${[copy.workersStripe, copy.time, copy.cumulativeWaiting, copy.cost, copy.paymentsU].map((title) => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${history.map((trial, index) => `<tr><td>${button(`replay:${index}`, `${teamLabel(trial.config)} / ${trial.config.capacities[1]} ${trial.won ? '✓' : ''}`, `aria-label="${copy.prepareThisConfiguration}"`)}<small class="sc-trial-config">${trial.config.capacities.map((limit) => limit).join(' / ')}<br />HTTP ${trial.config.rateLimits[1]} / ${trial.config.rateLimits[3]} ${copy.requestsS}</small></td><td>${number(trial.seconds, 1)} s${trial.rateLimitedStep !== null ? `<small class="sc-rejected-result">429 · ${copy.stepLowercase} ${trial.rateLimitedStep + 1}</small>` : ''}</td><td>${number(trial.waitingSeconds, 1)} s</td><td>${number(trial.cost)} u</td><td>${number(trial.completed / (trial.cost || 1), 3)}</td></tr>`).join('')}</tbody></table></div><p class="sc-call-hint">${copy.theLast8FinishedTrials}</p>`
        : `<p>${copy.finishTrialToStart}</p>`;
}
