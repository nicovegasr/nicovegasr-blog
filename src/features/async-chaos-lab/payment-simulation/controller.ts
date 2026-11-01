import { outcomeShell } from '../shared/outcome-shell';
import {
  JOB_COUNT,
  advance,
  continueAfterIncident,
  defaultConfig,
  initialState,
  totals,
} from './engine';
import type { SimulationConfig, SimulationState } from './engine';
import { cleanLabel, escapeHtml as esc } from '../shared/text';
import { defaultLabels } from './labels';
import type { Labels } from './labels';
import { achievements } from './achievements';
import type { PaymentLabDefinition } from './definition';
import type { GuideStage } from './guide';
import { labFigure } from '../shared/figures';
import type { AchievementId } from './achievements';
import { actorMarkup, workerFrame, WorkerActor } from './worker-actor';
import { button, inLanguage, isSpanishLab } from '../shared/lab-ui';
import { restoreAchievements, restoreLabels, saveAchievements, saveLabel } from './session';

export abstract class PaymentLab extends HTMLElement {
  abstract readonly definition: PaymentLabDefinition;
  config!: SimulationConfig;
  state!: SimulationState;
  labels!: Labels;
  defaults!: Labels;
  private timer: ReturnType<typeof setInterval> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  retryStage: 'failure' | 'restart' | undefined;
  private actor: WorkerActor | undefined;
  private outcomeTimer: ReturnType<typeof setTimeout> | undefined;
  playing = false;
  private speed = 1;
  guide: GuideStage = 'off';
  private backup:
    | {
        config: SimulationConfig;
        state: SimulationState;
        inspected: number;
        personalizing: boolean;
      }
    | undefined;
  private inspected = -1;
  private guideTarget = '';
  private personalizing = false;
  private runId = 0;
  private lastOutcome = '';
  private unlocked = new Set<AchievementId>();
  private notices: AchievementId[] = [];
  private get level() {
    return this.definition.level;
  }
  get es() {
    return isSpanishLab(this);
  }
  t(es: string, en: string) {
    return inLanguage(this.es, es, en);
  }
  q<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }
  name(key: 'api' | 'storage' | 'worker') {
    return cleanLabel(this.labels[key], this.defaults[key]);
  }
  job(i: number) {
    return cleanLabel(this.labels.jobs[i], this.defaults.jobs[i]!);
  }
  step(i: number) {
    return cleanLabel(
      this.labels.steps[i],
      this.defaults.steps[i] ?? `${this.t('Paso', 'Step')} ${i + 1}`,
    );
  }
  // Lifecycle: initialize once connected; stop timers/listeners on disconnect.
  connectedCallback() {
    this.config = defaultConfig(this.level);
    this.state = initialState(this.config);
    this.defaults = defaultLabels(this.level, this.es);
    this.labels = restoreLabels(this.defaults, this.level, this.es);
    this.unlocked = restoreAchievements();
    this.syncStorageName();
    this.innerHTML = /* HTML */ ` <aside
        class="qs-feedback"
        data-feedback
        role="status"
        aria-live="polite"
      ></aside>
      <div class="qs-stage">
        <div class="qs-system">
          ${this.definition.diagram(this)}
        </div>
        <aside
          class="qs-tutorial"
          id="qs-guide"
          data-guide
          tabindex="-1"
          aria-label="${this.t('Recorrido guiado', 'Guided walkthrough')}"
        ></aside>
      </div>
      <div
        class="qs-dock"
        aria-label="${this.t('Controles de la simulación', 'Simulation controls')}"
      >
        <div class="qs-transport">
          ${button('play', this.t('Iniciar', 'Start'))}<button
            type="button"
            class="qs-dock-icon"
            data-action="reset"
            aria-label="${this.t('Reiniciar el recorrido', 'Reset walkthrough')}"
            title="${this.t('Reiniciar', 'Reset')}"
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="qs-speeds" role="group" aria-label="${this.t('Velocidad de reproducción', 'Playback speed')}">
          ${[1, 2, 3, 4].map((speed) => button(`speed:${speed}`, `×${speed}`).replace('<button ', `<button aria-pressed="${speed === this.speed}" `)).join('')}
        </div>
        <div
          class="qs-progress"
          aria-label="${this.t('Pagos completados', 'Completed payments')}"
        >
          <div class="qs-progress-dots" aria-hidden="true">
            ${Array.from({ length: JOB_COUNT }, (_, i) => /* HTML */ `<span data-progress="${i}"></span>`).join('')}
          </div>
          <span class="qs-score" data-score>0/${JOB_COUNT}</span>
        </div>
        <div class="qs-tools">
          <button
            type="button"
            data-action="guide"
            aria-label="${this.t('Abrir el tutorial', 'Open tutorial')}"
            title="${this.t('Tutorial', 'Tutorial')}"
          >
            <span class="qs-tool-symbol" aria-hidden="true">?</span
            ><span class="qs-tool-label" data-tutorial-label
              >${this.t('Tutorial', 'Tutorial')}</span
            >
          </button>
        </div>
      </div>
      <div
        class="qs-result-metrics"
        data-results
        aria-label="${this.t('Métricas del ensayo', 'Trial metrics')}"
      ></div>
      <details class="qs-achievements">
        <summary data-achievement-summary></summary>
        <p>
          ${this.t('Logros de esta sesión del navegador. Los reinicios del laboratorio no los borran.', 'Achievements for this browser session. Resetting the lab does not erase them.')}
        </p>
        <div data-achievements></div>
      </details>
      <aside
        class="qs-toast"
        data-toast
        role="status"
        aria-live="polite"
      ></aside>
      <dialog
        class="qs-outcome"
        data-outcome
        aria-labelledby="qs-outcome-title"
        aria-describedby="qs-outcome-text"
      ></dialog>`;
    this.addEventListener('click', this.onClick);
    this.addEventListener('change', this.onChange);
    this.addEventListener('input', this.onInput);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.buildSteps();
    this.actor = new WorkerActor(this.q('[data-worker-actor]'), this.config.steps.length);
    this.update();
    this.showTutorial(true);
  }
  disconnectedCallback() {
    this.stop();
    this.closeOutcome();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('change', this.onChange);
    this.removeEventListener('input', this.onInput);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
  // Diagram templates. These methods render data and never advance the engine.
  editor(key: string, value: string, label: string) {
    return /* HTML */ `<span class="qs-editable"
      ><strong data-display-label="${key}">${esc(value)}</strong
      ><input
        class="qs-name"
        type="text"
        data-label="${key}"
        value="${esc(value)}"
        maxlength="64"
        aria-label="${esc(label)}"
        spellcheck="false"
    /></span>`;
  }
  jobRows() {
    return this.labels.jobs
      .map(
        (value, i) =>
          /* HTML */ `<div class="qs-job" data-job-row="${i}">
            ${button('inspect:' + i, String(i + 1).padStart(2, '0'))}
            <div>
              ${this.editor('job-' + i, value, this.t('Nombre del pago', 'Payment name') + ' ' + (i + 1))}<small
                data-job-status="${i}"
              ></small>
            </div>
            <span class="qs-job-icon" data-job-icon="${i}">○</span>
          </div>`,
      )
      .join('');
  }
  namingControl() {
    return /* HTML */ `<div class="qs-edit-controls">
      <button
        type="button"
        class="qs-rename-button"
        data-action="personalize"
        aria-label="${this.t('Editar nombres', 'Edit names')}"
        title="${this.t('Editar nombres', 'Edit names')}"
      >
        <span class="qs-tool-symbol" aria-hidden="true">✎</span
        ><span class="qs-rename-label" data-personalize-label
          >${this.t('Nombres', 'Names')}</span
        >
      </button>
    </div>`;
  }
  workerJourney() {
    return /* HTML */ `<div class="qs-worker-journey" data-worker-journey>
      <div class="qs-actor-track">
        <div class="qs-actor-stations" aria-hidden="true">${this.config.steps.map((_, i) => `<span data-actor-station="${i}">${String(i + 1).padStart(2, '0')}</span>`).join('')}</div>
        ${actorMarkup()}
      </div>
      <p class="qs-actor-caption" data-actor-caption></p>
    </div>`;
  }
  buildSteps() {
    this.q('[data-steps]').innerHTML = this.config.steps
      .map(
        (step, i) =>
          /* HTML */ `<article class="qs-step" data-step-card="${i}">
            <div class="qs-step-heading">
              <span class="qs-step-number"
                >${String(i + 1).padStart(2, '0')}</span
              >${this.editor('step-' + i, this.step(i), this.t('Nombre del paso', 'Step name') + ' ' + (i + 1))}<span
                data-step-icon="${i}"
                >○</span
              >
            </div>
            ${this.definition.stepDescription(this, step, i)}
            <p class="qs-step-state" data-step-state="${i}"></p>
            ${this.definition.stepOptions(this, step, i)}
          </article>`,
      )
      .join('');
  }
  // Playback and user actions. This is the only layer that owns real timers.
  private onVisibility = () => {
    if (document.hidden) {
      this.stop();
      this.update();
    }
  };
  private stop() {
    clearInterval(this.timer);
    clearTimeout(this.retryTimer);
    clearTimeout(this.outcomeTimer);
    this.outcomeTimer = undefined;
    this.dataset.outcomePending = '';
    this.actor?.stop();
    this.timer = undefined;
    this.retryTimer = undefined;
    this.retryStage = undefined;
    this.playing = false;
  }
  private closeOutcome() {
    this.querySelector<HTMLDialogElement>('[data-outcome]')?.close();
  }
  private start() {
    if (
      this.state.phase === 'incident' &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.revealRetry();
      return;
    }
    this.resumeProcessing();
  }
  private revealRetry() {
    this.closeOutcome();
    this.stop();
    this.inspected = -1;
    this.retryStage = 'failure';
    this.update();
    this.q('[data-worker-journey]').scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
    this.q<HTMLButtonElement>('.qs-dock [data-action=play]').focus({
      preventScroll: true,
    });
    // Let the player locate the interrupted step before showing the restart.
    // These timers only delay playback; the engine still owns all progress.
    this.retryTimer = setTimeout(() => {
      this.retryStage = 'restart';
      this.update();
      // The actor's journey back to station 01 occupies this playback delay.
      this.retryTimer = setTimeout(() => this.resumeProcessing(), 850);
    }, 1300);
  }
  private resumeProcessing() {
    this.closeOutcome();
    this.stop();
    this.notices = [];
    if (this.state.phase === 'incident')
      this.state = continueAfterIncident(this.state);
    if (['won', 'lost', 'duplicate'].includes(this.state.phase)) {
      this.state = initialState(this.config);
      this.runId++;
    }
    this.inspected = -1;
    this.playing = true;
    this.state = advance(this.state);
    if (this.state.phase !== 'running') this.stop();
    this.update();
    this.schedulePlayback();
  }
  private schedulePlayback() {
    clearInterval(this.timer);
    if (!this.playing) return;
    this.timer = setInterval(() => {
      this.state = advance(this.state);
      if (this.state.phase !== 'running') this.stop();
      this.update();
    }, 650 / this.speed);
  }
  private reset() {
    this.closeOutcome();
    this.stop();
    this.notices = [];
    this.state = initialState(this.config);
    this.inspected = -1;
    this.runId++;
    this.update();
  }
  private beginGuide() {
    if (this.guide === 'off')
      this.backup = {
        config: structuredClone(this.config),
        state: structuredClone(this.state),
        inspected: this.inspected,
        personalizing: this.personalizing,
      };
    this.guide = this.definition.firstGuideStage;
    this.personalizing = false;
    this.config = defaultConfig(this.level);
    this.syncStorageName();
    this.buildSteps();
    this.reset();
    this.q<HTMLButtonElement>('.qs-dock [data-action=play]').focus({
      preventScroll: true,
    });
  }
  /** On short screens the diagram and its explanation do not fit together; the explanation wins. */
  private revealGuide(focus = true) {
    const guide = this.q('[data-guide]');
    guide.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    if (focus) guide.focus({ preventScroll: true });
  }
  private leaveGuide() {
    this.closeOutcome();
    this.stop();
    this.guide = 'off';
    if (this.backup) {
      this.config = this.backup.config;
      this.state = this.backup.state;
      this.inspected = this.backup.inspected;
      this.personalizing = this.backup.personalizing;
      this.backup = undefined;
      this.runId++;
      this.lastOutcome = this.outcomeKey();
      this.syncStorageName();
      this.buildSteps();
    }
  }
  private finishGuide() {
    this.closeOutcome();
    this.stop();
    this.guide = 'off';
    this.backup = undefined;
    this.notices = [];
  }
  private onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!b || b.disabled) return;
    const [action, value] = b.dataset.action!.split(':');
    if (action === 'play') {
      if (this.playing || this.retryStage) this.stop();
      else this.start();
    }
    if (action === 'speed' && [1, 2, 3, 4].includes(Number(value))) {
      this.speed = Number(value);
      this.schedulePlayback();
    }
    if (action === 'reset') this.reset();
    if (action === 'inspect') {
      this.stop();
      this.inspected = Number(value);
    }
    if (action === 'personalize') {
      this.personalizing = !this.personalizing;
      this.stop();
    }
    if (action === 'guide') {
      if (this.guide === 'off') this.showTutorial();
      else this.revealGuide();
    }
    if (action === 'guide-focus' && this.guideTarget) {
      const target = this.querySelector<HTMLElement>(this.guideTarget);
      target?.scrollIntoView({
        block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      target?.focus({ preventScroll: true });
    }
    if (action === 'walkthrough') this.beginGuide();
    if (action === 'tutorial-start') this.start();
    if (action === 'guide-close') {
      if (this.state.phase === 'won') this.finishGuide();
      else this.leaveGuide();
    }
    if (action === 'guide-finish') this.finishGuide();
    if (action === 'dismiss') this.closeOutcome();
    if (action === 'toast-close') this.notices = [];
    if (action === 'lesson') {
      this.closeOutcome();
      this.guide = this.definition.lessonStage(this);
    }
    this.update();
    if (action === 'lesson') this.revealGuide();
  };
  private onInput = (e: Event) => {
    const input = e.target as HTMLInputElement,
      key = input.dataset.label;
    if (!key) return;
    const value = input.value.slice(0, 64);
    if (key === 'api' || key === 'storage' || key === 'worker')
      this.labels[key] = value;
    else if (key.startsWith('job-'))
      this.labels.jobs[Number(key.slice(4))] = value;
    else if (key.startsWith('step-'))
      this.labels.steps[Number(key.slice(5))] = value;
    saveLabel(key, this.labels, this.level, this.es);
    this.update();
  };
  syncStorageName() {
    if (
      ['Memoria RAM', 'RAM memory', 'Base de datos', 'Database'].includes(
        this.labels.storage,
      )
    )
      this.labels.storage =
        this.config.storage === 'ram'
          ? this.t('Memoria RAM', 'RAM memory')
          : this.t('Base de datos', 'Database');
    const input = this.querySelector<HTMLInputElement>('[data-label=storage]');
    if (input) input.value = this.labels.storage;
  }
  private onChange = (e: Event) => {
    const input = e.target as HTMLInputElement | HTMLSelectElement,
      key = input.dataset.setting;
    if (!key) return;

    this.definition.applySetting(this, key, input);
    this.reset();
  };
  replace(selector: string, html: string) {
    const node = this.q(selector);
    if (node.innerHTML === html) return false;
    node.innerHTML = html;
    return true;
  }
  private renderGuide() {
    for (const node of this.querySelectorAll('[data-guide-focus]')) {
      node.removeAttribute('data-guide-focus');
      node.removeAttribute('aria-describedby');
    }
    this.guideTarget = '';
    if (this.guide === 'off') {
      this.replace('[data-guide]', '');
      return;
    }
    const beat = this.definition.guideBeat({
      es: this.es,
      stage: this.guide,
      state: this.state,
      playing: this.playing,
      worker: this.name('worker'),
      api: this.name('api'),
      job: this.job(Math.max(0, this.state.active)),
      chargeStep: this.step(1),
      lastStep: this.step(this.config.steps.length - 1),
      steps: this.config.steps.map((_, index) => this.step(index)),
    });
    const targets = {
      storage: '[data-setting=storage]',
      identity: '[data-setting=protect]',
      charge: '[data-setting="remember-1"]',
      steps: '[data-setting^="remember-"]:not(:checked)',
    };
    if (beat.target) {
      this.guideTarget =
        beat.target === 'provider'
          ? `[data-setting="provider-${this.guide === 'email' ? this.config.steps.length - 1 : this.state.step}"]`
          : targets[beat.target];
      const node = this.querySelector<HTMLElement>(this.guideTarget);
      node?.closest<HTMLElement>('[popover]')?.showPopover();
      node?.setAttribute('data-guide-focus', 'true');
      node?.setAttribute('aria-describedby', 'qs-guide-task');
    }
    let action = '';
    if (beat.target)
      action = button(
        'guide-focus',
        this.t('Ver esta decisión ↑', 'Show this choice ↑'),
      );
    else if (this.state.phase === 'won')
      action = button(
        'guide-finish',
        this.t('Seguir experimentando', 'Keep experimenting'),
      );
    else if (['lost', 'duplicate'].includes(this.state.phase))
      action = button(
        'lesson',
        this.t('Cambiar el diseño', 'Change the design'),
      );
    const optional = this.definition.guideOptionalAction(this);
    const changed = this.replace(
      '[data-guide]',
      /* HTML */ `<header class="qs-guide-header">
          <span
            >${this.t('RECORRIDO GUIADO', 'GUIDED WALKTHROUGH')}
            <span class="qs-guide-chapter">${beat.chapter}/4</span></span
          ><button
            type="button"
            data-action="guide-close"
            title="${this.state.phase === 'won' ? this.t('Salir y conservar el resultado', 'Leave and keep the result') : this.t('Salir y recuperar mi ensayo anterior', 'Leave and restore my previous trial')}"
          >
            ${this.t('Salir del recorrido', 'Leave walkthrough')} ×
          </button>
        </header>
        <div class="qs-guide-body">
          <div class="qs-guide-story">
            <h2>${esc(beat.title)}</h2>
            <p>${esc(beat.story)}</p>
          </div>
          <div class="qs-guide-next">
            <span class="qs-eyebrow">${this.t('AHORA', 'NOW')}</span>
            <p id="qs-guide-task" role="status" aria-live="polite">
              ${esc(beat.task)}
            </p>
            ${action || optional ? /* HTML */ `<div class="qs-guide-actions">${action}${optional}</div>` : ''}
          </div>
        </div>`,
    );
    if (changed) this.revealGuide(false);
  }
  private showTutorial(introduction = false) {
    this.stop();
    this.closeOutcome();
    const d = this.q<HTMLDialogElement>('[data-outcome]');
    d.dataset.tone = 'story';
    const { title, lines } = this.definition.tutorial(this);
    d.innerHTML = /* HTML */ `<div class="qs-call-shell">
      <header class="qs-call-top">
        <span class="qs-call-channel"
          ><i aria-hidden="true"></i
          >${this.t('LLAMADA ENTRANTE', 'INCOMING CALL')}</span
        >${button('dismiss', this.t('Colgar ×', 'Hang up ×'))}
      </header>
      <div class="qs-call-heading">
        ${labFigure('phone')}
        <div>
          <span class="qs-eyebrow"
            >${this.t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span
          >
          <h2 id="qs-outcome-title">${esc(title)}</h2>
        </div>
      </div>
      <div id="qs-outcome-text" class="qs-phone-conversation">
        ${lines.map((line, i) => /* HTML */ `<p${i === lines.length - 1 ? ' class="qs-phone-aside"' : ''}>${esc(line)}</p>`).join('')}
      </div>
      <div class="qs-outcome-actions">
        ${button(introduction ? 'dismiss' : 'tutorial-start', introduction ? this.t('Déjame ver el sistema', 'Show me the system') : this.guide !== 'off' ? this.t('Continuar el recorrido', 'Continue walkthrough') : this.t('Vamos a procesarlos', 'Let us process them')).replace('<button ', '<button data-primary ')}${button('walkthrough', this.t('Prefiero un recorrido guiado', 'I would prefer a guided walkthrough'))}
      </div>
    </div>`;
    d.showModal();
    d.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private renderIncident() {
    const d = this.q<HTMLDialogElement>('[data-outcome]'),
      ack = this.state.incident === 'ack-retry',
      call = this.definition.incidentCall(this);
    d.dataset.tone = 'incident';
    d.innerHTML = /* HTML */ `<div class="qs-call-shell">
      <header class="qs-call-top">
        <span class="qs-call-channel"
          ><i aria-hidden="true"></i
          >${this.t('LLAMADA DE GUARDIA', 'ON-CALL ALERT')}</span
        >${button('dismiss', this.t('Ver esquema ×', 'View diagram ×'))}
      </header>
      <div class="qs-call-heading">
        ${labFigure('phone')}
        <div>
          <span class="qs-eyebrow"
            >${this.t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span
          >
          <h2 id="qs-outcome-title">${esc(call.title)}</h2>
        </div>
      </div>
      <p id="qs-outcome-text" class="qs-caller-report">«${esc(call.report)}»</p>
      <div class="qs-call-evidence">${this.outcomeEvidence()}</div>
      <div class="qs-outcome-actions">
        ${button('play', ack ? this.t('Volver a procesar el mismo ID', 'Process the same ID again') : this.t('Reiniciar y reintentar este pago', 'Restart and retry this payment')).replace('<button ', '<button data-primary ')}${button('dismiss', this.t('Voy a mirar el sistema', 'Let me check the system'))}
      </div>
    </div>`;
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    d.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private outcomeKey() {
    return `${this.runId}:${this.state.phase}:${this.state.tick}`;
  }
  private outcomeTicket(i: number, lost = false) {
    return /* HTML */ `<article
      class="qs-ticket ${lost ? 'is-lost' : 'is-kept'}"
    >
      <header>
        <span>ID ${String(i + 1).padStart(2, '0')}</span
        ><span>${lost ? '×' : '✓'}</span>
      </header>
      <strong>${esc(this.job(i))}</strong
      ><span class="qs-ticket-lines" aria-hidden="true"></span>
      <footer>
        ${lost ? this.t('Sin copia duradera', 'No durable copy') : this.t('Resultado guardado', 'Result saved')}
      </footer>
    </article>`;
  }
  private outcomeEvidence() {
    const s = this.state,
      m = totals(s),
      j = s.jobs[Math.max(0, s.active)]!;
    if (s.phase === 'lost' || s.phase === 'won')
      return /* HTML */ `<div class="qs-ticket-row">
          ${s.jobs.map((job, i) => this.outcomeTicket(i, job.status === 'lost')).join('')}
        </div>
        <p class="qs-evidence-caption">
          ${s.phase === 'lost' ? this.t(`${m.done} completado · ${m.lost} perdidos al desaparecer la RAM`, `${m.done} completed · ${m.lost} lost when RAM disappeared`) : this.definition.wonCaption(this)}
        </p>`;
    if (s.phase === 'duplicate') {
      const [firstFooter, secondFooter] = this.definition.duplicateFooters(this);
      return /* HTML */ `<div class="qs-repeat-evidence">
        <article class="qs-ticket is-kept">
          <header>
            <span>ID ${String(j.id).padStart(2, '0')}</span><span>✓</span>
          </header>
          <strong>${esc(this.job(j.id - 1))}</strong
          ><span class="qs-ticket-lines" aria-hidden="true"></span>
          <footer>
            ${firstFooter}
          </footer>
        </article>
        <span class="qs-repeat-symbol" aria-hidden="true">+</span>
        <article class="qs-ticket is-repeated">
          <header>
            <span>ID ${String(j.id).padStart(2, '0')}</span><span>×</span>
          </header>
          <strong>${esc(this.job(j.id - 1))}</strong
          ><span class="qs-ticket-lines" aria-hidden="true"></span>
          <footer>
            ${secondFooter}
          </footer>
        </article>
        <p>
          ${esc(this.step(s.step))}<br /><b
            >${this.t('El mismo pago. Dos resultados.', 'The same payment. Two results.')}</b
          >
        </p>
      </div>`;
    }
    return this.definition.interruptedEvidence(this);
  }
  private renderOutcome(revealed = false) {
    const s = this.state;
    if (!['incident', 'won', 'lost', 'duplicate'].includes(s.phase)) return;
    const key = this.outcomeKey();
    if (this.lastOutcome === key) return;
    this.lastOutcome = key;
    if (!revealed && s.phase !== 'won' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Let the character react before a dialog obscures the worker stage.
      this.dataset.outcomePending = 'true';
      this.outcomeTimer = setTimeout(() => {
        this.outcomeTimer = undefined;
        this.dataset.outcomePending = '';
        if (!this.isConnected || this.outcomeKey() !== key || this.retryStage) return;
        this.lastOutcome = '';
        this.renderOutcome(true);
      }, 700);
      return;
    }
    if (s.phase === 'incident') {
      this.renderIncident();
      return;
    }
    const d = this.q<HTMLDialogElement>('[data-outcome]'),
      fatal = s.phase === 'lost' || s.phase === 'duplicate',
      won = s.phase === 'won';
    let [, text] = this.definition.feedback(this),
      title = '',
      kicker = '';
    if (s.phase === 'lost') {
      title = this.t(
        `Faltan ${totals(s).lost} pagos por registrar.`,
        `${totals(s).lost} payments will never be recorded.`,
      );
      kicker = 'GAME LOSS / ' + this.t('PERDISTE LOS DATOS', 'DATA LOST');
    } else if (s.phase === 'duplicate') {
      title = this.definition.duplicateTitle(this);
      kicker =
        'GAME LOSS / ' + this.t('RESULTADO DUPLICADO', 'DUPLICATE RESULT');
    } else if (won) {
      title = this.t('Los tres, completados.', 'All three, complete.');
      kicker =
        this.guide !== 'off'
          ? this.t('RECORRIDO COMPLETADO', 'WALKTHROUGH COMPLETE')
          : this.t('ENSAYO COMPLETADO', 'TRIAL COMPLETE');
    }
    if (fatal) text = '«' + esc(this.definition.incidentCall(this).report) + '»';
    let action = 'dismiss',
      label = this.t('Revisar mi sistema', 'Review my system');
    if (this.guide !== 'off' && fatal) {
      action = 'lesson';
      label =
        s.phase === 'lost'
          ? this.t('Aprender a conservarlos', 'Learn how to retain them')
          : this.t('Evitar este duplicado', 'Prevent this duplicate');
    }
    if (this.guide !== 'off' && won) {
      action = 'guide-finish';
      label = this.t('Seguir experimentando', 'Keep experimenting');
    }
    d.dataset.tone = fatal ? 'loss' : 'win';
    const awards = this.notices
      .map((id) => {
        const a = achievements.find((a) => a.id === id)!,
          [name, description] = this.es ? a.es : a.en;
        return /* HTML */ `<div class="qs-earned">
          <span aria-hidden="true">✦</span>
          <div>
            <span class="qs-award-label"
              >${this.t('LOGRO DESBLOQUEADO', 'ACHIEVEMENT UNLOCKED')}</span
            ><strong>${esc(name)}</strong>
            <p>${esc(description)}</p>
          </div>
        </div>`;
      })
      .join('');
    d.innerHTML = outcomeShell({
      es: this.es, trial: this.runId + 1, fatal, kicker, title,
      evidence: this.outcomeEvidence(), text, awards,
      actions: `${button(action, label).replace('<button ', '<button data-primary ')}${won ? this.definition.wonOptionalAction(this) : ''}${action !== 'dismiss' ? button('dismiss', this.t('Revisar el esquema', 'Review diagram')) : ''}`,
    });
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    d.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private award(id: AchievementId) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    this.notices.push(id);
    saveAchievements(this.unlocked);
  }
  private checkAchievements() {
    for (const id of this.definition.earnedAchievements(this.state)) this.award(id);
    this.replace(
      '[data-achievement-summary]',
      `✦ ${this.t('Logros de sesión', 'Session achievements')} · ${this.unlocked.size}/${achievements.length}`,
    );
    this.replace(
      '[data-achievements]',
      achievements
        .map((a) => {
          const [title, description] = this.es ? a.es : a.en;
          return /* HTML */ `<article
            class="${this.unlocked.has(a.id) ? 'is-unlocked' : ''}"
          >
            <span aria-hidden="true"
              >${this.unlocked.has(a.id) ? '✦' : '◇'}</span
            >
            <div>
              <h3>
                ${esc(title)}${this.unlocked.has(a.id) ? /* HTML */ ` <small>· ${this.t('conseguido', 'unlocked')}</small>` : ''}
              </h3>
              <p>${esc(description)}</p>
            </div>
          </article>`;
        })
        .join(''),
    );
    this.replace(
      '[data-toast]',
      this.notices.length
        ? /* HTML */ `<span class="qs-eyebrow"
              >✦ ${this.t('LOGRO CONSEGUIDO', 'ACHIEVEMENT UNLOCKED')}</span
            >${this.notices
              .map((id) => {
                const a = achievements.find((a) => a.id === id)!;
                return /* HTML */ `<strong
                    >${esc((this.es ? a.es : a.en)[0])}</strong
                  ><small>${esc((this.es ? a.es : a.en)[1])}</small>`;
              })
              .join('')}${button('toast-close', this.t('Entendido', 'Got it'))}`
        : '',
    );
  }
  private status(status: SimulationState['jobs'][number]['status']) {
    return {
      pending: this.t('Pendiente', 'Pending'),
      working: this.t('Procesando', 'Processing'),
      retrying: this.t('Sin confirmar · reintentar', 'Unconfirmed · retry'),
      done: this.t('Completado', 'Completed'),
      lost: this.t('PERDIDO', 'LOST'),
      failed: this.t('DUPLICADO · detenido', 'DUPLICATED · stopped'),
    }[status];
  }
  private renderMetrics() {
    const m = totals(this.state);
    this.replace(
      '[data-results]',
      /* HTML */ `<span
          ><b>${m.done}</b> ${this.t('completados', 'completed')}</span
        ><span><b>${m.lost}</b> ${this.t('perdidos', 'lost')}</span
        >${this.definition.metrics(this)}`,
    );
  }
  // Paint the current engine snapshot. Animation and DOM state cannot commit work.
  private update() {
    const s = this.state,
      m = totals(s),
      terminal = ['won', 'lost', 'duplicate'].includes(s.phase),
      shown = this.inspected >= 0 ? this.inspected : Math.max(0, s.active),
      j = s.jobs[shown]!;
    this.dataset.phase = s.phase;
    this.dataset.retryStage = this.retryStage ?? '';
    this.style.setProperty('--qs-tick-duration', `${650 / this.speed}ms`);
    for (const speed of [1, 2, 3, 4])
      this.q(`[data-action="speed:${speed}"]`).setAttribute('aria-pressed', String(speed === this.speed));
    this.classList.toggle('is-playing', this.playing || !!this.retryStage);
    this.classList.toggle('is-guided', this.guide !== 'off');
    this.classList.toggle(
      'is-worker-down',
      s.phase === 'lost' ||
        (s.phase === 'incident' && s.incident !== 'ack-retry'),
    );
    this.classList.toggle('is-personalizing', this.personalizing);
    this.q('[data-score]').textContent = `${m.done}/${JOB_COUNT}`;
    for (const play of this.querySelectorAll<HTMLButtonElement>(
      '[data-action=play]',
    ))
      play.textContent = this.retryStage
        ? this.t('Pausar reinicio', 'Pause restart')
        : this.playing
        ? this.t('Pausar', 'Pause')
        : s.phase === 'incident'
          ? this.t('Reprocesar pago', 'Reprocess payment')
          : terminal
            ? this.t('Probar de nuevo', 'Try again')
            : s.phase === 'ready'
              ? this.t('Iniciar', 'Start')
              : this.t('Continuar', 'Resume');
    const help = this.q('[data-action=guide]');
    this.q('[data-tutorial-label]').textContent =
      this.guide === 'off'
        ? this.t('Tutorial', 'Tutorial')
        : this.t('Ver paso', 'View step');
    help.setAttribute(
      'aria-label',
      this.guide === 'off'
        ? this.t('Abrir el tutorial', 'Open tutorial')
        : this.t('Leer el paso del recorrido', 'Read the walkthrough step'),
    );
    help.title = help.getAttribute('aria-label')!;
    this.q('[data-personalize-label]').textContent = this.personalizing
      ? this.t('Listo', 'Done')
      : this.t('Nombres', 'Names');
    this.q('[data-action=personalize]').setAttribute(
      'aria-label',
      this.personalizing
        ? this.t('Terminar de editar', 'Finish editing')
        : this.t('Editar nombres', 'Edit names'),
    );
    for (const display of this.querySelectorAll<HTMLElement>(
      '[data-display-label]',
    )) {
      const key = display.dataset.displayLabel!;
      display.textContent = key.startsWith('job-')
        ? this.job(Number(key.slice(4)))
        : key.startsWith('step-')
          ? this.step(Number(key.slice(5)))
          : this.name(key as 'api' | 'storage' | 'worker');
    }
    for (const job of s.jobs) {
      const i = job.id - 1;
      this.q(`[data-progress="${i}"]`).className = `is-${job.status}`;
      this.q(`[data-job-row="${i}"]`).className =
        `qs-job is-${job.status}${this.inspected === i ? ' is-inspected' : ''}`;
      this.q(`[data-job-status="${i}"]`).textContent = this.status(job.status);
      this.q(`[data-job-icon="${i}"]`).textContent = {
        pending: '○',
        working: '▶',
        retrying: '↻',
        done: '✓',
        lost: '×',
        failed: '×',
      }[job.status];
    }
    this.definition.paintSystem(this);
    this.q('[data-active-job]').classList.toggle(
      'is-executing',
      j.status === 'working' && s.active === shown,
    );
    this.q('[data-active-job]').textContent =
      s.phase === 'ready'
        ? this.t('Esperando el primer pago', 'Waiting for the first payment')
        : `${this.inspected >= 0 ? this.t('Viendo: ', 'Inspecting: ') : ''}${this.job(shown)} · ID ${String(shown + 1).padStart(2, '0')}${j.status === 'working' && s.active === shown ? ' → ' + (s.cursor === 'ack' ? this.t('Confirmar fin', 'Confirm completion') : this.step(s.step)) : ''}`;
    for (let i = 0; i < this.config.steps.length; i++) {
      const st = j.steps[i]!,
        retryOrigin = this.retryStage === 'failure' && s.active === shown && s.step === i,
        restarting = this.retryStage === 'restart' && s.active === shown && i === 0,
        uncertain = s.phase === 'incident' && s.incident === 'email-uncertain' && s.active === shown && s.step === i,
        failed =
          s.phase === 'incident' &&
          s.incident === 'activation-failed' &&
          s.active === shown &&
          s.step === i,
        active =
          s.active === shown &&
          j.status === 'working' &&
          s.step === i &&
          ['execute', 'save'].includes(s.cursor);
      this.q(`[data-step-card="${i}"]`).className =
        `qs-step ${active ? 'is-active' : ''} ${failed ? 'is-failed' : ''} ${uncertain ? 'is-uncertain' : ''} ${retryOrigin ? 'is-retry-origin' : ''} ${restarting ? 'is-restarting' : ''} ${st.effects > 1 ? 'has-duplicate' : ''}`;
      this.q(`[data-step-icon="${i}"]`).textContent =
        restarting
          ? '↻'
          : uncertain
            ? '?'
          : failed || st.effects > 1
          ? '×'
          : st.skipped
            ? '↷'
            : st.effects
              ? '✓'
              : active
                ? '▶'
                : '○';
      this.q(`[data-step-state="${i}"]`).textContent = this.definition.stepState(this, i, {
        progress: st,
        shown,
        active,
        restarting,
        uncertain,
        failed,
      });
    }
    this.renderActor();
    const [title, text] = this.definition.feedback(this);
    this.replace(
      '[data-feedback]',
      /* HTML */ `<strong>${esc(title)}</strong>
        <p>${text}</p>`,
    );
    this.renderMetrics();
    this.checkAchievements();
    // Closing a dialog restores focus to its opener, which scrolls; reveal the guide afterwards.
    this.renderOutcome();
    this.renderGuide();
  }
  private renderActor() {
    const frame = workerFrame(this.state, this.retryStage);
    this.actor?.render(frame, this.speed, this.playing || !!this.retryStage,
      matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.q('[data-worker-journey]').dataset.actorState = frame.state;
    for (let i = 0; i < this.config.steps.length; i++) {
      const station = this.q(`[data-actor-station="${i}"]`);
      station.classList.toggle('is-current', i === frame.step);
      const progress = this.state.jobs[Math.max(0, this.state.active)]!.steps[i]!;
      station.classList.toggle('is-finished', progress.effects > 0 && !(frame.state === 'uncertain' && i === frame.step));
    }
    const caption: Record<typeof frame.state, string> = {
      idle: this.t('Worker preparado · esperando un pago', 'Worker ready · waiting for a payment'),
      working: this.t(`${frame.step + 1} · ${this.step(frame.step)}`, `${frame.step + 1} · ${this.step(frame.step)}`),
      saving: this.t('Guardando la marca de este paso · ✓', 'Saving this step’s checkpoint · ✓'),
      skipping: this.t(`↷ Paso ${frame.step + 1} guardado · lo saltamos`, `↷ Step ${frame.step + 1} saved · skipping it`),
      dead: this.t('Worker caído · sus efectos anteriores siguen existiendo', 'Worker crashed · earlier effects still exist'),
      uncertain: this.t('Sigue vivo · esperando una confirmación que no llegó', 'Still alive · waiting for a confirmation that never arrived'),
      duplicate: this.t('¡Otra vez! · el mismo ID produjo dos efectos', 'Again! · the same ID produced two effects'),
      returning: ['activation-failed', 'worker-retry'].includes(this.state.incident)
        ? this.t('Nuevo worker · mismo pago · volvemos a 01', 'New worker · same payment · back to 01')
        : this.t('Mismo worker · mismo pago · volvemos a 01', 'Same worker · same payment · back to 01'),
      done: this.t('Pago completado · trabajo entregado', 'Payment complete · work delivered'),
    };
    this.q('[data-actor-caption]').textContent = `${!this.playing && !this.retryStage && this.state.phase === 'running' ? this.t('En pausa · ', 'Paused · ') : ''}${caption[frame.state]}`;
  }
}
export function definePaymentLab(definition: PaymentLabDefinition) {
  if (customElements.get('queue-stories-game')) return;
  customElements.define(
    'queue-stories-game',
    class extends PaymentLab {
      readonly definition = definition;
    },
  );
}
