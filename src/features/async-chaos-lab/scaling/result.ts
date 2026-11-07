import { button } from '../shared/lab-ui';
import { outcomeShell } from '../shared/outcome-shell';
import { escapeHtml } from '../shared/text';
import type { Names } from './content';
import { scalingCopy } from './copy';
import { PAYMENT_COUNT, scalingMetrics, scalingVerdict, TARGET_COST, TARGET_SECONDS } from './engine';
import type { ScalingConfig, ScalingState } from './engine';
import { number, stepWithMostWaiting, teamLabel } from './format';
import type { Trial } from './session';

export type ResultContext = {
  es: boolean;
  state: ScalingState;
  config: ScalingConfig;
  names: Names;
  history: Trial[];
  awards: string;
};

export function rateLimitScene(
  { es, state, config, names, history }: ResultContext,
  rejection: NonNullable<ScalingState['rateLimit']>,
) {
  const copy = scalingCopy(es);
  const metrics = scalingMetrics(state),
    step = rejection.step;
  return outcomeShell({
    es: es,
    trial: history.length,
    fatal: true,
    kicker: copy.trialStoppedHttp429,
    title: copy.slotsWereFreeQuotaRanOut,
    evidence: `<div class="scaling-rate-evidence"><strong>HTTP 429</strong><p>${escapeHtml(names.steps[step]!)} · ${escapeHtml(names.jobs[rejection.job - 1]!)}</p><p>${copy.requestsAcceptedInThisSecond(state.requestsInWindow[step], rejection.limit, metrics.steps[step]!.active.length, config.capacities[step])}</p></div>`,
    text: copy.theProviderRejectedThisRequest(rejection.limit, number(rejection.retryAfterSeconds, 1)),
    actions: button('close', copy.reviewMySystem, 'data-primary'),
    dismissAction: 'close',
    awards: '',
  });
}

export function trialResult({ es, state, config, names, history, awards }: ResultContext) {
  const copy = scalingCopy(es);
  const metrics = scalingMetrics(state),
    verdict = scalingVerdict(state);
  const title = verdict.won
    ? copy.nowWeAreOnTime
    : !verdict.fast
      ? copy.theyArrivedLastOnesWaitedTooLong
      : copy.theyArrivedAtTooHighCost;
  const previous = history.slice(0, -1).findLast((trial) => trial.completed === PAYMENT_COUNT);
  const currentResult = `<div><small>${copy.thisTrial} · ${teamLabel(config)}</small><strong>${number(metrics.seconds, 1)} s</strong><span>${number(metrics.throughput, 2)} ${copy.paymentsPerSecond} · ${number(metrics.cost)} u</span></div>`;
  const comparison = previous
    ? `<div class="scaling-before-after"><div><small>${copy.yourPreviousTrial} · ${teamLabel(previous.config)}</small><strong>${number(previous.seconds, 1)} s</strong><span>${number(previous.completed / previous.seconds, 2)} ${copy.paymentsPerSecond} · ${number(previous.cost)} u</span></div><span aria-hidden="true">→</span>${currentResult}</div>`
    : `<div class="scaling-before-after scaling-first-result">${currentResult}</div><p class="scaling-first-trial">${copy.thisIsYourFirstCompletedTrial}</p>`;
  const busiestWait = stepWithMostWaiting(state.waitTicks);
  const waitingWhere = busiestWait === null ? '' : copy.mostWaitingHappenedAt(names.steps[busiestWait]!);
  const flags = [
    [verdict.fast, `≤ ${TARGET_SECONDS} s`],
    [verdict.economical, `≤ ${TARGET_COST} u`],
    [verdict.safe, copy.oneEffectPerStep],
  ] as const;
  return {
    title,
    body: `<p class="scaling-result-label">${verdict.won ? copy.missionComplete : copy.trialCompleteAdjustSystem}</p>${comparison}<div class="scaling-checks">${flags.map(([ok, label]) => `<span data-ok="${ok}">${ok ? '✓' : '×'} ${label}</span>`).join('')}</div><p>${copy.allPaymentsNoDuplicateEffects(metrics.completed, number(metrics.waitingSeconds, 1), waitingWhere)}</p><p class="scaling-call-hint">${verdict.won ? copy.workersAndServiceSlotsAreBalanced : copy.findWhereWaitingBuildsUp}</p>${awards}`,
    tone: verdict.won ? 'win' : 'review',
  } as const;
}
