import { eligibleAchievements, scalingAchievements } from './achievements';
import type { ScalingAchievementId } from './achievements';
import { outcomeShell } from '../outcome-shell';
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
} from './engine';
import type { ScalingConfig } from './engine';
import { callCopy, scalingNames } from './content';
import type { Names } from './content';
import { cleanLabel, escapeHtml as esc } from '../labels';
import { labFigure } from '../figures';
import walkingAtlas from '../assets/worker-walk-atlas.webp?url';
import reactionsAtlas from '../assets/worker-reactions.webp?url';
import { teamWorkerFrame } from './team-actors';
import type { TeamPose } from './team-actors';

type Trial = {
  config: ScalingConfig;
  seconds: number;
  cost: number;
  completed: number;
  waitingSeconds: number;
  rateLimitedStep: number | null;
  won: boolean;
};
const button = (action: string, text: string, extra = '') =>
  `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const number = (value: number, digits = 0) =>
  value.toFixed(digits).replace(/\.0+$/, '');

/** The controller owns playback and presentation. All processing rules live in engine.ts. */
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
    return this.dataset.locale !== 'en';
  }
  private t(es: string, en: string) {
    return this.es ? es : en;
  }
  private q<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }
  private get storageKey() {
    return `async-scaling-v5-${this.es ? 'es' : 'en'}`;
  }

  connectedCallback() {
    this.names = scalingNames(this.es);
    this.loadSession();
    this.loadAchievements();
    this.innerHTML = `
      <div class="sc-mission"><span class="sc-mission-mark" aria-hidden="true">↗</span><p><strong>${this.t('24 pagos. Menos espera.', '24 payments. Less waiting.')}</strong><span>${this.t(`Tu misión: terminar en ${TARGET_SECONDS} s o menos y con un coste ≤ ${TARGET_COST} u. Sin plazas esperamos; superar la cuota HTTP da un 429.`, `Your mission: finish within ${TARGET_SECONDS} s and a cost ≤ ${TARGET_COST} u. Full slots mean waiting; exceeding the HTTP quota means a 429.`)}</span></p></div>
      <section class="sc-board" aria-label="${this.t('Recorrido de los pagos', 'Payment flow')}">
        <div class="sc-intake">
          ${button('names', `✎ ${this.t('Nombres', 'Names')}`, 'class="sc-edit-names"')}
          <div class="sc-api">${labFigure('api')}<strong data-name="api"></strong><span class="sc-202">202 <small>${this.t('recibido', 'accepted')}</small></span></div>
          <div class="sc-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="sc-queue-jobs" data-location="pending"></div><p>${this.t('Guardados · no se pierden', 'Durable · no losses')} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="sc-machine">
          <div class="sc-team">
            <div class="sc-team-heading">${labFigure('worker')}<div><small data-team-summary>${this.t('EQUIPO · HASTA 8 WORKERS', 'TEAM · UP TO 8 WORKERS')}</small><strong data-name="worker"></strong></div><div class="sc-hire">${button('less', '−', `aria-label="${this.t('Quitar un worker', 'Remove one worker')}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${this.t('Añadir un worker', 'Add one worker')}" data-config`)}</div></div>
            <div class="sc-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, i) => button(`worker:${i + 1}`, `<span class="sc-worker-name">W${String(i + 1).padStart(2, '0')}</span><span class="sc-worker-character" aria-hidden="true"><span class="sc-worker-sprite"></span><span class="sc-worker-signal" data-worker-signal></span></span><b>—</b><small data-worker-status></small>`, `data-worker="${i + 1}" class="sc-worker" hidden`)).join('')}</div>
          </div>
          <div class="sc-flow">${[0, 1, 2, 3].map((step) => this.stepCard(step)).join('')}</div>
          <div class="sc-delivered"><span>✓ ${this.t('Completados', 'Completed')}</span><div data-location="done"></div><b data-done>0/24</b></div>
        </div>
      </section>
      <aside class="sc-radio" role="status" aria-live="polite">${labFigure('phone')}<div><small>${this.t('GUARDIA · EN DIRECTO', 'ON CALL · LIVE')}</small><p data-radio>${this.t('Tenemos una cola de clientes esperando. Dale al play y mira quién tarda.', 'Customers are waiting. Press play and see where the time goes.')}</p></div></aside>
      <div class="sc-dock">
        <div class="sc-playback">${button('play', `▶ ${this.t('Procesar pagos', 'Process payments')}`, 'class="sc-primary"')}${button('reset', '↺', `aria-label="${this.t('Reiniciar intento', 'Reset trial')}"`)}<div class="sc-speeds" role="group" aria-label="${this.t('Velocidad de reproducción', 'Playback speed')}">${[1, 2, 4].map((speed) => button(`speed:${speed}`, `×${speed}`, `aria-pressed="${speed === this.speed}"`)).join('')}</div></div>
        <div class="sc-clock"><strong data-time>0 s</strong><span data-throughput>0 ${this.t('pagos/s', 'payments/s')}</span></div>
        <div class="sc-dock-metrics"><span data-occupied></span><span data-waiting></span>${button('cost', '<span data-cost></span>', `aria-label="${this.t('Ver cómo se calcula el coste', 'Show the cost calculation')}"`)}</div>
      </div>
      <div class="sc-trial-bar"><span>${this.t('Tus intentos', 'Your trials')}</span><div data-trials></div>${button('compare', this.t('Comparar ↗', 'Compare ↗'))}</div>
      <details class="qs-achievements">
        <summary data-achievement-summary></summary>
        <p>${this.t('Logros de esta sesión del navegador. Los reinicios del laboratorio no los borran.', 'Achievements for this browser session. Resetting the lab does not erase them.')}</p>
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
    const resources = [
      'CPU · 1 s',
      'HTTP · 3 s',
      `${this.t('BDD', 'DB')} · 1 s`,
      'HTTP · 1 s',
    ];
    return `<article class="sc-step" data-step="${step}">
      <div class="sc-step-heading"><small>0${step + 1} <span>${resources[step]}</span></small><strong data-name="step-${step}"></strong></div>
      <div class="sc-resource"><span data-status="${step}"></span><b data-capacity="${step}"></b></div>
      <div class="sc-slots" data-location="active-${step}"></div>
      <div class="sc-wait"><small data-wait-label="${step}">${this.t('Esperando turno', 'Waiting for a slot')}</small><div data-location="waiting-${step}"></div></div>
      <div class="sc-step-controls"><span>${this.t('Plazas simultáneas', 'Concurrent slots')}</span><div class="sc-capacity-control">${button(`shrink:${step}`, '−', `data-config aria-label="${this.t('Reducir capacidad del paso', 'Reduce capacity of step')} ${step + 1}"`)}<output data-resource-size="${step}"></output>${button(`grow:${step}`, '+', `data-config aria-label="${this.t('Ampliar capacidad del paso', 'Expand capacity of step')} ${step + 1}"`)}</div></div>
      <small class="sc-capacity-cost" data-resource-cost="${step}"></small>
      ${isHttpStep(step) ? `<div class="sc-step-controls sc-rate-controls"><span>${this.t('Cuota HTTP / s', 'HTTP quota / s')}</span><div class="sc-capacity-control">${button(`rate-less:${step}`, '−', `data-config aria-label="${this.t('Reducir cuota HTTP del paso', 'Reduce HTTP quota of step')} ${step + 1}"`)}<output data-rate-limit="${step}"></output>${button(`rate-more:${step}`, '+', `data-config aria-label="${this.t('Ampliar cuota HTTP del paso', 'Expand HTTP quota of step')} ${step + 1}"`)}</div></div><small class="sc-rate-usage" data-rate-usage="${step}"></small><small class="sc-capacity-cost" data-rate-cost="${step}"></small>` : ''}
    </article>`;
  }
  private loadSession() {
    try {
      const current = sessionStorage.getItem(this.storageKey);
      // Keep customized names; runs under the old collapse rule are not comparable.
      const saved = JSON.parse(current ?? sessionStorage.getItem(`async-scaling-v4-${this.es ? 'es' : 'en'}`) ?? '{}');
      if (saved.names && typeof saved.names === 'object') {
        for (const key of ['api', 'queue', 'worker'] as const)
          this.names[key] = cleanLabel(saved.names[key], this.names[key]);
        for (const key of ['steps', 'jobs'] as const)
          this.names[key] = this.names[key].map((fallback, i) =>
            cleanLabel(saved.names[key]?.[i], fallback),
          );
      }
      if (current && Array.isArray(saved.history))
        this.history = saved.history.slice(-8).filter((trial: Trial) => {
          try {
            createScaling(trial.config);
          } catch {
            return false;
          }
          trial.won =
            trial.completed === PAYMENT_COUNT &&
            trial.config.workers <= AVAILABLE_WORKERS &&
            trial.seconds <= TARGET_SECONDS &&
            trial.cost <= TARGET_COST && trial.rateLimitedStep === null;
          return (
            trial.config.workers <= AVAILABLE_WORKERS &&
            (trial.rateLimitedStep === null || isHttpStep(trial.rateLimitedStep)) &&
            [
              trial.seconds,
              trial.cost,
              trial.completed,
              trial.waitingSeconds,
            ].every(
              (value) =>
                typeof value === 'number' &&
                Number.isFinite(value) &&
                value >= 0 &&
                value <= 100_000,
            ) &&
            typeof trial.won === 'boolean'
          );
        });
    } catch {
      /* The lab also works without browser storage. */
    }
  }
  private loadAchievements() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('async-scaling-achievements-v1') ?? '{}');
      if (Array.isArray(saved.ids))
        this.unlocked = new Set(scalingAchievements.filter(({ id }) => saved.ids.includes(id)).map(({ id }) => id));
    } catch { /* Achievements also work with browser storage blocked. */ }
  }
  private checkAchievements() {
    this.newAwards = eligibleAchievements(this.state)
      .filter((id) => !this.unlocked.has(id));
    this.newAwards.forEach((id) => this.unlocked.add(id));
    try {
      sessionStorage.setItem('async-scaling-achievements-v1', JSON.stringify({
        ids: [...this.unlocked],
      }));
    } catch { /* Optional session persistence. */ }
  }
  private renderNewAwards() {
    return `<div class="sc-result-awards">${scalingAchievements.filter(({ id }) => this.newAwards.includes(id)).map((award) => {
      const [title, description] = this.es ? award.es : award.en;
      return `<div class="qs-earned" data-earned="${award.id}"><span aria-hidden="true">✦</span><div><small class="qs-award-label">${this.t('LOGRO DESBLOQUEADO', 'ACHIEVEMENT UNLOCKED')}</small><strong>${esc(title)}</strong><p>${esc(description)}</p></div></div>`;
    }).join('')}</div>`;
  }
  private renderAchievements() {
    this.q('[data-achievement-summary]').textContent = `✦ ${this.t('Logros de sesión', 'Session achievements')} · ${this.unlocked.size}/${scalingAchievements.length}`;
    this.q('[data-achievements]').innerHTML = scalingAchievements.map((award) => {
      const unlocked = this.unlocked.has(award.id);
      const [title, description] = this.es ? award.es : award.en;
      return `<article class="${unlocked ? 'is-unlocked' : ''}" data-achievement="${award.id}"><span aria-hidden="true">${unlocked ? '✦' : '◇'}</span><div><h3>${esc(title)}${unlocked ? ` <small>· ${this.t('conseguido', 'unlocked')}</small>` : ''}</h3><p>${esc(description)}</p></div></article>`;
    }).join('');
  }
  private saveSession() {
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({
          names: this.names,
          history: this.history,
        }),
      );
    } catch {
      /* Optional session persistence. */
    }
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
      this.saveSession();
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
    this.saveSession();
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
    this.q('[data-done]').textContent = `${metrics.completed}/${PAYMENT_COUNT}`;
    this.q('[data-time]').textContent = `${number(metrics.seconds, 1)} s`;
    this.q('[data-throughput]').textContent =
      `${number(metrics.throughput, 2)} ${this.t('pagos/s', 'payments/s')}`;
    this.q('[data-occupied]').textContent =
      `${metrics.occupied}/${this.config.workers} ${this.t('ocupados', 'busy')}`;
    this.q('[data-waiting]').textContent =
      `${metrics.waiting} ${this.t('esperando plaza', 'waiting for a slot')}`;
    this.q('[data-cost]').textContent =
      `${this.t('Coste', 'Cost')} ${number(metrics.cost)} u`;
    this.q('[data-action=play]').textContent = playing
      ? this.t('Ⅱ Pausar', 'Ⅱ Pause')
      : state.phase === 'paused'
        ? this.t('▶ Seguir', '▶ Resume')
        : state.phase === 'complete' || state.phase === 'rate-limited'
          ? this.t('↻ Otra prueba', '↻ Try again')
          : this.t('▶ Procesar pagos', '▶ Process payments');
    this.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
      '[data-config]',
    ).forEach((control) => {
      control.disabled = playing;
    });
    this.q<HTMLButtonElement>('[data-action=less]').disabled =
      playing || this.config.workers === 1;
    this.q<HTMLButtonElement>('[data-action=more]').disabled =
      playing || this.config.workers === AVAILABLE_WORKERS;
    for (const speed of [1, 2, 4])
      this.q(`[data-action="speed:${speed}"]`).setAttribute(
        'aria-pressed',
        String(this.speed === speed),
      );
    this.renderJobs();
    this.querySelectorAll<HTMLElement>('[data-worker]').forEach((worker) => {
      const id = Number(worker.dataset.worker),
        job = state.jobs.find((job) => job.worker === id),
        frame = teamWorkerFrame(state, id);
      worker.hidden = id > this.config.workers;
      worker.classList.toggle('is-busy', !!job);
      worker.classList.toggle('is-waiting', frame.pose.startsWith('waiting'));
      worker.dataset.pose = frame.pose;
      const labels: Record<TeamPose, string> = {
        idle: this.t('Libre', 'Idle'),
        working: this.t('Validando', 'Validating'),
        'waiting-cpu': this.t('Espera CPU', 'Waiting for CPU'),
        'waiting-service': this.t('Espera respuesta', 'Awaiting reply'),
        'waiting-slot': this.t('Espera plaza', 'Waiting for a slot'),
        rejected: this.t('Rechazado · 429', 'Rejected · 429'),
        paused: this.t('En pausa', 'Paused'),
        done: this.t('Completado', 'Complete'),
      };
      worker.title = `${this.names.worker} ${id} · ${labels[frame.pose]}${job ? ` · ${this.names.jobs[job.id - 1]} · ${this.names.steps[job.step]}` : ''}`;
      worker.setAttribute('aria-label', worker.title);
      worker.querySelector('b')!.textContent = job ? `#${job.id} · P${job.step + 1}` : '—';
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
    this.q('[data-team-summary]').textContent = this.t(
      `EQUIPO · ${metrics.occupied}/${this.config.workers} WORKERS OCUPADOS`,
      `TEAM · ${metrics.occupied}/${this.config.workers} WORKERS BUSY`,
    );
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
        `${step.active.length}/${step.capacity} ${this.t('en uso', 'in use')}`;
      this.q(`[data-status="${index}"]`).textContent = state.rateLimit?.step === index
        ? this.t('429 · cuota agotada', '429 · quota exhausted')
        : state.phase === 'rate-limited'
        ? this.t('Ensayo detenido', 'Trial stopped')
        : step.waiting.length
        ? this.t('Sin plazas · espera local', 'Full · waiting locally')
        : step.active.length
        ? this.t('En marcha', 'Working')
        : this.t('Disponible', 'Available');
      this.q(`[data-wait-label="${index}"]`).textContent = `${step.waiting.length} ${this.t('esperando plaza', 'waiting for a slot')}${step.rejected.length ? this.t(' · 1 rechazada (429)', ' · 1 rejected (429)') : ''}`;
      this.q(`[data-resource-size="${index}"]`).textContent = String(step.capacity);
      this.q<HTMLButtonElement>(`[data-action="grow:${index}"]`).disabled = playing || step.capacity === 8;
      this.q<HTMLButtonElement>(`[data-action="shrink:${index}"]`).disabled = playing || step.capacity === 1;
      const extra = Math.max(0, step.capacity - BASE_CAPACITIES[index]!);
      this.q(`[data-resource-cost="${index}"]`).textContent = extra
        ? `+${extra} ${this.t('u/s de capacidad', 'capacity units/s')}`
        : this.t('Capacidad incluida', 'Included capacity');
      if (isHttpStep(index)) {
        const limit = this.config.rateLimits[index];
        this.q(`[data-rate-limit="${index}"]`).textContent = String(limit);
        this.q(`[data-rate-usage="${index}"]`).textContent = this.t(`${state.requestsInWindow[index]}/${limit} en esta ventana de 1 s`, `${state.requestsInWindow[index]}/${limit} in this 1 s window`);
        this.q<HTMLButtonElement>(`[data-action="rate-more:${index}"]`).disabled = playing || limit === 8;
        this.q<HTMLButtonElement>(`[data-action="rate-less:${index}"]`).disabled = playing || limit === 1;
        const quotaExtra = Math.max(0, limit - BASE_RATE_LIMITS[index]);
        this.q(`[data-rate-cost="${index}"]`).textContent = quotaExtra
          ? this.t(`+${quotaExtra} u/s de cuota`, `+${quotaExtra} quota units/s`)
          : this.t('Cuota incluida', 'Included quota');
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
      packet.title = `${this.names.jobs[job.id - 1]} · ${job.status === 'done' ? this.t('Completado', 'Complete') : (this.names.steps[job.step] ?? '')}`;
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
      text = this.t(`HTTP 429 en ${this.names.steps[state.rateLimit.step]}: se agotó la cuota de ${state.rateLimit.limit} peticiones/s. El servicio sigue activo. El ensayo se detuvo y los pagos se conservan.`, `HTTP 429 at ${this.names.steps[state.rateLimit.step]}: the quota of ${state.rateLimit.limit} requests/s was exhausted. The service is still up. The trial stopped and payments are retained.`);
    else if (this.selectedJob) {
      const job = state.jobs[this.selectedJob - 1]!;
      text = `${this.names.jobs[job.id - 1]} · ${job.status === 'done' ? this.t('completado', 'complete') : job.status === 'pending' ? this.t('guardado, esperando un worker', 'stored, waiting for a worker') : `${this.names.steps[job.step]} · ${job.status === 'waiting' ? this.t('esperando una plaza antes de enviar; su worker sigue ocupado', 'waiting for a slot before sending; its worker remains busy') : this.t('ejecutándose ahora', 'running now')}`}`;
    } else if (state.phase === 'ready')
      text =
        this.config.workers === 1
          ? this.t(
              '24 clientes esperando. Un worker se encarga de cada pago de principio a fin.',
              '24 customers waiting. One worker takes each payment from start to finish.',
            )
          : this.t(
              `Equipo preparado: ${this.config.workers} workers. Ponlo en marcha y sigue los pagos verdes.`,
              `Team ready: ${this.config.workers} workers. Start it and follow the green payments.`,
            );
    else if (state.phase === 'paused')
      text = this.t(
        'Película en pausa. Puedes seguir donde estabas o cambiar el equipo para preparar otro intento.',
        'Playback paused. Resume where you left off, or change the team to prepare another trial.',
      );
    else if (metrics.steps.some((step) => step.waiting.length)) {
      const busiest = metrics.steps.reduce(
        (best, step, index) =>
          step.waiting.length > metrics.steps[best]!.waiting.length
            ? index
            : best,
        0,
      );
      text = this.t(
        `${this.names.steps[busiest]} tiene ${metrics.steps[busiest]!.waiting.length} pagos esperando plaza. Sus workers conservan el pago: todavía no enviaron esas peticiones.`,
        `${this.names.steps[busiest]} has ${metrics.steps[busiest]!.waiting.length} payments waiting for slots. Their workers hold the payments: those requests have not been sent yet.`,
      );
    } else if (state.phase === 'complete')
      text = scalingVerdict(state).won
        ? this.t(
            'Los 24 completados. A tiempo, sin duplicados y dentro del presupuesto. ¿Puedes mejorar tu marca?',
            'All 24 complete. On time, no duplicates, within budget. Can you improve your result?',
          )
        : this.t(
            'Todos llegaron. Compara el tiempo y el coste antes de decidir qué cambiar.',
            'All arrived. Compare time and cost before choosing what to change.',
          );
    else if (this.config.workers > 1 && metrics.completed >= 2)
      text = this.t(
        '¡Ahora sí! La cola baja más rápido. Fíjate en las plazas de cada servicio antes de seguir contratando.',
        'That’s better! The queue is shrinking faster. Watch each service’s slots before adding more workers.',
      );
    else {
      const current = state.events.findLast(
        (event) => event.kind === 'started',
      );
      text = current
        ? this.t(
            `${this.names.jobs[current.job - 1]} está en ${this.names.steps[current.step]}. El verde indica qué se ejecuta; el reloj cuenta tiempo simulado.`,
            `${this.names.jobs[current.job - 1]} is at ${this.names.steps[current.step]}. Green shows what is running; the clock shows simulated time.`,
          )
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
              `<span class="sc-trial ${trial.won ? 'is-won' : ''}">${trial.config.workers} W <span>→</span> ${number(trial.seconds, 1)} s <small>· ${number(trial.cost)} u</small></span>`,
          )
          .join('')
      : `<small>${this.t('Tus resultados aparecerán aquí. Compara tus propios intentos.', 'Your results will appear here. Compare your own trials.')}</small>`;
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
    dialog.innerHTML = `<header><span>${labFigure('phone')}${this.t('GUARDIA · ASYNC CHAOS LAB', 'ON CALL · ASYNC CHAOS LAB')}</span>${button('close', '×', `aria-label="${this.t('Cerrar', 'Close')}"`)}</header><h2 id="sc-dialog-title">${esc(title)}</h2><div id="sc-dialog-text">${body}</div><footer>${button('modal-primary', label, 'class="sc-primary"')}${button('close', this.t('Volver al diagrama', 'Back to diagram'))}</footer>`;
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
      const metrics = scalingMetrics(this.state),
        step = rejection.step,
        dialog = this.q<HTMLDialogElement>('dialog');
      this.pause();
      this.modalAction = undefined;
      dialog.className = 'qs-outcome';
      dialog.dataset.tone = 'loss';
      dialog.setAttribute('aria-labelledby', 'qs-outcome-title');
      dialog.setAttribute('aria-describedby', 'qs-outcome-text');
      dialog.innerHTML = outcomeShell({
        es: this.es, trial: this.history.length, fatal: true,
        kicker: this.t('ENSAYO DETENIDO / HTTP 429', 'TRIAL STOPPED / HTTP 429'),
        title: this.t('Había plazas. Se agotó la cuota.', 'Slots were free. The quota ran out.'),
        evidence: `<div class="sc-rate-evidence"><strong>HTTP 429</strong><p>${esc(this.names.steps[step]!)} · ${esc(this.names.jobs[rejection.job - 1]!)}</p><p>${this.t(`${this.state.requestsInWindow[step]}/${rejection.limit} peticiones aceptadas en esta ventana de 1 s · ${metrics.steps[step]!.active.length}/${this.config.capacities[step]} plazas en uso`, `${this.state.requestsInWindow[step]}/${rejection.limit} requests accepted in this 1 s window · ${metrics.steps[step]!.active.length}/${this.config.capacities[step]} concurrent slots in use`)}</p></div>`,
        text: this.t(`El proveedor rechazó esta petición por superar su cuota de ${rejection.limit} peticiones por segundo, aunque quedaba una plaza libre. El servicio sigue activo y la petición rechazada no produjo su efecto. Los pagos y los efectos anteriores se conservan. La siguiente ventana empieza en ${number(rejection.retryAfterSeconds, 1)} s simulados, pero este ensayo no reintenta automáticamente. Revisa los workers, las plazas o la cuota antes de otra prueba.`, `The provider rejected this request for exceeding its quota of ${rejection.limit} requests per second, even though a concurrent slot was free. The service is still up and the rejected request produced no effect. Payments and earlier effects are retained. The next window starts in ${number(rejection.retryAfterSeconds, 1)} simulated seconds, but this trial does not retry automatically. Review workers, slots or quota before another trial.`),
        actions: button('close', this.t('Revisar mi sistema', 'Review my system'), 'data-primary'),
        dismissAction: 'close', awards: '',
      });
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-primary]')?.focus({ preventScroll: true });
      return;
    }
    const metrics = scalingMetrics(this.state),
      verdict = scalingVerdict(this.state);
    const title = verdict.won
      ? this.t('Ahora sí llegamos a tiempo.', 'Now we are on time.')
      : !verdict.fast
        ? this.t('Llegaron. Los últimos esperaron demasiado.', 'They arrived. The last ones waited too long.')
        : this.t('Llegaron. A un coste demasiado alto.', 'They arrived. At too high a cost.');
    const previous = this.history.slice(0, -1).findLast((trial) => trial.completed === PAYMENT_COUNT);
    const currentResult = `<div><small>${this.t('ESTE INTENTO', 'THIS TRIAL')} · ${this.config.workers} WORKERS</small><strong>${number(metrics.seconds, 1)} s</strong><span>${number(metrics.throughput, 2)} ${this.t('pagos/s', 'payments/s')} · ${number(metrics.cost)} u</span></div>`;
    const comparison = previous
      ? `<div class="sc-before-after"><div><small>${this.t('TU INTENTO ANTERIOR', 'YOUR PREVIOUS TRIAL')} · ${previous.config.workers} WORKERS</small><strong>${number(previous.seconds, 1)} s</strong><span>${number(previous.completed / previous.seconds, 2)} ${this.t('pagos/s', 'payments/s')} · ${number(previous.cost)} u</span></div><span aria-hidden="true">→</span>${currentResult}</div>`
      : `<div class="sc-before-after sc-first-result">${currentResult}</div><p class="sc-first-trial">${this.t('Es tu primer intento completado. El siguiente se comparará con este resultado.', 'This is your first completed trial. The next one will be compared with this result.')}</p>`;
    const flags = [
      [verdict.fast, `≤ ${TARGET_SECONDS} s`],
      [verdict.economical, `≤ ${TARGET_COST} u`],
      [verdict.safe, this.t('Un efecto por paso', 'One effect per step')],
    ] as const;
    this.modal(
      title,
      `<p class="sc-result-label">${verdict.won ? this.t('MISIÓN SUPERADA', 'MISSION COMPLETE') : this.t('ENSAYO TERMINADO · AJUSTA TU SISTEMA', 'TRIAL COMPLETE · ADJUST YOUR SYSTEM')}</p>${comparison}<div class="sc-checks">${flags.map(([ok, label]) => `<span data-ok="${ok}">${ok ? '✓' : '×'} ${label}</span>`).join('')}</div><p>${this.t(`${metrics.completed}/24 pagos · ningún efecto duplicado · ${number(metrics.waitingSeconds, 1)} s de espera acumulada.`, `${metrics.completed}/24 payments · no duplicate effects · ${number(metrics.waitingSeconds, 1)} s of cumulative waiting.`)}</p><p class="sc-call-hint">${verdict.won ? this.t('Los workers y las plazas de los servicios están equilibrados. Compara tus intentos: ampliar todo también tiene un coste.', 'Workers and service slots are balanced. Compare your trials: expanding everything has a cost too.') : this.t('Cada worker conserva su pago mientras espera plaza. Busca dónde se acumula la espera: añadir workers no acelera un servicio que ya está lleno.', 'Each worker holds its payment while waiting for a slot. Find where waiting builds up: adding workers cannot speed up a service that is already full.')}</p>${this.renderNewAwards()}`,
      this.t('Volver a mi sistema', 'Back to my system'),
      () => { this.q('[data-action=play]').focus({ preventScroll: true }); },
      verdict.won ? 'win' : 'review',
    );
  }
  private showNames() {
    const defaults = scalingNames(this.es);
    const field = (key: string, label: string) =>
      `<label>${esc(label)}<input data-rename="${key}" maxlength="64" value="${esc(this.name(key))}" /></label>`;
    this.modal(
      this.t('Ponle tus nombres.', 'Make it your system.'),
      `<p>${this.t('Los nombres cambian el relato; las reglas del experimento se mantienen.', 'Names change the story; the experiment rules stay the same.')}</p><div class="sc-name-fields">${field('api', 'API')}${field('queue', this.t('Cola', 'Queue'))}${field('worker', 'Worker')}${this.names.steps.map((_, i) => field(`step-${i}`, `${this.t('Paso', 'Step')} ${i + 1}`)).join('')}<details><summary>${this.t('Nombres de los 24 pagos', 'Names of the 24 payments')}</summary>${this.names.jobs.map((_, i) => field(`job-${i}`, defaults.jobs[i]!)).join('')}</details></div>`,
      this.t('Listo', 'Done'),
    );
  }
  private showCost() {
    const metrics = scalingMetrics(this.state);
    this.modal(
      this.t('Pagar por tenerlo reservado.', 'Paying for reserved capacity.'),
      `<p>${this.t('Son unidades educativas, no euros ni tarifas reales. Cada worker reservado cuesta 1 u por segundo simulado, tanto si trabaja como si espera.', 'These are teaching units, not real prices. Each reserved worker costs 1 unit per simulated second, whether working or waiting.')}</p><p><strong>${this.config.workers} × ${number(metrics.seconds, 1)} s = ${number(metrics.workerCost)} u</strong></p><p>${this.t('El contrato original está incluido. Cada plaza extra añade 1 u/s.', 'The original service contract is included. Each extra concurrent slot adds 1 unit/s.')} ${this.config.capacities.reduce((total, capacity, step) => total + Math.max(0, capacity - BASE_CAPACITIES[step]!), 0)} × ${number(metrics.seconds, 1)} s = ${number(metrics.extraServiceCost)} u.</p><p>${this.t(`Cada petición/s extra de cuota HTTP añade 1 u/s. Cuota extra: ${number(metrics.extraRateCost)} u.`, `Each extra request/s of HTTP quota adds 1 unit/s. Extra quota cost: ${number(metrics.extraRateCost)} units.`)}</p><p>${this.t('Eficiencia = pagos completados / unidades reservadas. El objetivo combina rapidez, plazas, cuota y un coste máximo; no premia únicamente gastar menos.', 'Efficiency = completed payments / reserved units. The mission combines speed, slots, quota and a cost ceiling; spending less alone is not enough.')}</p>`,
      this.t('Entendido', 'Got it'),
    );
  }
  private showComparison() {
    this.modal(
      this.t(
        'Mismo trabajo. Distintos equipos.',
        'Same work. Different teams.',
      ),
      this.history.length
        ? `<div class="sc-comparison"><table><thead><tr>${[this.t('Workers / Stripe', 'Workers / Stripe'), this.t('Tiempo', 'Time'), this.t('Espera acumulada', 'Cumulative waiting'), this.t('Coste', 'Cost'), this.t('Pagos/u', 'Payments/u')].map((title) => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${this.history.map((trial, index) => `<tr><td>${button(`replay:${index}`, `${trial.config.workers} W / ${trial.config.capacities[1]} ${trial.won ? '✓' : ''}`, `aria-label="${this.t('Preparar esta configuración', 'Prepare this configuration')}"`)}<small class="sc-trial-config">${trial.config.capacities.map((limit) => limit).join(' / ')}<br />HTTP ${trial.config.rateLimits[1]} / ${trial.config.rateLimits[3]} ${this.t('peticiones/s', 'requests/s')}</small></td><td>${number(trial.seconds, 1)} s${trial.rateLimitedStep !== null ? `<small class="sc-rejected-result">429 · ${this.t('paso', 'step')} ${trial.rateLimitedStep + 1}</small>` : ''}</td><td>${number(trial.waitingSeconds, 1)} s</td><td>${number(trial.cost)} u</td><td>${number(trial.completed / (trial.cost || 1), 3)}</td></tr>`).join('')}</tbody></table></div><p class="sc-call-hint">${this.t('Se guardan los últimos 8 intentos terminados en esta sesión. La reproducción ×1, ×2 o ×4 no altera sus resultados. El coste incluye todas las plazas reservadas. Bajo cada equipo aparecen las cuatro capacidades. La espera suma el tiempo de todos los workers: dos esperando 1 s suman 2 s. Pulsa un equipo para volver a probarlo.', 'The last 8 finished trials are kept in this session. Playback at ×1, ×2 or ×4 never changes their results. Cost includes all reserved slots. Each team shows its four resource capacities. Waiting adds up across workers: two waiting for 1 s count as 2 s. Click a team to try it again.')}</p>`
        : `<p>${this.t('Completa un intento para empezar a comparar. No guardamos los que reinicias a medias.', 'Finish a trial to start comparing. Runs reset halfway are not saved.')}</p>`,
      this.t('Seguir probando', 'Keep experimenting'),
    );
  }
}

if (!customElements.get('queue-scaling-game'))
  customElements.define('queue-scaling-game', QueueScaling);
