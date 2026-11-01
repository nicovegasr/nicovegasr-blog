import { labFigure } from '../shared/figures';
import { button } from '../shared/lab-ui';
import { stepControlsCopy } from './content';
import { scalingCopy } from './copy';
import { AVAILABLE_WORKERS, isHttpStep, TARGET_COST, TARGET_SECONDS } from './engine';

function stepCard(es: boolean, step: number) {
  const copy = stepControlsCopy(es);
  const resources = [
    'CPU · 1 s',
    'HTTP · 3 s',
    `${scalingCopy(es).db} · 1 s`,
    'HTTP · 1 s',
  ];
  return `<article class="sc-step" data-step="${step}">
    <div class="sc-step-heading"><small>0${step + 1} <span>${resources[step]}</span></small><strong data-name="step-${step}"></strong></div>
    <div class="sc-resource"><span data-status="${step}"></span><b data-capacity="${step}"></b></div>
    <div class="sc-slots" data-location="active-${step}"></div>
    <div class="sc-wait"><small data-wait-label="${step}">${copy.waiting}</small><div data-location="waiting-${step}"></div></div>
    <div class="sc-step-controls"><span>${copy.concurrentSlots}</span><div class="sc-capacity-control">${button(`shrink:${step}`, '−', `data-config aria-label="${copy.reduceCapacity} ${step + 1}"`)}<output data-resource-size="${step}"></output>${button(`grow:${step}`, '+', `data-config aria-label="${copy.expandCapacity} ${step + 1}"`)}</div></div>
    <small class="sc-capacity-cost" data-resource-cost="${step}"></small>
    ${isHttpStep(step) ? `<div class="sc-step-controls sc-rate-controls"><span>${copy.httpQuota}</span><div class="sc-capacity-control">${button(`rate-less:${step}`, '−', `data-config aria-label="${copy.reduceQuota} ${step + 1}"`)}<output data-rate-limit="${step}"></output>${button(`rate-more:${step}`, '+', `data-config aria-label="${copy.expandQuota} ${step + 1}"`)}</div></div><small class="sc-rate-usage" data-rate-usage="${step}"></small><small class="sc-capacity-cost" data-rate-cost="${step}"></small>` : ''}
  </article>`;
}

export function scalingDiagram(es: boolean, speed: number) {
  const copy = scalingCopy(es);
  return `
      <div class="sc-mission"><span class="sc-mission-mark" aria-hidden="true">↗</span><p><strong>${copy.twentyFourPaymentsLessWaiting}</strong><span>${copy.yourMissionFinishWithinS(TARGET_SECONDS, TARGET_COST)}</span></p></div>
      <section class="sc-board" aria-label="${copy.paymentFlow}">
        <div class="sc-intake">
          ${button('names', `✎ ${copy.names}`, 'class="sc-edit-names"')}
          <div class="sc-api">${labFigure('api')}<strong data-name="api"></strong><span class="sc-202">202 <small>${copy.accepted}</small></span></div>
          <div class="sc-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="sc-queue-jobs" data-location="pending"></div><p>${copy.durableNoLosses} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="sc-machine">
          <div class="sc-team">
            <div class="sc-team-heading">${labFigure('worker')}<div><small data-team-summary>${copy.teamUpTo8Workers}</small><strong data-name="worker"></strong></div><div class="sc-hire"><span>Workers</span>${button('less', '−', `aria-label="${copy.removeOneWorker}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${copy.addOneWorker}" data-config`)}</div><div class="sc-hire"><span>${copy.paymentsAtOncePerWorker}</span>${button('concurrency-less', '−', `aria-label="${copy.reducePaymentsAtOncePer}" data-config`)}<output data-concurrency>1</output>${button('concurrency-more', '+', `aria-label="${copy.increasePaymentsAtOncePer}" data-config`)}</div></div>
            <div class="sc-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, index) => button(`worker:${index + 1}`, `<span class="sc-worker-name">W${String(index + 1).padStart(2, '0')}</span><span class="sc-worker-character" aria-hidden="true"><span class="sc-worker-sprite"></span><span class="sc-worker-signal" data-worker-signal></span></span><b>—</b><small data-worker-status></small>`, `data-worker="${index + 1}" class="sc-worker" hidden`)).join('')}</div>
          </div>
          <div class="sc-flow">${[0, 1, 2, 3].map((step) => stepCard(es, step)).join('')}</div>
          <div class="sc-delivered"><span>✓ ${copy.completed}</span><div data-location="done"></div><b data-done>0/24</b></div>
        </div>
      </section>
      <aside class="sc-radio" role="status" aria-live="polite">${labFigure('phone')}<div><small>${copy.onCallLive}</small><p data-radio>${copy.customersAreWaitingPressPlay}</p></div></aside>
      <div class="sc-dock">
        <div class="sc-playback">${button('play', `▶ ${copy.processPayments}`, 'class="sc-primary"')}${button('reset', '↺', `aria-label="${copy.resetTrial}"`)}<div class="sc-speeds" role="group" aria-label="${copy.playbackSpeed}">${[1, 2, 4].map((speed) => button(`speed:${speed}`, `×${speed}`, `aria-pressed="${speed === speed}"`)).join('')}</div></div>
        <div class="sc-clock"><strong data-time>0 s</strong><span data-throughput>0 ${copy.paymentsS}</span></div>
        <div class="sc-dock-metrics"><span data-occupied></span><span data-waiting></span>${button('cost', '<span data-cost></span>', `aria-label="${copy.showTheCostCalculation}"`)}</div>
      </div>
      <div class="sc-trial-bar"><span>${copy.yourTrials}</span><div data-trials></div>${button('compare', copy.compare)}</div>
      <details class="qs-achievements">
        <summary data-achievement-summary></summary>
        <p>${copy.achievementsForThisBrowserSession}</p>
        <div data-achievements></div>
      </details>
      <dialog class="sc-dialog" aria-labelledby="sc-dialog-title" aria-describedby="sc-dialog-text"></dialog>`;
}
