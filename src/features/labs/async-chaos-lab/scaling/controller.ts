import { eligibleAchievements, scalingAchievementCopy, scalingAchievementIds } from './achievements';
import type { ScalingAchievementId } from './achievements';
import { number, teamLabel } from './format';
import { rateLimitScene, trialResult } from './result';
import type { ResultContext } from './result';
import {
  createScaling,
  isHttpStep,
  MAXIMUM_RATE_LIMIT,
  MAXIMUM_STEP_CAPACITY,
  PAYMENT_COUNT,
  pauseScaling,
  playScaling,
  scalingDefaults,
  scalingMetrics,
  scalingVerdict,
  tickScaling,
  AVAILABLE_WORKERS,
  MAXIMUM_CONCURRENCY_PER_WORKER,
  PLAYBACK_SPEEDS,
  TICK_MILLISECONDS,
  WORKER_TEMPO_MILLISECONDS,
} from './engine';
import type { ScalingConfig } from './engine';
import { callCopy, scalingNames } from './content';
import { scalingCopy } from './copy';
import { scalingDiagram } from './diagram';
import { comparisonDialog, costDialog, namesDialog } from './dialogs';
import type { Names } from './content';
import { cleanLabel, escapeHtml } from '../shared/text';
import { labFigure } from '../shared/figures';
import { paintSteps, paintWorkers } from './painter';
import { button, labLocale } from '../shared/lab-ui';
import { MAXIMUM_RESTORED_TRIALS, restoreAchievements, restoreSession, saveAchievements, saveSession } from './session';
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
  private get locale() {
    return labLocale(this);
  }
  private get copy() {
    return scalingCopy(this.locale);
  }
  private element<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }

  connectedCallback() {
    ({ names: this.names, history: this.history } = restoreSession(scalingNames(this.locale), this.locale));
    this.unlocked = restoreAchievements();
    this.innerHTML = scalingDiagram(this.locale, this.speed);
    const pending = this.element('[data-location=pending]');
    this.packets = this.state.jobs.map((job) => {
      const packet = document.createElement('button');
      packet.type = 'button';
      packet.className = 'scaling-job';
      packet.dataset.action = `job:${job.id}`;
      packet.dataset.job = String(job.id);
      packet.textContent = `#${String(job.id).padStart(2, '0')}`;
      pending.append(packet);
      return packet;
    });
    this.addEventListener('click', this.onClick);
    this.addEventListener('input', this.onInput);
    this.element<HTMLDialogElement>('dialog').addEventListener('close', this.onDialogClosed);
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
  private checkAchievements() {
    this.newAwards = eligibleAchievements(this.state).filter((id) => !this.unlocked.has(id));
    this.newAwards.forEach((id) => this.unlocked.add(id));
    saveAchievements(this.unlocked);
  }
  private renderNewAwards() {
    return `<div class="scaling-result-awards">${scalingAchievementIds
      .filter((id) => this.newAwards.includes(id))
      .map((id) => {
        const [title, description] = scalingAchievementCopy(this.locale)[id];
        return `<div class="lab-earned" data-earned="${id}"><span aria-hidden="true">✦</span><div><small class="lab-award-label">${this.copy.achievementUnlocked}</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div></div>`;
      })
      .join('')}</div>`;
  }
  private renderAchievements() {
    this.element('[data-achievement-summary]').textContent =
      `✦ ${this.copy.sessionAchievements} · ${this.unlocked.size}/${scalingAchievementIds.length}`;
    this.element('[data-achievements]').innerHTML = scalingAchievementIds
      .map((id) => {
        const unlocked = this.unlocked.has(id);
        const [title, description] = scalingAchievementCopy(this.locale)[id];
        return `<article class="${unlocked ? 'is-unlocked' : ''}" data-achievement="${id}"><span aria-hidden="true">${unlocked ? '✦' : '◇'}</span><div><h3>${escapeHtml(title)}${unlocked ? ` <small>· ${this.copy.unlocked}</small>` : ''}</h3><p>${escapeHtml(description)}</p></div></article>`;
      })
      .join('');
  }
  private name(key: string) {
    if (key.startsWith('step-')) return this.names.steps[Number(key.slice(5))]!;
    if (key.startsWith('job-')) return this.names.jobs[Number(key.slice(4))]!;
    return this.names[key as 'api' | 'queue' | 'worker'];
  }
  private highlight(text: string) {
    const names = [
      ...new Set([this.names.api, this.names.queue, this.names.worker, ...this.names.steps, ...this.names.jobs]),
    ].sort((name, otherName) => otherName.length - name.length);
    const expression = new RegExp(
      `(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
      'g',
    );
    return text
      .split(expression)
      .map((part) => (names.includes(part) ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)))
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
    this.timer = setInterval(() => this.advance(), TICK_MILLISECONDS / this.speed);
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
      this.history = this.history.slice(-MAXIMUM_RESTORED_TRIALS);
      saveSession(this.names, this.history, this.locale);
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
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
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
        config.workers = Math.min(AVAILABLE_WORKERS, Math.max(1, config.workers + (action === 'more' ? 1 : -1)));
      });
    if (action === 'concurrency-more' || action === 'concurrency-less')
      this.configure((config) => {
        config.concurrencyPerWorker = Math.min(
          MAXIMUM_CONCURRENCY_PER_WORKER,
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
        config.capacities[step] = Math.max(
          1,
          Math.min(MAXIMUM_STEP_CAPACITY, config.capacities[step]! + (action === 'grow' ? 1 : -1)),
        );
      });
    }
    if ((action === 'rate-more' || action === 'rate-less') && isHttpStep(Number(value))) {
      const step = Number(value) as 1 | 3;
      this.configure((config) => {
        config.rateLimits[step] = Math.max(
          1,
          Math.min(MAXIMUM_RATE_LIMIT, config.rateLimits[step] + (action === 'rate-more' ? 1 : -1)),
        );
      });
    }
    if (action === 'job') {
      this.selectedJob = Number(value);
      this.renderRadio();
    }
    if (action === 'worker') {
      this.selectedJob = this.state.jobs.find((job) => job.worker === Number(value))?.id ?? 0;
      this.renderRadio();
    }
    if (action === 'names') this.showNames();
    if (action === 'compare') this.showComparison();
    if (action === 'replay') {
      const trial = this.history[Number(value)];
      if (trial) {
        this.element<HTMLDialogElement>('dialog').close();
        this.configure((config) => Object.assign(config, structuredClone(trial.config)));
      }
    }
    if (action === 'cost') this.showCost();
    if (action === 'close') this.element<HTMLDialogElement>('dialog').close();
    if (action === 'modal-primary') {
      const callback = this.modalAction;
      this.element<HTMLDialogElement>('dialog').close();
      callback?.();
    }
  };
  private onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.rename;
    if (!key) return;
    const value = cleanLabel(input.value, this.name(key));
    if (key.startsWith('step-')) this.names.steps[Number(key.slice(5))] = value;
    else if (key.startsWith('job-')) this.names.jobs[Number(key.slice(4))] = value;
    else this.names[key as 'api' | 'queue' | 'worker'] = value;
    saveSession(this.names, this.history, this.locale);
    this.render();
  };
  private render() {
    const state = this.state,
      metrics = scalingMetrics(state),
      playing = state.phase === 'running';
    this.dataset.phase = state.phase;
    this.style.setProperty('--scaling-worker-tempo', `${WORKER_TEMPO_MILLISECONDS / this.speed}ms`);
    this.classList.toggle('is-playing', playing);
    this.querySelectorAll<HTMLElement>('[data-name]').forEach((node) => {
      node.textContent = this.name(node.dataset.name!);
    });
    this.element('[data-pending]').textContent = String(metrics.pending);
    this.element('[data-workers]').textContent = String(this.config.workers);
    this.element('[data-concurrency]').textContent = String(this.config.concurrencyPerWorker);
    this.element('[data-done]').textContent = `${metrics.completed}/${PAYMENT_COUNT}`;
    this.element('[data-time]').textContent = `${number(metrics.seconds, 1)} s`;
    this.element('[data-throughput]').textContent = `${number(metrics.throughput, 2)} ${this.copy.paymentsPerSecond}`;
    this.element('[data-occupied]').textContent = `${metrics.occupied}/${this.config.workers} ${this.copy.busy}`;
    this.element('[data-waiting]').textContent = `${metrics.waiting} ${this.copy.waitingForSlotStatus}`;
    this.element('[data-cost]').textContent = `${this.copy.cost} ${number(metrics.cost)} u`;
    this.element('[data-action=play]').textContent = playing
      ? this.copy.pause
      : state.phase === 'paused'
        ? this.copy.resume
        : state.phase === 'complete' || state.phase === 'rate-limited'
          ? this.copy.tryAgain
          : this.copy.processPaymentsAction;
    this.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('[data-config]').forEach(
      (control) => {
        control.disabled = playing;
      },
    );
    this.element<HTMLButtonElement>('[data-action=less]').disabled = playing || this.config.workers === 1;
    this.element<HTMLButtonElement>('[data-action=more]').disabled =
      playing || this.config.workers === AVAILABLE_WORKERS;
    this.element<HTMLButtonElement>('[data-action=concurrency-less]').disabled =
      playing || this.config.concurrencyPerWorker === 1;
    this.element<HTMLButtonElement>('[data-action=concurrency-more]').disabled =
      playing || this.config.concurrencyPerWorker === MAXIMUM_CONCURRENCY_PER_WORKER;
    for (const speed of PLAYBACK_SPEEDS)
      this.element(`[data-action="speed:${speed}"]`).setAttribute('aria-pressed', String(this.speed === speed));
    this.renderJobs();
    const scene = { root: this, state, config: this.config, names: this.names, copy: this.copy, playing };
    paintWorkers(scene);
    this.element('[data-team-summary]').textContent = this.copy.teamOccupancy(
      metrics.occupied,
      this.config.workers,
      metrics.inFlight,
      this.config.workers * this.config.concurrencyPerWorker,
    );
    paintSteps(scene);
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
      const parent = this.element(`[data-location="${location}"]`);
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
      packet.title = `${this.names.jobs[job.id - 1]!} · ${job.status === 'done' ? this.copy.completeLabel : (this.names.steps[job.step] ?? '')}`;
      packet.setAttribute('aria-label', packet.title);
      const progress =
        job.status === 'running' ? 1 - (job.until - this.state.tick) / this.config.durations[job.step]! : 0;
      packet.style.setProperty('--progress', `${progress * 100}%`);
    }
    if (this.state.phase === 'ready') {
      const queue = this.element('[data-location="pending"]');
      for (const packet of this.packets) queue.append(packet);
    }
  }
  private renderRadio() {
    const state = this.state,
      metrics = scalingMetrics(state);
    let text = '';
    if (state.rateLimit)
      text = this.copy.http429QuotaExhaustedAtStep(this.names.steps[state.rateLimit.step]!, state.rateLimit.limit);
    else if (this.selectedJob) {
      const job = state.jobs[this.selectedJob - 1]!;
      text = `${this.names.jobs[job.id - 1]!} · ${job.status === 'done' ? this.copy.completeStatus : job.status === 'pending' ? this.copy.storedWaitingForWorker : `${this.names.steps[job.step]!} · ${job.status === 'waiting' ? (job.step === 0 ? this.copy.waitingForCpuWorkerValidatesOneAtATime : this.copy.waitingForSlotBeforeSending) : this.copy.runningNow}`}`;
    } else if (state.phase === 'ready')
      text =
        this.config.workers === 1 && this.config.concurrencyPerWorker === 1
          ? this.copy.customersWaitingForSingleWorker
          : this.copy.teamReadyPaymentsAtOnce(this.config.workers, this.config.concurrencyPerWorker);
    else if (state.phase === 'paused') text = this.copy.playbackPausedResumeWhereYouLeft;
    else if (metrics.steps.some((step) => step.waiting.length)) {
      const busiest = metrics.steps.reduce(
        (best, step, index) => (step.waiting.length > metrics.steps[best]!.waiting.length ? index : best),
        0,
      );
      text =
        busiest === 0
          ? this.copy.hasPaymentsWaitingForCpu(this.names.steps[0]!, metrics.steps[0]!.waiting.length)
          : this.copy.hasPaymentsWaitingForSlots(this.names.steps[busiest]!, metrics.steps[busiest]!.waiting.length);
    } else if (state.phase === 'complete')
      text = scalingVerdict(state).won ? this.copy.all24CompleteOnTime : this.copy.allArrivedCompareTimeAndCost;
    else if (this.config.workers * this.config.concurrencyPerWorker > 1 && metrics.completed >= 2)
      text = this.copy.thatsBetterTheQueueIsShrinking;
    else {
      const current = state.events.findLast((event) => event.kind === 'started');
      text = current
        ? this.copy.jobIsAtStepGreenShowsRunning(this.names.jobs[current.job - 1]!, this.names.steps[current.step]!)
        : '';
    }
    const html = this.highlight(text);
    if (this.radioMarkup !== html) {
      this.element('[data-radio]').innerHTML = html;
      this.radioMarkup = html;
    }
  }
  private renderTrials() {
    this.renderAchievements();
    this.element('[data-trials]').innerHTML = this.history.length
      ? this.history
          .slice(-4)
          .map(
            (trial) =>
              `<span class="scaling-trial ${trial.won ? 'is-won' : ''}">${teamLabel(trial.config)} <span>→</span> ${number(trial.seconds, 1)} s <small>· ${number(trial.cost)} u</small></span>`,
          )
          .join('')
      : `<small>${this.copy.yourResultsWillAppearHere}</small>`;
  }
  private modal(title: string, body: string, label: string, callback?: () => void, tone = 'call') {
    this.pause();
    const dialog = this.element<HTMLDialogElement>('dialog');
    this.modalAction = callback;
    dialog.className = 'scaling-dialog';
    dialog.setAttribute('aria-labelledby', 'scaling-dialog-title');
    dialog.setAttribute('aria-describedby', 'scaling-dialog-text');
    dialog.dataset.tone = tone;
    dialog.innerHTML = `<header><span>${labFigure('phone')}${this.copy.onCallAsyncChaosLab}</span>${button('close', '×', `aria-label="${this.copy.close}"`)}</header><h2 id="scaling-dialog-title">${escapeHtml(title)}</h2><div id="scaling-dialog-text">${body}</div><footer>${button('modal-primary', label, 'class="scaling-primary"')}${button('close', this.copy.backToDiagram)}</footer>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector<HTMLButtonElement>('[data-action=modal-primary]')?.focus({ preventScroll: true });
  }
  private showCall(scene: 'intro') {
    const copy = callCopy(scene, this.names, this.locale);
    this.modal(
      copy.title,
      `<p>${this.highlight(copy.report)}</p><p class="scaling-call-hint">${this.highlight(copy.hint)}</p>`,
      copy.action,
    );
  }
  private showResult() {
    const rejection = this.state.rateLimit;
    if (rejection) {
      const dialog = this.element<HTMLDialogElement>('dialog');
      this.pause();
      this.modalAction = undefined;
      dialog.className = 'lab-outcome';
      dialog.dataset.tone = 'loss';
      dialog.setAttribute('aria-labelledby', 'lab-outcome-title');
      dialog.setAttribute('aria-describedby', 'lab-outcome-text');
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
      () => {
        this.element('[data-action=play]').focus({ preventScroll: true });
      },
      tone,
    );
  }
  private resultContext(): ResultContext {
    return {
      locale: this.locale,
      state: this.state,
      config: this.config,
      names: this.names,
      history: this.history,
      awards: this.renderNewAwards(),
    };
  }
  private showNames() {
    this.modal(
      this.copy.makeItYourSystem,
      namesDialog(this.locale, this.names, (key) => this.name(key)),
      this.copy.done,
    );
  }
  private showCost() {
    this.modal(this.copy.payingForReservedCapacity, costDialog(this.locale, this.state, this.config), this.copy.gotIt);
  }
  private showComparison() {
    this.modal(
      this.copy.sameWorkDifferentTeams,
      comparisonDialog(this.locale, this.history),
      this.copy.keepExperimenting,
    );
  }
}

if (!customElements.get('scaling-lab')) customElements.define('scaling-lab', QueueScaling);
