import { eligibleAchievements, scalingAchievements } from './achievements';
import type { ScalingAchievementId } from './achievements';
import { outcomeShell } from '../outcome-shell';
import {
  createScaling,
  BASE_CAPACITIES,
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

type Trial = {
  config: ScalingConfig;
  seconds: number;
  cost: number;
  completed: number;
  outageStep: number | null;
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
    return `async-scaling-v4-${this.es ? 'es' : 'en'}`;
  }

  connectedCallback() {
    this.names = scalingNames(this.es);
    this.loadSession();
    this.loadAchievements();
    this.innerHTML = `
      <div class="sc-mission"><span class="sc-mission-mark" aria-hidden="true">↗</span><p><strong>${this.t('24 pagos. Menos espera.', '24 payments. Less waiting.')}</strong><span>${this.t(`Tu misión: terminar en ${TARGET_SECONDS} s o menos, sin saturar los servicios y con un coste ≤ ${TARGET_COST} u.`, `Your mission: finish within ${TARGET_SECONDS} s, without overwhelming services and a cost ≤ ${TARGET_COST} u.`)}</span></p></div>
      <section class="sc-board" aria-label="${this.t('Recorrido de los pagos', 'Payment flow')}">
        <div class="sc-intake">
          ${button('names', `✎ ${this.t('Nombres', 'Names')}`, 'class="sc-edit-names"')}
          <div class="sc-api">${labFigure('api')}<strong data-name="api"></strong><span class="sc-202">202 <small>${this.t('recibido', 'accepted')}</small></span></div>
          <div class="sc-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="sc-queue-jobs" data-location="pending"></div><p>${this.t('Guardados · no se pierden', 'Durable · no losses')} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="sc-machine">
          <div class="sc-team">
            <div class="sc-team-heading">${labFigure('worker')}<div><small data-team-summary>${this.t('EQUIPO · HASTA 8 WORKERS', 'TEAM · UP TO 8 WORKERS')}</small><strong data-name="worker"></strong></div><div class="sc-hire">${button('less', '−', `aria-label="${this.t('Quitar un worker', 'Remove one worker')}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${this.t('Añadir un worker', 'Add one worker')}" data-config`)}</div></div>
            <div class="sc-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, i) => button(`worker:${i + 1}`, `<span>W${String(i + 1).padStart(2, '0')}</span><b>—</b>`, `data-worker="${i + 1}" class="sc-worker" hidden`)).join('')}</div>
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
      <div class="sc-step-controls"><span>${this.t('Capacidad', 'Capacity')}</span><div class="sc-capacity-control">${button(`shrink:${step}`, '−', `data-config aria-label="${this.t('Reducir capacidad del paso', 'Reduce capacity of step')} ${step + 1}"`)}<output data-resource-size="${step}"></output>${button(`grow:${step}`, '+', `data-config aria-label="${this.t('Ampliar capacidad del paso', 'Expand capacity of step')} ${step + 1}"`)}</div></div>
      <small class="sc-capacity-cost" data-resource-cost="${step}"></small>
    </article>`;
  }
  private loadSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.storageKey) ?? '{}');
      if (saved.names && typeof saved.names === 'object') {
        for (const key of ['api', 'queue', 'worker'] as const)
          this.names[key] = cleanLabel(saved.names[key], this.names[key]);
        for (const key of ['steps', 'jobs'] as const)
          this.names[key] = this.names[key].map((fallback, i) =>
            cleanLabel(saved.names[key]?.[i], fallback),
          );
      }
      if (Array.isArray(saved.history))
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
            trial.cost <= TARGET_COST &&
            trial.outageStep === null;
          return (
            trial.config.workers <= AVAILABLE_WORKERS &&
            [
              trial.seconds,
              trial.cost,
              trial.completed,
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
    if (this.state.phase === 'complete' || this.state.phase === 'blocked') {
      this.state = createScaling(this.config);
    }
    this.state = playScaling(this.state);
    this.stopTimer();
    this.timer = setInterval(() => this.advance(), 120 / this.speed);
    this.render();
  }
  private advance() {
    this.state = tickScaling(this.state);
    if (this.state.phase === 'complete' || this.state.phase === 'blocked') {
      this.stopTimer();
      this.checkAchievements();
      const metrics = scalingMetrics(this.state);
      const verdict = scalingVerdict(this.state);
      this.history.push({
        config: structuredClone(this.config),
        seconds: metrics.seconds,
        cost: metrics.cost,
        completed: metrics.completed,
        outageStep: this.state.outageStep,
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
    this.classList.toggle('is-playing', playing);
    this.classList.toggle('is-broken', state.phase === 'blocked');
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
      `${metrics.waiting} ${this.t('esperando', 'waiting')}`;
    this.q('[data-cost]').textContent =
      `${this.t('Coste', 'Cost')} ${number(metrics.cost)} u`;
    this.q('[data-action=play]').textContent = playing
      ? this.t('Ⅱ Pausar', 'Ⅱ Pause')
      : state.phase === 'paused'
        ? this.t('▶ Seguir', '▶ Resume')
        : state.phase === 'complete' || state.phase === 'blocked'
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
        job = state.jobs.find((job) => job.worker === id);
      worker.hidden = id > this.config.workers;
      worker.classList.toggle('is-busy', !!job);
      worker.classList.toggle('is-waiting', !!job && job.status !== 'running');
      worker.title = `${this.names.worker} ${id} · ${job ? `${this.names.jobs[job.id - 1]} · ${this.names.steps[job.step]}` : this.t('libre', 'idle')}`;
      worker.querySelector('b')!.textContent = job ? `#${job.id} · P${job.step + 1}` : '—';
    });
    this.q('[data-team-summary]').textContent = this.t(
      `EQUIPO · ${metrics.occupied}/${this.config.workers} WORKERS OCUPADOS`,
      `TEAM · ${metrics.occupied}/${this.config.workers} WORKERS BUSY`,
    );
    metrics.steps.forEach((step, index) => {
      const node = this.q(`[data-step="${index}"]`);
      node.classList.toggle('is-working', step.active.length > 0);
      node.classList.toggle('is-down', state.outageStep === index);
      node.classList.toggle('is-congested', step.waiting.length > 0);
      node.style.setProperty(
        '--load',
        `${(step.active.length / step.capacity) * 100}%`,
      );
      this.q(`[data-capacity="${index}"]`).textContent =
        `${step.active.length}/${step.capacity} ${this.t('en uso', 'in use')}`;
      this.q(`[data-status="${index}"]`).textContent = state.outageStep === index
        ? this.t('✕ SERVICIO CAÍDO', '✕ SERVICE DOWN')
        : step.active.length
        ? this.t('En marcha', 'Working')
        : this.t('Disponible', 'Available');
      this.q(`[data-wait-label="${index}"]`).textContent = state.outageStep === index
        ? `${step.interrupted.length} ${this.t('interrumpidos', 'interrupted')}`
        : `${step.waiting.length} ${this.t('esperando', 'waiting')}`;
      this.q(`[data-resource-size="${index}"]`).textContent = String(step.capacity);
      this.q<HTMLButtonElement>(`[data-action="grow:${index}"]`).disabled = playing || step.capacity === 8;
      this.q<HTMLButtonElement>(`[data-action="shrink:${index}"]`).disabled = playing || step.capacity === 1;
      const extra = Math.max(0, step.capacity - BASE_CAPACITIES[index]!);
      this.q(`[data-resource-cost="${index}"]`).textContent = extra
        ? `+${extra} ${this.t('u/s de capacidad', 'capacity units/s')}`
        : this.t('Capacidad incluida', 'Included capacity');
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
    if (state.outageStep !== null)
      text = this.t(`Cadena rota: ${this.names.steps[state.outageStep]} está caído. Los pagos siguen guardados. Recupera el servicio y prepara otro intento.`, `Broken chain: ${this.names.steps[state.outageStep]} is down. Payments are still stored. Recover the service and prepare another trial.`);
    else if (this.selectedJob) {
      const job = state.jobs[this.selectedJob - 1]!;
      text = `${this.names.jobs[job.id - 1]} · ${job.status === 'done' ? this.t('completado', 'complete') : job.status === 'pending' ? this.t('guardado, esperando un worker', 'stored, waiting for a worker') : `${this.names.steps[job.step]} · ${job.status === 'failed' ? this.t('interrumpido por la caída del servicio', 'interrupted by service outage') : job.status === 'waiting' ? this.t('esperando una plaza; su worker sigue ocupado', 'waiting for a slot; its worker remains busy') : this.t('ejecutándose ahora', 'running now')}`}`;
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
        `${this.names.steps[busiest]} tiene ${metrics.steps[busiest]!.waiting.length} pagos esperando. Sus workers no están libres: llevan ese pago encima.`,
        `${this.names.steps[busiest]} has ${metrics.steps[busiest]!.waiting.length} waiting payments. Their workers are not free: they are still holding those payments.`,
      );
    } else if (state.phase === 'complete')
      text = scalingVerdict(state).won
        ? this.t(
            'Los 24 completados. Más rápido, sin incidencias y dentro del presupuesto. ¿Puedes mejorar tu marca?',
            'All 24 complete. Faster, no outages, within budget. Can you improve your result?',
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
    if (this.state.outageStep !== null) {
      const step = this.state.outageStep;
      const metrics = scalingMetrics(this.state);
      this.pause();
      const dialog = this.q<HTMLDialogElement>('dialog');
      dialog.className = 'qs-outcome';
      dialog.dataset.tone = 'loss';
      dialog.setAttribute('aria-labelledby', 'qs-outcome-title');
      dialog.setAttribute('aria-describedby', 'qs-outcome-text');
      this.modalAction = undefined;
      dialog.innerHTML = outcomeShell({
        es: this.es, trial: this.history.length, fatal: true,
        kicker: this.t('GAME LOSS / SERVICIO CAÍDO', 'GAME LOSS / SERVICE DOWN'),
        title: this.t(`Tu sistema colapsó en el paso ${step + 1}.`, `Your system collapsed at step ${step + 1}.`),
        evidence: `<p>${metrics.completed}/24 ${this.t('pagos completados · los pendientes siguen guardados', 'payments complete · pending payments are still stored')}</p>`,
        text: this.t(`«${esc(this.names.steps[step]!)}» recibió más trabajo del que podía atender y se cayó. Los pagos siguen guardados, pero la cadena está parada. Amplía este servicio o reduce los workers antes de volver a arrancar.`, `“${esc(this.names.steps[step]!)}” received more work than it could handle and went down. Payments remain stored, but the chain has stopped. Expand this service or reduce workers before starting again.`),
        actions: button('close', this.t('Revisar mi sistema', 'Review my system'), 'data-primary'),
        dismissAction: 'close',
        awards: this.renderNewAwards(),
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
      [this.state.outageStep === null, this.t('Sin incidencias', 'No outages')],
    ] as const;
    this.modal(
      title,
      `<p class="sc-result-label">${verdict.won ? this.t('MISIÓN SUPERADA', 'MISSION COMPLETE') : this.t('ENSAYO TERMINADO · AJUSTA TU SISTEMA', 'TRIAL COMPLETE · ADJUST YOUR SYSTEM')}</p>${comparison}<div class="sc-checks">${flags.map(([ok, label]) => `<span data-ok="${ok}">${ok ? '✓' : '×'} ${label}</span>`).join('')}</div><p>${this.t(`${metrics.completed}/24 pagos · ningún efecto duplicado.`, `${metrics.completed}/24 payments · no duplicate effects.`)}</p><p class="sc-call-hint">${verdict.won ? this.t('Los workers y los servicios ya pueden trabajar juntos sin romper la cadena. Compara tus intentos: ampliar todo también tiene un coste.', 'Workers and services can now work together without breaking the chain. Compare your trials: expanding everything has a cost too.') : this.t('Cada worker lleva un pago completo. Prueba un equipo mayor y prepara sus servicios para la carga que van a recibir.', 'Each worker carries a complete payment. Try a larger team and prepare its services for the load they will receive.')}</p>${this.renderNewAwards()}`,
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
      `<p>${this.t('Son unidades educativas, no euros ni tarifas reales. Cada worker reservado cuesta 1 u por segundo simulado, tanto si trabaja como si espera.', 'These are teaching units, not real prices. Each reserved worker costs 1 unit per simulated second, whether working or waiting.')}</p><p><strong>${this.config.workers} × ${number(metrics.seconds, 1)} s = ${number(metrics.workerCost)} u</strong></p><p>${this.t('El contrato original está incluido. Cada unidad extra de capacidad añade 1 u/s.', 'The original service contract is included. Each extra unit of resource capacity adds 1 u/s.')} ${this.config.capacities.reduce((total, capacity, step) => total + Math.max(0, capacity - BASE_CAPACITIES[step]!), 0)} × ${number(metrics.seconds, 1)} s = ${number(metrics.extraServiceCost)} u.</p><p>${this.t('Eficiencia = pagos completados / unidades reservadas. El objetivo combina rapidez, servicios suficientes y un coste máximo; no premia únicamente gastar menos.', 'Efficiency = completed payments / reserved units. The mission combines speed, sufficient service capacity and a cost ceiling; spending less alone is not enough.')}</p>`,
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
        ? `<div class="sc-comparison"><table><thead><tr>${[this.t('Workers / Stripe', 'Workers / Stripe'), this.t('Tiempo', 'Time'), this.t('Incidencia', 'Incident'), this.t('Coste', 'Cost'), this.t('Pagos/u', 'Payments/u')].map((title) => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${this.history.map((trial, index) => `<tr><td>${button(`replay:${index}`, `${trial.config.workers} W / ${trial.config.capacities[1]} ${trial.won ? '✓' : ''}`, `aria-label="${this.t('Preparar esta configuración', 'Prepare this configuration')}"`)}<small class="sc-trial-config">${trial.config.capacities.map((limit) => limit).join(' / ')}</small></td><td>${number(trial.seconds, 1)} s</td><td>${trial.outageStep == null ? '—' : this.t('Paso', 'Step') + ' ' + (trial.outageStep + 1)}</td><td>${number(trial.cost)} u</td><td>${number(trial.completed / (trial.cost || 1), 3)}</td></tr>`).join('')}</tbody></table></div><p class="sc-call-hint">${this.t('Se guardan los últimos 8 intentos terminados en esta sesión. La reproducción ×1, ×2 o ×4 no altera sus resultados. El coste incluye todas las plazas reservadas. Bajo cada equipo aparecen las cuatro capacidades. Pulsa un equipo para volver a probarlo.', 'The last 8 finished trials are kept in this session. Playback at ×1, ×2 or ×4 never changes their results. Cost includes all reserved slots. Each team shows its four resource capacities. Click a team to try it again.')}</p>`
        : `<p>${this.t('Completa un intento para empezar a comparar. No guardamos los que reinicias a medias.', 'Finish a trial to start comparing. Runs reset halfway are not saved.')}</p>`,
      this.t('Seguir probando', 'Keep experimenting'),
    );
  }
}

if (!customElements.get('queue-scaling-game'))
  customElements.define('queue-scaling-game', QueueScaling);
