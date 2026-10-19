import {
  createScaling,
  PAYMENT_COUNT,
  pauseScaling,
  playScaling,
  resourceCapacities,
  runScaling,
  scalingDefaults,
  scalingMetrics,
  scalingVerdict,
  tickScaling,
  AVAILABLE_WORKERS,
  TARGET_COST,
  TARGET_SECONDS,
} from './engine';
import type { ScalingConfig } from './engine';
import { callCopy, resourceExplanation, scalingNames } from './content';
import type { Names, Scene } from './content';
import { cleanLabel, escapeHtml as esc } from '../labels';
import { labFigure } from '../figures';

type Trial = {
  config: ScalingConfig;
  seconds: number;
  cost: number;
  rejected: number;
  retries: number;
  completed: number;
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
  private seen = new Set<Scene>();
  private unlocked = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private speed = 1;
  private inspected = -1;
  private inspectorMarkup = '';
  private radioMarkup = '';
  private selectedJob = 0;
  private modalAction: (() => void) | undefined;
  private packets: HTMLButtonElement[] = [];
  private baseline = scalingMetrics(runScaling(scalingDefaults()));
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
    return `async-scaling-v1-${this.es ? 'es' : 'en'}`;
  }

  connectedCallback() {
    this.names = scalingNames(this.es);
    this.loadSession();
    this.innerHTML = `
      <div class="sc-mission"><span class="sc-mission-mark" aria-hidden="true">↗</span><p><strong>${this.t('24 pagos. Menos espera.', '24 payments. Less waiting.')}</strong><span>${this.t(`Tu misión: terminar en ${TARGET_SECONDS} s o menos, sin rechazos y con un coste ≤ ${TARGET_COST} u.`, `Your mission: finish within ${TARGET_SECONDS} s, with no rejections and a cost ≤ ${TARGET_COST} u.`)}</span></p>${button('help', '?', `aria-label="${this.t('Cómo jugar', 'How to play')}"`)}</div>
      <section class="sc-board" aria-label="${this.t('Recorrido de los pagos', 'Payment flow')}">
        <div class="sc-intake">
          ${button('names', `✎ ${this.t('Nombres', 'Names')}`, 'class="sc-edit-names"')}
          <div class="sc-api">${labFigure('api')}<strong data-name="api"></strong><span class="sc-202">202 <small>${this.t('recibido', 'accepted')}</small></span></div>
          <div class="sc-queue"><header><strong data-name="queue"></strong><span data-pending>24</span></header><div class="sc-queue-jobs" data-location="pending"></div><p>${this.t('Guardados · no se pierden', 'Durable · no losses')} <span aria-hidden="true">✓</span></p></div>
        </div>
        <div class="sc-machine">
          <div class="sc-team">
            <div class="sc-team-heading">${labFigure('worker')}<div><small>${this.t('EQUIPO · HASTA 8 WORKERS', 'TEAM · UP TO 8 WORKERS')}</small><strong data-name="worker"></strong></div><div class="sc-hire">${button('less', '−', `aria-label="${this.t('Quitar un worker', 'Remove one worker')}" data-config`)}<output data-workers>1</output>${button('more', '+', `aria-label="${this.t('Añadir un worker', 'Add one worker')}" data-config`)}</div></div>
            <div class="sc-worker-rack" data-worker-rack>${Array.from({ length: AVAILABLE_WORKERS }, (_, i) => button(`worker:${i + 1}`, `<span>W${String(i + 1).padStart(2, '0')}</span><b>—</b>`, `data-worker="${i + 1}" class="sc-worker" hidden`)).join('')}</div>
          </div>
          <div class="sc-flow">${[0, 1, 2, 3].map((step) => this.stepCard(step)).join('')}</div>
          <div class="sc-delivered"><span>✓ ${this.t('Completados', 'Completed')}</span><div data-location="done"></div><b data-done>0/24</b></div>
        </div>
        <aside class="sc-inspector" data-inspector hidden aria-label="${this.t('Decisión del paso', 'Step decision')}"></aside>
      </section>
      <aside class="sc-radio" role="status" aria-live="polite">${labFigure('phone')}<div><small>${this.t('GUARDIA · EN DIRECTO', 'ON CALL · LIVE')}</small><p data-radio>${this.t('Tenemos una cola de clientes esperando. Dale al play y mira quién tarda.', 'Customers are waiting. Press play and see where the time goes.')}</p></div></aside>
      <div class="sc-dock">
        <div class="sc-playback">${button('play', `▶ ${this.t('Procesar pagos', 'Process payments')}`, 'class="sc-primary"')}${button('reset', '↺', `aria-label="${this.t('Reiniciar intento', 'Reset trial')}"`)}<div class="sc-speeds" role="group" aria-label="${this.t('Velocidad de reproducción', 'Playback speed')}">${[1, 2, 4].map((speed) => button(`speed:${speed}`, `×${speed}`, `aria-pressed="${speed === this.speed}"`)).join('')}</div></div>
        <div class="sc-clock"><strong data-time>0 s</strong><span data-throughput>0 ${this.t('pagos/s', 'payments/s')}</span></div>
        <div class="sc-dock-metrics"><span data-occupied></span><span data-waiting></span>${button('cost', '<span data-cost></span>', `aria-label="${this.t('Ver cómo se calcula el coste', 'Show the cost calculation')}"`)}</div>
      </div>
      <div class="sc-trial-bar"><span>${this.t('Tus intentos', 'Your trials')}</span><div data-trials></div>${button('compare', this.t('Comparar ↗', 'Compare ↗'))}</div>
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
    this.addEventListener('change', this.onChange);
    this.addEventListener('input', this.onInput);
    this.q<HTMLDialogElement>('dialog').addEventListener(
      'close',
      this.onDialogClosed,
    );
    document.addEventListener('visibilitychange', this.onVisibility);
    this.render();
    if (!this.seen.has('intro')) this.showCall('intro');
  }
  disconnectedCallback() {
    this.stopTimer();
    this.querySelector<HTMLDialogElement>('dialog')?.close();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('change', this.onChange);
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
      <button type="button" class="sc-step-heading" data-action="inspect:${step}" aria-expanded="false"><small>0${step + 1} <span>${resources[step]}</span></small><strong data-name="step-${step}"></strong><span class="sc-step-detail">${this.t('Ver recurso', 'Inspect resource')} ↗</span></button>
      <div class="sc-resource"><span data-status="${step}"></span><b data-capacity="${step}"></b></div>
      <div class="sc-slots" data-location="active-${step}"></div>
      <div class="sc-wait"><small data-wait-label="${step}">${this.t('Esperando turno', 'Waiting for a slot')}</small><div data-location="waiting-${step}"></div></div>
      <div class="sc-step-controls" data-controls="${step}" hidden><label>${this.t('Máximo a la vez', 'Max at once')}<input type="number" min="1" max="24" data-limit="${step}" data-config aria-label="${this.t('Máximo simultáneo del paso', 'Step concurrency limit')} ${step + 1}" /></label>${step ? `<label class="sc-protection"><input type="checkbox" data-protect="${step}" data-config />${this.t('Esperar una plaza', 'Wait for a slot')}</label>` : `<small>${this.t('La CPU comparte su tiempo', 'CPU time is shared')}</small>`}</div>
    </article>`;
  }
  private loadSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.storageKey) ?? '{}');
      if (Array.isArray(saved.seen))
        for (const scene of [
          'intro',
          'stripe',
          'admission',
          'rejections',
          'database',
        ] as Scene[])
          if (saved.seen.includes(scene)) this.seen.add(scene);
      this.unlocked = saved.unlocked === true;
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
            trial.rejected === 0;
          return (
            trial.config.workers <= AVAILABLE_WORKERS &&
            [
              trial.seconds,
              trial.cost,
              trial.rejected,
              trial.retries,
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
  private saveSession() {
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({
          names: this.names,
          seen: [...this.seen],
          unlocked: this.unlocked,
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
    if (this.state.phase === 'complete' || this.state.phase === 'blocked')
      this.state = createScaling(this.config);
    this.state = playScaling(this.state);
    this.stopTimer();
    this.timer = setInterval(() => this.advance(), 120 / this.speed);
    this.render();
  }
  private advance() {
    this.state = tickScaling(this.state);
    if (this.state.phase === 'complete' || this.state.phase === 'blocked') {
      this.stopTimer();
      const metrics = scalingMetrics(this.state);
      const verdict = scalingVerdict(this.state);
      this.history.push({
        config: structuredClone(this.config),
        seconds: metrics.seconds,
        cost: metrics.cost,
        rejected: this.state.rejected,
        retries: this.state.retries,
        completed: metrics.completed,
        won: verdict.won,
      });
      this.history = this.history.slice(-8);
      if (this.state.waitTicks[1] > 0 && this.config.workers >= 4)
        this.unlocked = true;
      this.saveSession();
      this.render();
      this.showResult();
      return;
    }
    this.render();
    const steps = scalingMetrics(this.state).steps;
    if (this.state.rejected > 0 && !this.seen.has('rejections')) {
      this.inspected =
        this.state.events.find((event) => event.kind === 'rejected')?.step ?? 1;
      this.showCall('rejections');
    } else if (
      this.config.stripeCapacity === 9 &&
      this.config.limits[1] === 3 &&
      steps[1]!.waiting.length >= 2 &&
      !this.seen.has('admission')
    ) {
      this.inspected = 1;
      this.showCall('admission');
    } else if (
      this.config.stripeCapacity === 9 &&
      this.state.waitTicks[2] >= 4 &&
      this.state.waitTicks[2] > this.state.waitTicks[1] &&
      steps[2]!.waiting.length &&
      !this.seen.has('database')
    ) {
      this.inspected = 2;
      this.showCall('database');
    } else if (
      steps[1]!.waiting.length >= 2 &&
      this.config.stripeCapacity === 3 &&
      !this.seen.has('stripe')
    ) {
      this.unlocked = true;
      this.inspected = 1;
      this.showCall('stripe');
    }
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
    if (action === 'inspect') {
      this.inspected = this.inspected === Number(value) ? -1 : Number(value);
      this.renderInspector();
    }
    if (action === 'inspector-close') {
      this.inspected = -1;
      this.renderInspector();
    }
    if (action === 'upgrade') {
      this.inspected = -1;
      this.configure((config) => {
        config.stripeCapacity = config.stripeCapacity === 3 ? 9 : 3;
        if (config.stripeCapacity === 3 && config.limits[1] !== null)
          config.limits[1] = Math.min(config.limits[1]!, 3);
      });
      this.q<HTMLInputElement>('[data-limit="1"]').focus({
        preventScroll: true,
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
    if (action === 'help') this.showCall('help');
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
  private onChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.limit !== undefined) {
      const step = Number(input.dataset.limit);
      const value = Math.min(
        resourceCapacities(this.config)[step]!,
        Math.max(1, Math.round(Number(input.value) || 1)),
      );
      this.configure((config) => {
        config.limits[step] = value;
      });
    }
    if (input.dataset.protect !== undefined) {
      const step = Number(input.dataset.protect);
      this.configure((config) => {
        config.limits[step] = input.checked
          ? resourceCapacities(config)[step]!
          : null;
      });
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
    this.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
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
      worker.title = `${this.names.worker} ${id} · ${job ? this.names.jobs[job.id - 1] : this.t('libre', 'idle')}`;
      worker.querySelector('b')!.textContent = job ? `#${job.id}` : '—';
    });
    metrics.steps.forEach((step, index) => {
      const node = this.q(`[data-step="${index}"]`);
      node.classList.toggle('is-working', step.active.length > 0);
      node.classList.toggle('is-congested', step.waiting.length > 0);
      node.classList.toggle(
        'is-rejected',
        step.waiting.some((job) => job.status === 'retry'),
      );
      node.style.setProperty(
        '--load',
        `${(step.active.length / step.capacity) * 100}%`,
      );
      this.q(`[data-capacity="${index}"]`).textContent =
        `${step.active.length}/${step.capacity} ${this.t('plazas', 'slots')}`;
      this.q(`[data-status="${index}"]`).textContent = step.active.length
        ? this.t('En marcha', 'Working')
        : this.t('Disponible', 'Available');
      this.q(`[data-wait-label="${index}"]`).textContent =
        `${step.waiting.length} ${this.t('esperando', 'waiting')}${step.waiting.some((job) => job.status === 'retry') ? this.t(' · reintento', ' · retry') : ''}`;
      this.q(`[data-controls="${index}"]`).hidden = !this.unlocked;
      const limit = this.q<HTMLInputElement>(`[data-limit="${index}"]`);
      limit.max = String(step.capacity);
      if (document.activeElement !== limit)
        limit.value = String(this.config.limits[index] ?? step.capacity);
      limit.disabled = playing || this.config.limits[index] === null;
      const protect = this.querySelector<HTMLInputElement>(
        `[data-protect="${index}"]`,
      );
      if (protect) protect.checked = this.config.limits[index] !== null;
    });
    this.renderRadio();
    this.renderInspector();
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
    if (this.selectedJob) {
      const job = state.jobs[this.selectedJob - 1]!;
      text = `${this.names.jobs[job.id - 1]} · ${job.status === 'done' ? this.t('completado', 'complete') : job.status === 'pending' ? this.t('guardado, esperando un worker', 'stored, waiting for a worker') : `${this.names.steps[job.step]} · ${job.status === 'retry' ? this.t('petición rechazada, esperando el reintento', 'request rejected, waiting to retry') : job.status === 'waiting' ? this.t('esperando una plaza; su worker sigue ocupado', 'waiting for a slot; its worker remains busy') : this.t('ejecutándose ahora', 'running now')}`}`;
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
    else if (state.rejected > 0)
      text = this.t(
        `${state.rejected} peticiones rechazadas · ${state.retries} reintentos. Los pagos en coral esperan para volver; conservan el mismo ID.`,
        `${state.rejected} rejected requests · ${state.retries} retries. Coral payments are waiting to return; they keep the same ID.`,
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
            'Los 24 completados. Más rápido, sin rechazos y dentro del presupuesto. ¿Puedes mejorar tu marca?',
            'All 24 complete. Faster, no rejections, within budget. Can you improve your result?',
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
  private renderInspector() {
    const node = this.q('[data-inspector]');
    node.hidden = this.inspected < 0;
    this.querySelectorAll<HTMLButtonElement>('.sc-step-heading').forEach(
      (button, i) =>
        button.setAttribute('aria-expanded', String(i === this.inspected)),
    );
    if (this.inspected < 0) return;
    const index = this.inspected;
    const card = this.q(`[data-step="${index}"]`);
    if (node.parentElement !== card) card.append(node);
    const html = `<header><strong>${esc(this.names.steps[index]!)}</strong>${button('inspector-close', '×', `aria-label="${this.t('Cerrar explicación', 'Close explanation')}"`)}</header><p>${this.highlight(resourceExplanation(index, this.names, this.es, this.config.stripeCapacity))}</p>${index === 1 && this.unlocked ? button('upgrade', this.config.stripeCapacity === 3 ? this.t('Ampliar a 9 plazas', 'Expand to 9 slots') : this.t('Volver a 3 plazas', 'Return to 3 slots'), `${this.state.phase === 'running' ? 'disabled' : ''} class="sc-upgrade"`) + `<small>${this.state.phase === 'running' ? this.t('Pausa para cambiar el contrato.', 'Pause to change the contract.') : this.config.stripeCapacity === 3 ? this.t('6 plazas extra · +6 u/s. Prepara otro intento.', '6 extra slots · +6 units/s. Prepares a new trial.') : this.t('Libera las 6 plazas extra. Prepara otro intento.', 'Releases the 6 extra slots. Prepares a new trial.')}</small>` : ''}`;
    if (this.inspectorMarkup !== html) {
      node.innerHTML = html;
      this.inspectorMarkup = html;
    }
  }
  private renderTrials() {
    this.q('[data-trials]').innerHTML = this.history.length
      ? this.history
          .slice(-4)
          .map(
            (trial) =>
              `<span class="sc-trial ${trial.won ? 'is-won' : ''}">${trial.config.workers} W <span>→</span> ${number(trial.seconds, 1)} s <small>· ${number(trial.cost)} u${trial.rejected ? ` · ${trial.rejected} ✕` : ''}</small></span>`,
          )
          .join('')
      : `<small>${this.t(`Referencia: 1 worker · ${this.baseline.seconds} s. Tu primer intento quedará aquí.`, `Baseline: 1 worker · ${this.baseline.seconds} s. Your first trial will appear here.`)}</small>`;
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
    dialog.dataset.tone = tone;
    dialog.innerHTML = `<header><span>${labFigure('phone')}${this.t('GUARDIA · ASYNC CHAOS LAB', 'ON CALL · ASYNC CHAOS LAB')}</span>${button('close', '×', `aria-label="${this.t('Cerrar', 'Close')}"`)}</header><h2 id="sc-dialog-title">${esc(title)}</h2><div id="sc-dialog-text">${body}</div><footer>${button('modal-primary', label, 'class="sc-primary"')}${button('close', this.t('Volver al diagrama', 'Back to diagram'))}</footer>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog
      .querySelector<HTMLButtonElement>('[data-action=modal-primary]')
      ?.focus({ preventScroll: true });
  }
  private showCall(scene: Scene) {
    const copy = callCopy(scene, this.names, this.es);
    this.seen.add(scene);
    if (scene === 'stripe' || scene === 'database') this.unlocked = true;
    this.saveSession();
    this.modal(
      copy.title,
      `<p>${this.highlight(copy.report)}</p><p class="sc-call-hint">${this.highlight(copy.hint)}</p>`,
      copy.action,
      scene === 'intro'
        ? () => this.start()
        : () => {
            const step = this.inspected;
            this.inspected = -1;
            this.render();
            if (scene === 'admission' || scene === 'stripe')
              this.q<HTMLInputElement>('[data-limit="1"]').focus({
                preventScroll: true,
              });
            else if (scene === 'rejections' && step > 0)
              this.q<HTMLInputElement>(`[data-protect="${step}"]`).focus({
                preventScroll: true,
              });
            else if (scene === 'database')
              this.q<HTMLButtonElement>('[data-action="inspect:2"]').focus({
                preventScroll: true,
              });
          },
    );
  }
  private showResult() {
    const metrics = scalingMetrics(this.state),
      verdict = scalingVerdict(this.state);
    const horizontalProgress =
      this.config.workers >= 4 &&
      this.config.stripeCapacity === 3 &&
      verdict.safe;
    const title = horizontalProgress
      ? this.config.workers === 4
        ? this.t('Más pods. Menos espera.', 'More pods. Less waiting.')
        : this.t('Más pods. La misma puerta.', 'More pods. The same doorway.')
      : verdict.won
        ? this.t('Ahora sí llegamos a tiempo.', 'Now we are on time.')
        : this.state.phase === 'blocked'
          ? this.t(
              'Demasiados intentos. Paramos aquí.',
              'Too many retries. Stopping here.',
            )
          : !verdict.safe
            ? this.t(
                'Llegaron, pero a base de reintentos.',
                'They arrived, with too many retries.',
              )
            : !verdict.fast
              ? this.t(
                  'Llegaron. Los últimos esperaron demasiado.',
                  'They arrived. The last ones waited too long.',
                )
              : this.t(
                  'La misma velocidad. Una factura mayor.',
                  'The same speed. A bigger bill.',
                );
    const flags = [
      [verdict.fast, `≤ ${TARGET_SECONDS} s`],
      [verdict.economical, `≤ ${TARGET_COST} u`],
      [this.state.rejected === 0, this.t('Sin rechazos', 'No rejections')],
    ] as const;
    this.modal(
      title,
      `<p class="sc-result-label">${verdict.won ? this.t('MISIÓN SUPERADA', 'MISSION COMPLETE') : horizontalProgress ? this.t('PRIMERA MEJORA · AÚN QUEDA TRABAJO', 'FIRST IMPROVEMENT · NOT FINISHED YET') : this.t('ENSAYO TERMINADO · AJUSTA TU SISTEMA', 'TRIAL COMPLETE · ADJUST YOUR SYSTEM')}</p><div class="sc-before-after"><div><small>${this.t('ANTES · 1 WORKER', 'BEFORE · 1 WORKER')}</small><strong>${this.baseline.seconds} s</strong><span>${number(this.baseline.throughput, 2)} ${this.t('pagos/s', 'payments/s')} · ${this.baseline.cost} u</span></div><span aria-hidden="true">→</span><div><small>${this.t('AHORA', 'NOW')} · ${this.config.workers} WORKERS</small><strong>${number(metrics.seconds, 1)} s</strong><span>${number(metrics.throughput, 2)} ${this.t('pagos/s', 'payments/s')} · ${number(metrics.cost)} u</span></div></div><div class="sc-checks">${flags.map(([ok, label]) => `<span data-ok="${ok}">${ok ? '✓' : '×'} ${label}</span>`).join('')}</div><p>${this.t(`${metrics.completed}/24 pagos · ${this.state.rejected} rechazos · ${this.state.retries} reintentos · ningún efecto duplicado.`, `${metrics.completed}/24 payments · ${this.state.rejected} rejections · ${this.state.retries} retries · no duplicate effects.`)}</p><p class="sc-call-hint">${horizontalProgress ? this.t('Bien: repartir los pagos ha reducido la espera. Pero cada nuevo worker llama a los mismos servicios. Los pods crecen; las plazas de Stripe no. Mira cuántos pagos admite ese paso antes de seguir añadiendo workers.', 'Good: sharing the payments reduced the wait. But every new worker calls the same services. Pods grow; Stripe slots do not. Check how many payments that step admits before adding more workers.') : this.config.stripeCapacity === 9 && this.config.limits[1] === 3 ? this.t('Stripe ya admite 9 llamadas, pero el paso sigue limitado a 3. Revisa «Máximo a la vez»: aún no estamos aprovechando la ampliación.', 'Stripe now allows 9 calls, but the step is still limited to 3. Review “Max at once”: we are not using the extra capacity yet.') : verdict.won ? this.t('Más workers ayudaron hasta que otra fase puso el límite. Sigue comparando: puedes ganar con equipos distintos. El coste cuenta el tiempo que reservas recursos, aunque estén esperando.', 'More workers helped until another phase set the limit. Keep comparing: several teams can win. Cost counts how long you reserve resources, even while they wait.') : this.state.rejected ? this.t('Antes de añadir más workers, recupera la espera por plaza en el servicio que rechazó peticiones.', 'Before adding workers, restore admission control on the rejecting service.') : !verdict.fast ? this.t('El siguiente paso no es contratar a ciegas. Mira dónde esperan los pagos y ajusta la capacidad que realmente pueden utilizar.', 'Do not add workers blindly. Look where payments wait and tune the capacity they can actually use.') : this.t('Reservar más workers no abre más plazas en el servicio. Prueba un equipo menor y compara el tiempo.', 'Reserving more workers does not add service slots. Try a smaller team and compare the time.')}</p>`,
      horizontalProgress
        ? this.t('Buscar el siguiente límite', 'Find the next limit')
        : this.t('Volver a mi sistema', 'Back to my system'),
      () => {
        this.inspected = horizontalProgress ? 1 : -1;
        this.render();
        this.q(
          horizontalProgress
            ? '[data-action="inspect:1"]'
            : '[data-action=play]',
        ).focus({ preventScroll: true });
      },
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
      `<p>${this.t('Son unidades educativas, no euros ni tarifas reales. Cada worker reservado cuesta 1 u por segundo simulado, tanto si trabaja como si espera.', 'These are teaching units, not real prices. Each reserved worker costs 1 unit per simulated second, whether working or waiting.')}</p><p><strong>${this.config.workers} × ${number(metrics.seconds, 1)} s = ${number(metrics.workerCost)} u</strong></p><p>${this.t('El contrato original está incluido. Cada plaza extra de Stripe añade 1 u/s.', 'The original service contract is included. Each extra Stripe slot adds 1 u/s.')} ${this.config.stripeCapacity - 3} × ${number(metrics.seconds, 1)} s = ${number(metrics.extraServiceCost)} u.</p><p>${this.t('Eficiencia = pagos completados / unidades reservadas. El objetivo combina rapidez, cero rechazos y un coste máximo; no premia únicamente gastar menos.', 'Efficiency = completed payments / reserved units. The mission combines speed, zero rejections and a cost ceiling; spending less alone is not enough.')}</p>`,
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
        ? `<div class="sc-comparison"><table><thead><tr>${[this.t('Workers / Stripe', 'Workers / Stripe'), this.t('Tiempo', 'Time'), this.t('Rechazos', 'Rejected'), this.t('Coste', 'Cost'), this.t('Pagos/u', 'Payments/u')].map((title) => `<th scope="col">${title}</th>`).join('')}</tr></thead><tbody>${this.history.map((trial, index) => `<tr><td>${button(`replay:${index}`, `${trial.config.workers} W / ${trial.config.stripeCapacity} ${trial.won ? '✓' : ''}`, `aria-label="${this.t('Preparar esta configuración', 'Prepare this configuration')}"`)}<small class="sc-trial-config">${trial.config.limits.map((limit) => limit ?? '—').join(' / ')}</small></td><td>${number(trial.seconds, 1)} s</td><td>${trial.rejected}</td><td>${number(trial.cost)} u</td><td>${number(trial.completed / (trial.cost || 1), 3)}</td></tr>`).join('')}</tbody></table></div><p class="sc-call-hint">${this.t('Se guardan los últimos 8 intentos terminados en esta sesión. La reproducción ×1, ×2 o ×4 no altera sus resultados. El coste incluye todas las plazas reservadas. Bajo cada equipo aparecen los cuatro límites (— significa sin control). Pulsa un equipo para volver a probarlo.', 'The last 8 finished trials are kept in this session. Playback at ×1, ×2 or ×4 never changes their results. Cost includes all reserved slots. Each team shows its four limits (— means unprotected). Click a team to try it again.')}</p>`
        : `<p>${this.t('Completa un intento para empezar a comparar. No guardamos los que reinicias a medias.', 'Finish a trial to start comparing. Runs reset halfway are not saved.')}</p>`,
      this.t('Seguir probando', 'Keep experimenting'),
    );
  }
}

if (!customElements.get('queue-scaling-game'))
  customElements.define('queue-scaling-game', QueueScaling);
