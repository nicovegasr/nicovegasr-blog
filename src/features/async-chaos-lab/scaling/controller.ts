import { eligibleAchievements, scalingAchievements } from './achievements';
import type { ScalingAchievementId } from './achievements';
import { number, teamLabel } from './format';
import { rateLimitScene, trialResult } from './result';
import type { ResultContext } from './result';
import {
  createScaling,
  BASE_CAPACITIES,
  BASE_RATE_LIMITS,
  isHttpStep,
  PAYMENT_COUNT,
  pauseScaling,
  playScaling,
  scalingDefaults,
  scalingMetrics,
  scalingVerdict,
  tickScaling,
  AVAILABLE_WORKERS,
  TARGET_COST,
  TARGET_SECONDS,
  MAX_CONCURRENCY_PER_WORKER,
} from './engine';
import type { ScalingConfig } from './engine';
import { callCopy, scalingNames, stepControlsCopy } from './content';
import { scalingCopy } from './copy';
import type { Names } from './content';
import { cleanLabel, escapeHtml as esc } from '../shared/text';
import { labFigure } from '../shared/figures';
import walkingAtlas from '@/shared/mascot/worker-walk-atlas.webp?url';
import reactionsAtlas from '@/shared/mascot/worker-reactions.webp?url';
import { teamWorkerFrame } from './team-actors';
import type { TeamPose } from './team-actors';
import { button, isSpanishLab } from '../shared/lab-ui';
import { restoreAchievements, restoreSession, saveAchievements, saveSession } from './session';
import type { Trial } from './session';

class QueueScaling extends HTMLElement {
  private config = scalingDefaults();
  private state = createScaling();
  private names!: Names;
  private history: Trial[] = [];
  private unlocked = new Set<ScalingAchievementId>();
  private newAwards: ScalingAchievementId[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private speed = 1;
  private radioMarkup = '';
  private selectedJob = 0;
  private modalAction: (() => void) | undefined;
  private packets: HTMLButtonElement[] = [];
  private get es() {
    return isSpanishLab(this);
  }
  private get copy() {
    return scalingCopy(this.es);
  }
  private q<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }

