import {
  BASE_CAPACITIES,
  BASE_RATE_LIMITS,
  isHttpStep,
  MAXIMUM_RATE_LIMIT,
  MAXIMUM_STEP_CAPACITY,
  scalingMetrics,
} from './engine';
import type { ScalingConfig, ScalingState } from './engine';
import type { Names } from './content';
import type { scalingCopy } from './copy';
import { teamWorkerFrame } from './team-actors';
import type { TeamPose } from './team-actors';
import walkingAtlas from '@/shared/mascot/worker-walk-atlas.webp?url';
import reactionsAtlas from '@/shared/mascot/worker-reactions.webp?url';

export type ScalingScene = {
  root: HTMLElement;
  state: ScalingState;
  config: ScalingConfig;
  names: Names;
  copy: ReturnType<typeof scalingCopy>;
  playing: boolean;
};

const workerSignals: Record<TeamPose, string> = {
  idle: '',
  working: '⚙',
  'waiting-cpu': '◷',
  'waiting-slot': '◷',
  'waiting-service': '◷',
  rejected: '429',
  paused: 'Ⅱ',
  done: '✓',
};

function element<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) {
  return root.querySelector<T>(selector)!;
}

export function paintWorkers({ root, state, config, names, copy }: ScalingScene) {
  const labels: Record<TeamPose, string> = {
    idle: copy.idle,
    working: copy.validating,
    'waiting-cpu': copy.waitingForCpuLabel,
    'waiting-service': copy.awaitingReply,
    'waiting-slot': copy.waitingForSlotLabel,
    rejected: copy.rejected429,
    paused: copy.paused,
    done: copy.completeLabel,
  };
  root.querySelectorAll<HTMLElement>('[data-worker]').forEach((worker) => {
    const id = Number(worker.dataset.worker),
      frame = teamWorkerFrame(state, id),
      job = frame.job === null ? undefined : state.jobs[frame.job - 1];
    worker.hidden = id > config.workers;
    worker.classList.toggle('is-busy', !!job);
    worker.classList.toggle('is-waiting', frame.pose.startsWith('waiting'));
    worker.dataset.pose = frame.pose;
    worker.title = `${names.worker} ${id} · ${labels[frame.pose]}${job ? ` · ${names.jobs[job.id - 1]} · ${names.steps[job.step]}` : ''}`;
    worker.setAttribute('aria-label', worker.title);
    worker.querySelector('b')!.textContent = job
      ? `#${job.id} · P${job.step + 1}${frame.load > 1 ? ` +${frame.load - 1}` : ''}`
      : '—';
    worker.querySelector('[data-worker-status]')!.textContent = labels[frame.pose];
    worker.querySelector('[data-worker-signal]')!.textContent = workerSignals[frame.pose];
    const reaction = frame.pose === 'done' || frame.pose === 'rejected',
      pose = frame.pose === 'rejected' ? 2 : frame.pose === 'done' ? 5 : frame.pose.startsWith('waiting') ? 4 : 3,
      sprite = worker.querySelector<HTMLElement>('.scaling-worker-sprite')!;
    sprite.style.backgroundImage = `url('${reaction ? reactionsAtlas : walkingAtlas}')`;
    sprite.style.backgroundPosition = `${(pose % 3) * 50}% ${Math.floor(pose / 3) * 100}%`;
  });
}

export function paintSteps({ root, state, config, copy, playing }: ScalingScene) {
  scalingMetrics(state).steps.forEach((step, index) => {
    const node = element(root, `[data-step="${index}"]`);
    node.classList.toggle('is-working', step.active.length > 0);
    node.classList.toggle('is-rejected', state.rateLimit?.step === index);
    node.classList.toggle('is-congested', step.waiting.length > 0);
    node.style.setProperty('--load', `${(step.active.length / step.capacity) * 100}%`);
    element(root, `[data-capacity="${index}"]`).textContent = `${step.active.length}/${step.capacity} ${copy.inUse}`;
    element(root, `[data-status="${index}"]`).textContent =
      state.rateLimit?.step === index
        ? copy.http429QuotaExhausted
        : state.phase === 'rate-limited'
          ? copy.trialStopped
          : step.waiting.length
            ? index === 0 && step.active.length < step.capacity
              ? copy.eachWorkerValidatesOneAtATime
              : copy.fullWaitingLocally
            : step.active.length
              ? copy.working
              : copy.available;
    element(root, `[data-wait-label="${index}"]`).textContent =
      `${step.waiting.length} ${index === 0 ? copy.waitingForCpuStatus : copy.waitingForSlotStatus}${step.rejected.length ? copy.oneRejected429 : ''}`;
    element(root, `[data-resource-size="${index}"]`).textContent = String(step.capacity);
    element<HTMLButtonElement>(root, `[data-action="grow:${index}"]`).disabled =
      playing || step.capacity === MAXIMUM_STEP_CAPACITY;
    element<HTMLButtonElement>(root, `[data-action="shrink:${index}"]`).disabled = playing || step.capacity === 1;
    const extra = Math.max(0, step.capacity - BASE_CAPACITIES[index]!);
    element(root, `[data-resource-cost="${index}"]`).textContent = extra
      ? `+${extra} ${copy.capacityUnitsPerSecond}`
      : copy.includedCapacity;
    if (isHttpStep(index)) {
      const limit = config.rateLimits[index];
      element(root, `[data-rate-limit="${index}"]`).textContent = String(limit);
      element(root, `[data-rate-usage="${index}"]`).textContent = copy.requestsInThisWindow(
        state.requestsInWindow[index],
        limit,
      );
      element<HTMLButtonElement>(root, `[data-action="rate-more:${index}"]`).disabled =
        playing || limit === MAXIMUM_RATE_LIMIT;
      element<HTMLButtonElement>(root, `[data-action="rate-less:${index}"]`).disabled = playing || limit === 1;
      const quotaExtra = Math.max(0, limit - BASE_RATE_LIMITS[index]);
      element(root, `[data-rate-cost="${index}"]`).textContent = quotaExtra
        ? copy.quotaUnitsPerSecond(quotaExtra)
        : copy.includedQuota;
    }
  });
}
