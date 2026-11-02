import { labFigure } from '../shared/figures';
import { button } from '../shared/lab-ui';
import { stepControlsCopy } from './content';
import { scalingCopy } from './copy';
import { PLAYBACK_SPEEDS, AVAILABLE_WORKERS, isHttpStep, TARGET_COST, TARGET_SECONDS } from './engine';

function stepCard(es: boolean, step: number) {
  const copy = stepControlsCopy(es);
  const resources = [
    'CPU · 1 s',
    'HTTP · 3 s',
    `${scalingCopy(es).database} · 1 s`,
    'HTTP · 1 s',
  ];
  return `<article class="scaling-step" data-step="${step}">
    <div class="scaling-step-heading"><small>0${step + 1} <span>${resources[step]}</span></small><strong data-name="step-${step}"></strong></div>
    <div class="scaling-resource"><span data-status="${step}"></span><b data-capacity="${step}"></b></div>
    <div class="scaling-slots" data-location="active-${step}"></div>
    <div class="scaling-wait"><small data-wait-label="${step}">${copy.waiting}</small><div data-location="waiting-${step}"></div></div>
    <div class="scaling-step-controls"><span>${copy.concurrentSlots}</span><div class="scaling-capacity-control">${button(`shrink:${step}`, '−', `data-config aria-label="${copy.reduceCapacity} ${step + 1}"`)}<output data-resource-size="${step}"></output>${button(`grow:${step}`, '+', `data-config aria-label="${copy.expandCapacity} ${step + 1}"`)}</div></div>
    <small class="scaling-capacity-cost" data-resource-cost="${step}"></small>
    ${isHttpStep(step) ? `<div class="scaling-step-controls scaling-rate-controls"><span>${copy.httpQuota}</span><div class="scaling-capacity-control">${button(`rate-less:${step}`, '−', `data-config aria-label="${copy.reduceQuota} ${step + 1}"`)}<output data-rate-limit="${step}"></output>${button(`rate-more:${step}`, '+', `data-config aria-label="${copy.expandQuota} ${step + 1}"`)}</div></div><small class="scaling-rate-usage" data-rate-usage="${step}"></small><small class="scaling-capacity-cost" data-rate-cost="${step}"></small>` : ''}
  </article>`;
}

export function scalingDiagram(es: boolean, speed: number) {
  const copy = scalingCopy(es);
  return `
      <div class="scaling-mission"><span class="scaling-mission-mark" aria-hidden="true">↗</span><p><strong>${copy.twentyFourPaymentsLessWaiting}</strong><span>${copy.yourMissionFinishWithinTargets(TARGET_SECONDS, TARGET_COST)}</span></p></div>
      <section class="scaling-board" aria-label="${copy.paymentFlow}">
        <div class="scaling-intake">
          ${button('names', `✎ ${copy.names}`, 'class="scaling-edit-names"')}
          <div class="scaling-api">${labFigure('api')}<strong data-name="api"></strong><span class="scaling-202">202 <small>${copy.accepted}</small></span></div>
          <div class="scaling-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="scaling-queue-jobs" data-location="pending"></div><p>${copy.durableNoLosses} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="scaling-machine">
          <div class="scaling-team">
            <div class="scaling-team-heading">${labFigure('worker')}<div><small data-team-summary>${copy.teamUpTo8Workers}</small><strong data-name="worker"></strong></div><div class="scaling-hire"><span>Workers</span>${button('less', '−', `aria-label="${copy.removeOneWorker}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${copy.addOneWorker}" data-config`)}</div><div class="scaling-hire"><span>${copy.paymentsAtOncePerWorker}</span>${button('concurrency-less', '−', `aria-label="${copy.reducePaymentsAtOncePerWorker}" data-config`)}<output data-concurrency>1</output>${button('concurrency-more', '+', `aria-label="${copy.increasePaymentsAtOncePerWorker}" data-config`)}</div></div>
            <div class="scaling-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, index) => button(`worker:${index + 1}`, `<span class="scaling-worker-name">W${String(index + 1).padStart(2, '0')}</span><span class="scaling-worker-character" aria-hidden="true"><span class="scaling-worker-sprite"></span><span class="scaling-worker-signal" data-worker-signal></span></span><b>—</b><small data-worker-status></small>`, `data-worker="${index + 1}" class="scaling-worker" hidden`)).join('')}</div>
          </div>
          <div class="scaling-flow">${[0, 1, 2, 3].map((step) => stepCard(es, step)).join('')}</div>
          <div class="scaling-delivered"><span>✓ ${copy.completed}</span><div data-location="done"></div><b data-done>0/24</b></div>
        </div>
      </section>
      <aside class="scaling-radio" role="status" aria-live="polite">${labFigure('phone')}<div><small>${copy.onCallLive}</small><p data-radio>${copy.customersAreWaitingPressPlay}</p></div></aside>
      <div class="scaling-dock">
        <div class="scaling-playback">${button('play', `▶ ${copy.processPayments}`, 'class="scaling-primary"')}${button('reset', '↺', `aria-label="${copy.resetTrial}"`)}<div class="scaling-speeds" role="group" aria-label="${copy.playbackSpeed}">${PLAYBACK_SPEEDS.map((playbackSpeed) => button(`speed:${playbackSpeed}`, `×${playbackSpeed}`, `aria-pressed="${playbackSpeed === speed}"`)).join('')}</div></div>
        <div class="scaling-clock"><strong data-time>0 s</strong><span data-throughput>0 ${copy.paymentsPerSecond}</span></div>
        <div class="scaling-dock-metrics"><span data-occupied></span><span data-waiting></span>${button('cost', '<span data-cost></span>', `aria-label="${copy.showTheCostCalculation}"`)}</div>
      </div>
      <div class="scaling-trial-bar"><span>${copy.yourTrials}</span><div data-trials></div>${button('compare', copy.compare)}</div>
      <details class="lab-achievements">
        <summary data-achievement-summary></summary>
        <p>${copy.achievementsForThisBrowserSession}</p>
        <div data-achievements></div>
      </details>
      <dialog class="scaling-dialog" aria-labelledby="scaling-dialog-title" aria-describedby="scaling-dialog-text"></dialog>`;
}