  connectedCallback() {
    ({ names: this.names, history: this.history } = restoreSession(scalingNames(this.es), this.es));
    this.unlocked = restoreAchievements();
    this.innerHTML = `
      <div class="sc-mission"><span class="sc-mission-mark" aria-hidden="true">↗</span><p><strong>${this.copy.n24PaymentsLessWaiting}</strong><span>${this.copy.yourMissionFinishWithinS(TARGET_SECONDS, TARGET_COST)}</span></p></div>
      <section class="sc-board" aria-label="${this.copy.paymentFlow}">
        <div class="sc-intake">
          ${button('names', `✎ ${this.copy.names}`, 'class="sc-edit-names"')}
          <div class="sc-api">${labFigure('api')}<strong data-name="api"></strong><span class="sc-202">202 <small>${this.copy.accepted}</small></span></div>
          <div class="sc-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="sc-queue-jobs" data-location="pending"></div><p>${this.copy.durableNoLosses} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="sc-machine">
          <div class="sc-team">
            <div class="sc-team-heading">${labFigure('worker')}<div><small data-team-summary>${this.copy.teamUpto8Workers}</small><strong data-name="worker"></strong></div><div class="sc-hire"><span>Workers</span>${button('less', '−', `aria-label="${this.copy.removeOneWorker}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${this.copy.addOneWorker}" data-config`)}</div><div class="sc-hire"><span>${this.copy.paymentsAtOncePerWorker}</span>${button('concurrency-less', '−', `aria-label="${this.copy.reducePaymentsAtOncePer}" data-config`)}<output data-concurrency>1</output>${button('concurrency-more', '+', `aria-label="${this.copy.increasePaymentsAtOncePer}" data-config`)}</div></div>
            <div class="sc-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, i) => button(`worker:${i + 1}`, `<span class="sc-worker-name">W${String(i + 1).padStart(2, '0')}</span><span class="sc-worker-character" aria-hidden="true"><span class="sc-worker-sprite"></span><span class="sc-worker-signal" data-worker-signal></span></span><b>—</b><small data-worker-status></small>`, `data-worker="${i + 1}" class="sc-worker" hidden`)).join('')}</div>
          </div>
          <div class="sc-flow">${[0, 1, 2, 3].map((step) => this.stepCard(step)).join('')}</div>
          <div class="sc-delivered"><span>✓ ${this.copy.completed}</span><div data-location="done"></div><b data-done>0/24</b></div>
        </div>
      </section>
      <aside class="sc-radio" role="status" aria-live="polite">${labFigure('phone')}<div><small>${this.copy.onCalllive}</small><p data-radio>${this.copy.customersAreWaitingPressPlay}</p></div></aside>
      <div class="sc-dock">
        <div class="sc-playback">${button('play', `▶ ${this.copy.processPayments}`, 'class="sc-primary"')}${button('reset', '↺', `aria-label="${this.copy.resetTrial}"`)}<div class="sc-speeds" role="group" aria-label="${this.copy.playbackSpeed}">${[1, 2, 4].map((speed) => button(`speed:${speed}`, `×${speed}`, `aria-pressed="${speed === this.speed}"`)).join('')}</div></div>
        <div class="sc-clock"><strong data-time>0 s</strong><span data-throughput>0 ${this.copy.paymentsS}</span></div>
        <div class="sc-dock-metrics"><span data-occupied></span><span data-waiting></span>${button('cost', '<span data-cost></span>', `aria-label="${this.copy.showTheCostCalculation}"`)}</div>
      </div>
      <div class="sc-trial-bar"><span>${this.copy.yourTrials}</span><div data-trials></div>${button('compare', this.copy.compare)}</div>
      <details class="qs-achievements">
        <summary data-achievement-summary></summary>
        <p>${this.copy.achievementsForThisBrowserSession}</p>
        <div data-achievements></div>
      </details>
      <dialog class="sc-dialog" aria-labelledby="sc-dialog-title" aria-describedby="sc-dialog-text"></dialog>`;
    const pending = this.q('[data-location=pending]');
    this.packets = this.state.jobs.map((job) => {
      const packet = document.createElement('button');
      packet.type = 'button';
      packet.className = 'sc-job';
      packet.dataset.action = `job:${job.id}`;
      packet.dataset.job = String(job.id);
      packet.textContent = `#${String(job.id).padStart(2, '0')}`;
      pending.append(packet);
      return packet;
    });
    this.addEventListener('click', this.onClick);
    this.addEventListener('input', this.onInput);
    this.q<HTMLDialogElement>('dialog').addEventListener(
      'close',
      this.onDialogClosed,
    );
    document.addEventListener('visibilitychange', this.onVisibility);
    this.render();
    this.showCall('intro');
  }
  disconnectedCallback() {
    this.stopTimer();
    this.querySelector<HTMLDialogElement>('dialog')?.close();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('input', this.onInput);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
  private stepCard(step: number) {
    const copy = stepControlsCopy(this.es);
    const resources = [
      'CPU · 1 s',
      'HTTP · 3 s',
      `${this.copy.db} · 1 s`,
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
  private checkAchievements() {
    this.newAwards = eligibleAchievements(this.state)
      .filter((id) => !this.unlocked.has(id));
    this.newAwards.forEach((id) => this.unlocked.add(id));
    saveAchievements(this.unlocked);
  }
  private renderNewAwards() {
    return `<div class="sc-result-awards">${scalingAchievements.filter(({ id }) => this.newAwards.includes(id)).map((award) => {
      const [title, description] = this.es ? award.es : award.en;
      return `<div class="qs-earned" data-earned="${award.id}"><span aria-hidden="true">✦</span><div><small class="qs-award-label">${this.copy.achievementUnlocked}</small><strong>${esc(title)}</strong><p>${esc(description)}</p></div></div>`;
    }).join('')}</div>`;
  }
  private renderAchievements() {
    this.q('[data-achievement-summary]').textContent = `✦ ${this.copy.sessionAchievements} · ${this.unlocked.size}/${scalingAchievements.length}`;
    this.q('[data-achievements]').innerHTML = scalingAchievements.map((award) => {
      const unlocked = this.unlocked.has(award.id);
      const [title, description] = this.es ? award.es : award.en;
      return `<article class="${unlocked ? 'is-unlocked' : ''}" data-achievement="${award.id}"><span aria-hidden="true">${unlocked ? '✦' : '◇'}</span><div><h3>${esc(title)}${unlocked ? ` <small>· ${this.copy.unlocked}</small>` : ''}</h3><p>${esc(description)}</p></div></article>`;
    }).join('');
  }
  private name(key: string) {
    if (key.startsWith('step-')) return this.names.steps[Number(key.slice(5))]!;
    if (key.startsWith('job-')) return this.names.jobs[Number(key.slice(4))]!;
    return this.names[key as 'api' | 'queue' | 'worker'];
  }
  private highlight(text: string) {
    const names = [
      ...new Set([
        this.names.api,
        this.names.queue,
        this.names.worker,
        ...this.names.steps,
        ...this.names.jobs,
      ]),
    ].sort((a, b) => b.length - a.length);
    const expression = new RegExp(
      `(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'g',
    );
    return text
      .split(expression)
      .map((part) =>
        names.includes(part) ? `<strong>${esc(part)}</strong>` : esc(part),
      )
      .join('');
  }
  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  private pause() {
    this.stopTimer();
    this.state = pauseScaling(this.state);
    this.render();
  }
  private start() {
    this.newAwards = [];
    if (this.state.phase === 'complete' || this.state.phase === 'rate-limited') {
      this.state = createScaling(this.config);
    }
    this.state = playScaling(this.state);
    this.stopTimer();
    this.timer = setInterval(() => this.advance(), 120 / this.speed);
    this.render();
  }
  private advance() {
    this.state = tickScaling(this.state);
    if (this.state.phase === 'complete' || this.state.phase === 'rate-limited') {
      this.stopTimer();
      this.checkAchievements();
      const metrics = scalingMetrics(this.state);
      const verdict = scalingVerdict(this.state);
      this.history.push({
        config: structuredClone(this.config),
        seconds: metrics.seconds,
        cost: metrics.cost,
        completed: metrics.completed,
        waitingSeconds: metrics.waitingSeconds,
        rateLimitedStep: this.state.rateLimit?.step ?? null,
        won: verdict.won,
      });
      this.history = this.history.slice(-8);
      saveSession(this.names, this.history, this.es);
      this.render();
      this.showResult();
      return;
    }
    this.render();
  }
  private configure(change: (config: ScalingConfig) => void) {
    if (this.state.phase === 'running') return;
    const config = structuredClone(this.config);
    change(config);
    this.state = createScaling(config);
    this.config = config;
    this.selectedJob = 0;
    this.render();
  }
  private onVisibility = () => {
    if (document.hidden && this.state.phase === 'running') this.pause();
  };
  private onDialogClosed = () => {
    this.modalAction = undefined;
  };
  private onClick = (event: Event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!target || target.disabled) return;
    const [action, value] = target.dataset.action!.split(':');
    if (action === 'play') {
      if (this.state.phase === 'running') this.pause();
      else this.start();
    }
    if (action === 'reset') {
      this.stopTimer();
      this.state = createScaling(this.config);
      this.selectedJob = 0;
      this.render();
    }
    if (action === 'more' || action === 'less')
      this.configure((config) => {
        config.workers = Math.min(
          AVAILABLE_WORKERS,
          Math.max(1, config.workers + (action === 'more' ? 1 : -1)),
        );
      });
    if (action === 'concurrency-more' || action === 'concurrency-less')
      this.configure((config) => {
        config.concurrencyPerWorker = Math.min(
          MAX_CONCURRENCY_PER_WORKER,
          Math.max(1, config.concurrencyPerWorker + (action === 'concurrency-more' ? 1 : -1)),
        );
      });
    if (action === 'speed') {
      this.speed = Number(value);
      if (this.state.phase === 'running') this.start();
      else this.render();
    }
    if (action === 'grow' || action === 'shrink') {
      const step = Number(value);
      this.configure((config) => {
        config.capacities[step] = Math.max(1, Math.min(8,
          config.capacities[step]! + (action === 'grow' ? 1 : -1)));
      });
    }
    if ((action === 'rate-more' || action === 'rate-less') && isHttpStep(Number(value))) {
      const step = Number(value) as 1 | 3;
      this.configure((config) => {
        config.rateLimits[step] = Math.max(1, Math.min(8,
          config.rateLimits[step] + (action === 'rate-more' ? 1 : -1)));
      });
    }
    if (action === 'job') {
      this.selectedJob = Number(value);
      this.renderRadio();
    }
    if (action === 'worker') {
      this.selectedJob =
        this.state.jobs.find((job) => job.worker === Number(value))?.id ?? 0;
      this.renderRadio();
    }
    if (action === 'names') this.showNames();
    if (action === 'compare') this.showComparison();
    if (action === 'replay') {
      const trial = this.history[Number(value)];
      if (trial) {
        this.q<HTMLDialogElement>('dialog').close();
        this.configure((config) =>
          Object.assign(config, structuredClone(trial.config)),
        );
      }
    }
    if (action === 'cost') this.showCost();
    if (action === 'close') this.q<HTMLDialogElement>('dialog').close();
    if (action === 'modal-primary') {
      const callback = this.modalAction;
      this.q<HTMLDialogElement>('dialog').close();
      callback?.();
    }
  };
  private onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.rename;
    if (!key) return;
    const value = cleanLabel(input.value, this.name(key));
    if (key.startsWith('step-')) this.names.steps[Number(key.slice(5))] = value;
    else if (key.startsWith('job-'))
      this.names.jobs[Number(key.slice(4))] = value;
    else this.names[key as 'api' | 'queue' | 'worker'] = value;
    saveSession(this.names, this.history, this.es);
    this.render();
  };
  private render() {
    const state = this.state,
      metrics = scalingMetrics(state),
      playing = state.phase === 'running';
    this.dataset.phase = state.phase;
    this.style.setProperty('--sc-worker-tempo', `${1000 / this.speed}ms`);
    this.classList.toggle('is-playing', playing);
    this.querySelectorAll<HTMLElement>('[data-name]').forEach((node) => {
      node.textContent = this.name(node.dataset.name!);
    });
    this.q('[data-pending]').textContent = String(metrics.pending);
    this.q('[data-workers]').textContent = String(this.config.workers);
    this.q('[data-concurrency]').textContent = String(this.config.concurrencyPerWorker);
    this.q('[data-done]').textContent = `${metrics.completed}/${PAYMENT_COUNT}`;
    this.q('[data-time]').textContent = `${number(metrics.seconds, 1)} s`;
    this.q('[data-throughput]').textContent =
      `${number(metrics.throughput, 2)} ${this.copy.paymentsS}`;
    this.q('[data-occupied]').textContent =
      `${metrics.occupied}/${this.config.workers} ${this.copy.busy}`;
    this.q('[data-waiting]').textContent =
      `${metrics.waiting} ${this.copy.waitingForAslot}`;
    this.q('[data-cost]').textContent =
      `${this.copy.cost} ${number(metrics.cost)} u`;
    this.q('[data-action=play]').textContent = playing
      ? this.copy.pause
      : state.phase === 'paused'
        ? this.copy.resume
        : state.phase === 'complete' || state.phase === 'rate-limited'
          ? this.copy.tryAgain
          : this.copy.processPayments2;
    this.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
      '[data-config]',
    ).forEach((control) => {
      control.disabled = playing;
    });
    this.q<HTMLButtonElement>('[data-action=less]').disabled =
      playing || this.config.workers === 1;
    this.q<HTMLButtonElement>('[data-action=more]').disabled =
      playing || this.config.workers === AVAILABLE_WORKERS;
    this.q<HTMLButtonElement>('[data-action=concurrency-less]').disabled =
      playing || this.config.concurrencyPerWorker === 1;
    this.q<HTMLButtonElement>('[data-action=concurrency-more]').disabled =
      playing || this.config.concurrencyPerWorker === MAX_CONCURRENCY_PER_WORKER;
    for (const speed of [1, 2, 4])
      this.q(`[data-action="speed:${speed}"]`).setAttribute(
        'aria-pressed',
        String(this.speed === speed),
      );
    this.renderJobs();
    this.querySelectorAll<HTMLElement>('[data-worker]').forEach((worker) => {
      const id = Number(worker.dataset.worker),
        frame = teamWorkerFrame(state, id),
        job = frame.job === null ? undefined : state.jobs[frame.job - 1];
      worker.hidden = id > this.config.workers;
      worker.classList.toggle('is-busy', !!job);
      worker.classList.toggle('is-waiting', frame.pose.startsWith('waiting'));
      worker.dataset.pose = frame.pose;
      const labels: Record<TeamPose, string> = {
        idle: this.copy.idle,
        working: this.copy.validating,
        'waiting-cpu': this.copy.waitingForCpu,
        'waiting-service': this.copy.awaitingReply,
        'waiting-slot': this.copy.waitingForAslot2,
        rejected: this.copy.rejected429,
        paused: this.copy.paused,
        done: this.copy.complete,
      };
      worker.title = `${this.names.worker} ${id} · ${labels[frame.pose]}${job ? ` · ${this.names.jobs[job.id - 1]} · ${this.names.steps[job.step]}` : ''}`;
      worker.setAttribute('aria-label', worker.title);
      worker.querySelector('b')!.textContent = job ? `#${job.id} · P${job.step + 1}${frame.load > 1 ? ` +${frame.load - 1}` : ''}` : '—';
      worker.querySelector('[data-worker-status]')!.textContent = labels[frame.pose];
      worker.querySelector('[data-worker-signal]')!.textContent = {
        idle: '', working: '⚙', 'waiting-cpu': '◷', 'waiting-slot': '◷', 'waiting-service': '◷',
        rejected: '429', paused: 'Ⅱ', done: '✓',
      }[frame.pose];
      const reaction = frame.pose === 'done' || frame.pose === 'rejected',
        pose = frame.pose === 'rejected' ? 2 : frame.pose === 'done' ? 5 : frame.pose.startsWith('waiting') ? 4 : 3,
        sprite = worker.querySelector<HTMLElement>('.sc-worker-sprite')!;
      sprite.style.backgroundImage = `url('${reaction ? reactionsAtlas : walkingAtlas}')`;
      sprite.style.backgroundPosition = `${(pose % 3) * 50}% ${Math.floor(pose / 3) * 100}%`;
    });
    this.q('[data-team-summary]').textContent = this.copy.teamWorkerspaymentsinflight(metrics.occupied, this.config.workers, metrics.inFlight, this.config.workers * this.config.concurrencyPerWorker);
    metrics.steps.forEach((step, index) => {
      const node = this.q(`[data-step="${index}"]`);
      node.classList.toggle('is-working', step.active.length > 0);
      node.classList.toggle('is-rejected', state.rateLimit?.step === index);
      node.classList.toggle('is-congested', step.waiting.length > 0);
      node.style.setProperty(
        '--load',
        `${(step.active.length / step.capacity) * 100}%`,
      );
      this.q(`[data-capacity="${index}"]`).textContent =
        `${step.active.length}/${step.capacity} ${this.copy.inUse}`;
      this.q(`[data-status="${index}"]`).textContent = state.rateLimit?.step === index
        ? this.copy.n429QuotaExhausted
        : state.phase === 'rate-limited'
        ? this.copy.trialStopped
        : step.waiting.length
        ? index === 0 && step.active.length < step.capacity
          ? this.copy.eachWorkerValidatesOneAt
          : this.copy.fullWaitingLocally
        : step.active.length
        ? this.copy.working
        : this.copy.available;
      this.q(`[data-wait-label="${index}"]`).textContent = `${step.waiting.length} ${index === 0 ? this.copy.waitingForCpu2 : this.copy.waitingForAslot}${step.rejected.length ? this.copy.n1Rejected429 : ''}`;
      this.q(`[data-resource-size="${index}"]`).textContent = String(step.capacity);
      this.q<HTMLButtonElement>(`[data-action="grow:${index}"]`).disabled = playing || step.capacity === 8;
      this.q<HTMLButtonElement>(`[data-action="shrink:${index}"]`).disabled = playing || step.capacity === 1;
      const extra = Math.max(0, step.capacity - BASE_CAPACITIES[index]!);
      this.q(`[data-resource-cost="${index}"]`).textContent = extra
        ? `+${extra} ${this.copy.capacityUnitsS}`
        : this.copy.includedCapacity;
      if (isHttpStep(index)) {
        const limit = this.config.rateLimits[index];
        this.q(`[data-rate-limit="${index}"]`).textContent = String(limit);
        this.q(`[data-rate-usage="${index}"]`).textContent = this.copy.inThis1Swindow(state.requestsInWindow[index], limit);
        this.q<HTMLButtonElement>(`[data-action="rate-more:${index}"]`).disabled = playing || limit === 8;
        this.q<HTMLButtonElement>(`[data-action="rate-less:${index}"]`).disabled = playing || limit === 1;
        const quotaExtra = Math.max(0, limit - BASE_RATE_LIMITS[index]);
        this.q(`[data-rate-cost="${index}"]`).textContent = quotaExtra
          ? this.copy.quotaUnitsS(quotaExtra)
          : this.copy.includedQuota;
      }
    });
    this.renderRadio();
    this.renderTrials();
  }
  private renderJobs() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const job of this.state.jobs) {
      const packet = this.packets[job.id - 1]!;
      const location =
        job.status === 'pending' || job.status === 'done'
          ? job.status
          : job.status === 'running'
            ? `active-${job.step}`
            : `waiting-${Math.min(3, job.step)}`;
      const parent = this.q(`[data-location="${location}"]`);
      if (packet.parentElement !== parent) {
        const before = packet.getBoundingClientRect();
        packet.getAnimations().forEach((animation) => animation.cancel());
        parent.append(packet);
        const after = packet.getBoundingClientRect();
        if (!reduced && this.state.phase === 'running' && before.width)
          packet.animate(
            [
              {
                transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)`,
                zIndex: 3,
              },
              { transform: 'translate(0,0)', zIndex: 3 },
            ],
            { duration: 210 / Math.sqrt(this.speed), easing: 'ease-out' },
          );
      }
      packet.dataset.status = job.status;
      packet.textContent = `#${String(job.id).padStart(2, '0')}${job.worker !== null ? ` · W${job.worker}` : ''}`;
      packet.title = `${this.names.jobs[job.id - 1]!} · ${job.status === 'done' ? this.copy.complete : (this.names.steps[job.step]! ?? '')}`;
      packet.setAttribute('aria-label', packet.title);
      const progress =
        job.status === 'running'
          ? 1 - (job.until - this.state.tick) / this.config.durations[job.step]!
          : 0;
      packet.style.setProperty('--progress', `${progress * 100}%`);
    }
    if (this.state.phase === 'ready') {
      const queue = this.q('[data-location="pending"]');
      for (const packet of this.packets) queue.append(packet);
    }
  }
  private renderRadio() {
    const state = this.state,
      metrics = scalingMetrics(state);
    let text = '';
    if (state.rateLimit)
      text = this.copy.http429AtTheQuota(this.names.steps[state.rateLimit.step]!, state.rateLimit.limit);
    else if (this.selectedJob) {
      const job = state.jobs[this.selectedJob - 1]!;
      text = `${this.names.jobs[job.id - 1]!} · ${job.status === 'done' ? this.copy.complete2 : job.status === 'pending' ? this.copy.storedWaitingForAworker : `${this.names.steps[job.step]!} · ${job.status === 'waiting' ? job.step === 0 ? this.copy.waitingForCpuitsWorker : this.copy.waitingForAslotBefore : this.copy.runningNow}`}`;
    } else if (state.phase === 'ready')
      text =
        this.config.workers === 1 && this.config.concurrencyPerWorker === 1
          ? this.copy.n24CustomersWaitingThisWorker
          : this.copy.teamReadyPaymentsAtOnce(this.config.workers, this.config.concurrencyPerWorker);
    else if (state.phase === 'paused')
      text = this.copy.playbackPausedResumeWhereYou;
    else if (metrics.steps.some((step) => step.waiting.length)) {
      const busiest = metrics.steps.reduce(
        (best, step, index) =>
          step.waiting.length > metrics.steps[best]!.waiting.length
            ? index
            : best,
        0,
      );
      text = busiest === 0
        ? this.copy.hasPaymentsWaitingForCpu(this.names.steps[0]!, metrics.steps[0]!.waiting.length)
        : this.copy.hasPaymentsWaitingForSlots(this.names.steps[busiest]!, metrics.steps[busiest]!.waiting.length);
    } else if (state.phase === 'complete')
      text = scalingVerdict(state).won
        ? this.copy.all24CompleteOnTime
        : this.copy.allArrivedCompareTimeAnd;
    else if (this.config.workers * this.config.concurrencyPerWorker > 1 && metrics.completed >= 2)
      text = this.copy.thatsBetterTheQueueIs;
    else {
      const current = state.events.findLast(
        (event) => event.kind === 'started',
      );
      text = current
        ? this.copy.isAtGreenShowsWhat(this.names.jobs[current.job - 1]!, this.names.steps[current.step]!)
        : '';
    }
    const html = this.highlight(text);
    if (this.radioMarkup !== html) {
      this.q('[data-radio]').innerHTML = html;
      this.radioMarkup = html;
    }
  }
  private renderTrials() {
    this.renderAchievements();
    this.q('[data-trials]').innerHTML = this.history.length
      ? this.history
          .slice(-4)
          .map(
            (trial) =>
              `<span class="sc-trial ${trial.won ? 'is-won' : ''}">${teamLabel(trial.config)} <span>→</span> ${number(trial.seconds, 1)} s <small>· ${number(trial.cost)} u</small></span>`,
          )
          .join('')
      : `<small>${this.copy.yourResultsWillAppearHere}</small>`;
  }
  private modal(
    title: string,
    body: string,
    label: string,
    callback?: () => void,
    tone = 'call',
  ) {
    this.pause();
    const dialog = this.q<HTMLDialogElement>('dialog');
    this.modalAction = callback;
    dialog.className = 'sc-dialog';
    dialog.setAttribute('aria-labelledby', 'sc-dialog-title');
    dialog.setAttribute('aria-describedby', 'sc-dialog-text');
    dialog.dataset.tone = tone;
    dialog.innerHTML = `<header><span>${labFigure('phone')}${this.copy.onCallasyncchaoslab}</span>${button('close', '×', `aria-label="${this.copy.close}"`)}</header><h2 id="sc-dialog-title">${esc(title)}</h2><div id="sc-dialog-text">${body}</div><footer>${button('modal-primary', label, 'class="sc-primary"')}${button('close', this.copy.backToDiagram)}</footer>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog
      .querySelector<HTMLButtonElement>('[data-action=modal-primary]')
      ?.focus({ preventScroll: true });
  }
  private showCall(scene: 'intro') {
    const copy = callCopy(scene, this.names, this.es);
    this.modal(copy.title,
      `<p>${this.highlight(copy.report)}</p><p class="sc-call-hint">${this.highlight(copy.hint)}</p>`,
      copy.action);
  }
  private showResult() {
    const rejection = this.state.rateLimit;
    if (rejection) {
      const dialog = this.q<HTMLDialogElement>('dialog');
      this.pause();
      this.modalAction = undefined;
      dialog.className = 'qs-outcome';
      dialog.dataset.tone = 'loss';
      dialog.setAttribute('aria-labelledby', 'qs-outcome-title');
      dialog.setAttribute('aria-describedby', 'qs-outcome-text');
      dialog.innerHTML = rateLimitScene(this.resultContext(), rejection);
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-primary]')?.focus({ preventScroll: true });
      return;
    }
    const { title, body, tone } = trialResult(this.resultContext());
    this.modal(
      title,
      body,
      this.copy.backToMySystem,
      () => { this.q('[data-action=play]').focus({ preventScroll: true }); },
      tone,
    );
  }
  private resultContext(): ResultContext {
    return {
      es: this.es,
      state: this.state,
      config: this.config,
      names: this.names,
      history: this.history,
      awards: this.renderNewAwards(),
    };
  }
  private showNames() {
    const defaults = scalingNames(this.es);
    const field = (key: string, label: string) =>
      `<label>${esc(label)}<input data-rename="${key}" maxlength="64" value="${esc(this.name(key))}" /></label>`;
    this.modal(
      this.copy.makeItYourSystem,
      `<p>${this.copy.namesChangeTheStoryThe}</p><div class="sc-name-fields">${field('api', 'API')}${field('queue', this.copy.queue)}${field('worker', 'Worker')}${this.names.steps.map((_, i) => field(`step-${i}`, `${this.copy.step} ${i + 1}`)).join('')}<details><summary>${this.copy.namesOfThe24Payments}</summary>${this.names.jobs.map((_, i) => field(`job-${i}`, defaults.jobs[i]!)).join('')}</details></div>`,
      this.copy.done,
    );
  }
  private showCost() {
    const metrics = scalingMetrics(this.state);
    this.modal(
      this.copy.payingForReservedCapacity,
      `<p>${this.copy.theseAreTeachingUnitsNot}</p><p><strong>${this.config.workers} × ${number(metrics.seconds, 1)} s = ${number(metrics.workerCost)} u</strong></p><p>${this.copy.theOriginalServiceContractIs} ${this.config.capacities.reduce((total, capacity, step) => total + Math.max(0, capacity - BASE_CAPACITIES[step]!), 0)} × ${number(metrics.seconds, 1)} s = ${number(metrics.extraServiceCost)} u.</p><p>${this.copy.eachExtraRequestSof(number(metrics.extraRateCost))}</p><p>${this.copy.efficiencyCompletedPaymentsReservedUnits}</p>`,
      this.copy.gotIt,
    );
  }
  private showComparison() {
    this.modal(
      this.copy.sameWorkDifferentTeams,
      this.history.length
        ? `<div class="sc-comparison"><table><thead><tr>${[this.copy.workersStripe, this.copy.time, this.copy.cumulativeWaiting, this.copy.cost, this.copy.paymentsU].map((title) => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${this.history.map((trial, index) => `<tr><td>${button(`replay:${index}`, `${teamLabel(trial.config)} / ${trial.config.capacities[1]} ${trial.won ? '✓' : ''}`, `aria-label="${this.copy.prepareThisConfiguration}"`)}<small class="sc-trial-config">${trial.config.capacities.map((limit) => limit).join(' / ')}<br />HTTP ${trial.config.rateLimits[1]} / ${trial.config.rateLimits[3]} ${this.copy.requestsS}</small></td><td>${number(trial.seconds, 1)} s${trial.rateLimitedStep !== null ? `<small class="sc-rejected-result">429 · ${this.copy.step2} ${trial.rateLimitedStep + 1}</small>` : ''}</td><td>${number(trial.waitingSeconds, 1)} s</td><td>${number(trial.cost)} u</td><td>${number(trial.completed / (trial.cost || 1), 3)}</td></tr>`).join('')}</tbody></table></div><p class="sc-call-hint">${this.copy.theLast8FinishedTrials}</p>`
        : `<p>${this.copy.finishAtrialToStart}</p>`,
      this.copy.keepExperimenting,
    );
  }
}

if (!customElements.get('queue-scaling-game'))
  customElements.define('queue-scaling-game', QueueScaling);
