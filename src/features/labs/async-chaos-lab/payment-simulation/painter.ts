import { JOB_COUNT, PLAYBACK_SPEEDS, TICK_MILLISECONDS, totals } from './engine';
import type { SimulationState } from './engine';
import type { PaintedPaymentLab, PaymentLabView } from './lab-view';

// Paint the current engine snapshot. Animation and DOM state cannot commit work.
const jobIcons = {
  pending: '○',
  working: '▶',
  retrying: '↻',
  done: '✓',
  lost: '×',
  failed: '×',
} satisfies Record<SimulationState['jobs'][number]['status'], string>;

function shownJobIndex(lab: PaymentLabView) {
  return lab.inspected >= 0 ? lab.inspected : Math.max(0, lab.state.active);
}

function statusLabel(lab: PaymentLabView, status: SimulationState['jobs'][number]['status']) {
  return {
    pending: lab.copy.pending,
    working: lab.copy.processing,
    retrying: lab.copy.unconfirmedRetry,
    done: lab.copy.completed,
    lost: lab.copy.lost,
    failed: lab.copy.duplicatedStopped,
  }[status];
}

export function paintStatus(lab: PaintedPaymentLab) {
  const state = lab.state,
    counts = totals(state);
  lab.dataset.phase = state.phase;
  lab.dataset.retryStage = lab.retryStage ?? '';
  lab.style.setProperty('--lab-tick-duration', `${TICK_MILLISECONDS / lab.speed}ms`);
  for (const speed of PLAYBACK_SPEEDS)
    lab.element(`[data-action="speed:${speed}"]`).setAttribute('aria-pressed', String(speed === lab.speed));
  lab.classList.toggle('is-playing', lab.playing || !!lab.retryStage);
  lab.classList.toggle('is-guided', lab.guide !== 'off');
  lab.classList.toggle(
    'is-worker-down',
    state.phase === 'lost' || (state.phase === 'incident' && state.incident !== 'ack-retry'),
  );
  lab.classList.toggle('is-personalizing', lab.personalizing);
  lab.element('[data-score]').textContent = `${counts.done}/${JOB_COUNT}`;
}

export function paintControls(lab: PaintedPaymentLab) {
  const state = lab.state,
    terminal = ['won', 'lost', 'duplicate'].includes(state.phase);
  for (const play of lab.querySelectorAll<HTMLButtonElement>('[data-action=play]'))
    play.textContent = lab.retryStage
      ? lab.copy.pauseRestart
      : lab.playing
        ? lab.copy.pause
        : state.phase === 'incident'
          ? lab.copy.reprocessPayment
          : terminal
            ? lab.copy.tryAgain
            : state.phase === 'ready'
              ? lab.copy.start
              : lab.copy.resume;
  const help = lab.element('[data-action=guide]');
  lab.element('[data-tutorial-label]').textContent = lab.guide === 'off' ? lab.copy.tutorial : lab.copy.viewStep;
  help.setAttribute('aria-label', lab.guide === 'off' ? lab.copy.openTutorial : lab.copy.readTheWalkthroughStep);
  help.title = help.getAttribute('aria-label')!;
  lab.element('[data-personalize-label]').textContent = lab.personalizing ? lab.copy.done : lab.copy.names;
  lab
    .element('[data-action=personalize]')
    .setAttribute('aria-label', lab.personalizing ? lab.copy.finishEditing : lab.copy.editNames);
}

export function paintNames(lab: PaintedPaymentLab) {
  for (const display of lab.querySelectorAll<HTMLElement>('[data-display-label]')) {
    const key = display.dataset.displayLabel!;
    display.textContent = key.startsWith('job-')
      ? lab.job(Number(key.slice(4)))
      : key.startsWith('step-')
        ? lab.step(Number(key.slice(5)))
        : lab.name(key as 'api' | 'storage' | 'worker');
  }
}

export function paintJobs(lab: PaintedPaymentLab) {
  for (const job of lab.state.jobs) {
    const index = job.id - 1;
    lab.element(`[data-progress="${index}"]`).className = `is-${job.status}`;
    lab.element(`[data-job-row="${index}"]`).className =
      `lab-job is-${job.status}${lab.inspected === index ? ' is-inspected' : ''}`;
    lab.element(`[data-job-status="${index}"]`).textContent = statusLabel(lab, job.status);
    lab.element(`[data-job-icon="${index}"]`).textContent = jobIcons[job.status];
  }
}

export function paintActiveJob(lab: PaintedPaymentLab) {
  const state = lab.state,
    shown = shownJobIndex(lab),
    job = state.jobs[shown]!;
  lab.element('[data-active-job]').classList.toggle('is-executing', job.status === 'working' && state.active === shown);
  lab.element('[data-active-job]').textContent =
    state.phase === 'ready'
      ? lab.copy.waitingForTheFirstPayment
      : `${lab.inspected >= 0 ? lab.copy.inspecting : ''}${lab.job(shown)} · ID ${String(shown + 1).padStart(2, '0')}${job.status === 'working' && state.active === shown ? ' → ' + (state.cursor === 'ack' ? lab.copy.confirmCompletion : lab.step(state.step)) : ''}`;
}

export function paintSteps(lab: PaintedPaymentLab) {
  const state = lab.state,
    shown = shownJobIndex(lab),
    job = state.jobs[shown]!;
  for (let index = 0; index < lab.config.steps.length; index++) {
    const progress = job.steps[index]!,
      retryOrigin = lab.retryStage === 'failure' && state.active === shown && state.step === index,
      restarting = lab.retryStage === 'restart' && state.active === shown && index === 0,
      uncertain =
        state.phase === 'incident' &&
        state.incident === 'email-uncertain' &&
        state.active === shown &&
        state.step === index,
      failed =
        state.phase === 'incident' &&
        state.incident === 'activation-failed' &&
        state.active === shown &&
        state.step === index,
      active =
        state.active === shown &&
        job.status === 'working' &&
        state.step === index &&
        ['execute', 'save'].includes(state.cursor);
    lab.element(`[data-step-card="${index}"]`).className =
      `lab-step ${active ? 'is-active' : ''} ${failed ? 'is-failed' : ''} ${uncertain ? 'is-uncertain' : ''} ${retryOrigin ? 'is-retry-origin' : ''} ${restarting ? 'is-restarting' : ''} ${progress.effects > 1 ? 'has-duplicate' : ''}`;
    lab.element(`[data-step-icon="${index}"]`).textContent = restarting
      ? '↻'
      : uncertain
        ? '?'
        : failed || progress.effects > 1
          ? '×'
          : progress.skipped
            ? '↷'
            : progress.effects
              ? '✓'
              : active
                ? '▶'
                : '○';
    lab.element(`[data-step-state="${index}"]`).textContent = lab.definition.stepState(lab, index, {
      progress: progress,
      shown,
      active,
      restarting,
      uncertain,
      failed,
    });
  }
}
