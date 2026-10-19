import {
  JOB_COUNT,
  advance,
  continueAfterIncident,
  defaultConfig,
  initialState,
  isExternal,
  isSafeToRepeat,
  totals,
} from './engine';
import type { SimulationConfig, ActionKind, SimulationState } from './engine';
import { cleanLabel, defaultLabels, escapeHtml as esc } from './labels';
import type { Labels } from './labels';
import { achievements } from './achievements';
import { guideBeat } from './guide';
import type { GuideStage } from './guide';
import { labFigure } from './figures';
import type { AchievementId } from './achievements';

const button = (action: string, label: string) =>
  /* HTML */ `<button type="button" data-action="${action}">${label}</button>`;
class QueueStories extends HTMLElement {
  private config!: SimulationConfig;
  private state!: SimulationState;
  private labels!: Labels;
  private defaults!: Labels;
  private timer: ReturnType<typeof setInterval> | undefined;
  private playing = false;
  private guide: GuideStage = 'off';
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
  private get level(): 1 | 2 {
    return this.dataset.level === '2' ? 2 : 1;
  }
  private get es() {
    return this.dataset.locale !== 'en';
  }
  private t(es: string, en: string) {
    return this.es ? es : en;
  }
  private q<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }
  private name(key: 'api' | 'storage' | 'worker') {
    return cleanLabel(this.labels[key], this.defaults[key]);
  }
  private job(i: number) {
    return cleanLabel(this.labels.jobs[i], this.defaults.jobs[i]!);
  }
  private step(i: number) {
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
    this.labels = structuredClone(this.defaults);
    this.loadSession();
    this.syncStorageName();
    this.innerHTML = /* HTML */ ` <aside
        class="qs-feedback"
        data-feedback
        role="status"
        aria-live="polite"
      ></aside>
      <div class="qs-stage">
        <div class="qs-system">
          ${this.level === 1 ? this.queueDiagram() : this.workerDiagram()}
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
    this.update();
  }
  disconnectedCallback() {
    this.stop();
    this.closeOutcome();
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('change', this.onChange);
    this.removeEventListener('input', this.onInput);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
  private loadSession() {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(`queue-story-names-${this.es ? 'es' : 'en'}`) ??
          '{}',
      );
      for (const key of ['api', 'storage', 'worker'] as const)
        if (typeof saved[key] === 'string')
          this.labels[key] = cleanLabel(saved[key], this.defaults[key]);
      if (Array.isArray(saved.jobs))
        this.labels.jobs = this.defaults.jobs.map((v, i) =>
          cleanLabel(saved.jobs[i], v),
        );
      if (Array.isArray(saved[`steps${this.level}`]))
        this.labels.steps = this.defaults.steps.map((v, i) =>
          cleanLabel(saved[`steps${this.level}`][i], v),
        );
    } catch {
      /* Naming works without browser storage. */
    }
    try {
      const saved = JSON.parse(
        sessionStorage.getItem('queue-story-achievements') ?? '[]',
      );
      if (Array.isArray(saved))
        for (const a of achievements)
          if (saved.includes(a.id)) this.unlocked.add(a.id);
    } catch {
      /* Session storage is optional. */
    }
  }
  // Diagram templates. These methods render data and never advance the engine.
  private editor(key: string, value: string, label: string) {
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
  private jobRows() {
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
  private namingControl() {
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
  private queueDiagram() {
    return /* HTML */ `<div class="qs-diagram">
      <div class="qs-api-stack">
        ${this.namingControl()}
        <section class="qs-api">
          ${labFigure('api')}<span class="qs-eyebrow">API</span
          >${this.editor('api', this.labels.api, this.t('Nombre de la entrada', 'Intake name'))}<strong
            >202</strong
          >
          <p>
            ${this.t('Recibido. Falta registrarlo.', 'Received. Still to be recorded.')}
          </p>
        </section>
      </div>
      <span class="qs-arrow" aria-hidden="true">→</span>
      <div class="qs-process" data-process>
        <span class="qs-boundary" data-boundary></span>
        <section class="qs-store">
          <div class="qs-node-heading">
            <span data-store-figure
              >${labFigure(this.config.storage === 'ram' ? 'ram' : 'db')}</span
            >
            <div>
              <span class="qs-eyebrow"
                >${this.t('PAGOS PENDIENTES', 'PENDING PAYMENTS')}</span
              >${this.editor('storage', this.labels.storage, this.t('Nombre del almacenamiento', 'Storage name'))}
            </div>
          </div>
          <label class="qs-node-setting"
            ><span class="qs-setting-title"
              >${this.t('Dónde esperan', 'Where they wait')}<small
                >${this.t('Elegir', 'Choose')} ↕</small
              ></span
            ><select data-setting="storage">
              <option value="ram">
                ${this.t('RAM del worker', 'Worker RAM')}
              </option>
              <option value="db">${this.t('Base de datos', 'Database')}</option>
            </select></label
          >
          <p class="qs-choice-note" data-storage-note></p>
          <div class="qs-array">${this.jobRows()}</div>
        </section>
        <span class="qs-arrow" aria-hidden="true">→</span>
        <section class="qs-worker">
          <div class="qs-node-heading">
            ${labFigure('worker')}
            <div>
              <span class="qs-eyebrow">WORKER</span
              >${this.editor('worker', this.labels.worker, this.t('Nombre del worker', 'Worker name'))}
            </div>
          </div>
          <label class="qs-node-setting"
            ><span class="qs-setting-title"
              >${this.t('Si el pago vuelve', 'If the payment returns')}<small
                >${this.t('Elegir', 'Choose')} ↕</small
              ></span
            ><select data-setting="protect">
              <option value="off">
                ${this.t('No comprobar su ID', 'Do not check its ID')}
              </option>
              <option value="on">
                ${this.t('Comprobar su ID', 'Check its ID')}
              </option>
            </select></label
          >
          <p class="qs-choice-note" data-protection-note></p>
          <div class="qs-active-job" data-active-job></div>
          <div class="qs-worker-steps" data-steps></div>
        </section>
      </div>
    </div>`;
  }
  private workerDiagram() {
    return /* HTML */ `<div class="qs-ready-queue">
        <span
          >✓
          ${this.t('Pagos en BDD independiente · recuperación preparada', 'Payments in independent DB · recovery ready')}</span
        >
        <div class="qs-extra-names">
          ${this.editor('api', this.labels.api, this.t('Nombre de la entrada', 'Intake name'))}${this.editor('storage', this.labels.storage, this.t('Nombre del almacenamiento', 'Storage name'))}
        </div>
      </div>
      <div class="qs-payments-header">
        <div class="qs-job-strip">${this.jobRows()}</div>
        ${this.namingControl()}
      </div>
      <section class="qs-worker-interior">
        <header>
          ${labFigure('worker')}
          <div>
            <span class="qs-eyebrow"
              >${this.t('DENTRO DEL WORKER', 'INSIDE THE WORKER')}</span
            >${this.editor('worker', this.labels.worker, this.t('Nombre del worker', 'Worker name'))}
          </div>
          <div class="qs-active-job" data-active-job></div>
        </header>
        <div class="qs-worker-steps" data-steps></div>
      </section>`;
  }
  private actionNature(kind: ActionKind) {
    return this.t(
      {
        check: 'Validación pura · sin efectos externos',
        'set-state': 'Estado local · repetible',
        append: 'Registro local · no debe duplicarse',
        external: 'Efecto externo · no debe duplicarse',
        notify: 'Notificación externa · no debe duplicarse',
      }[kind],
      {
        check: 'Pure check · no external effects',
        'set-state': 'Local state · repeatable',
        append: 'Local record · must not duplicate',
        external: 'External effect · must not duplicate',
        notify: 'External notification · must not duplicate',
      }[kind],
    );
  }
  private resultLabel(i: number, count: number) {
    const kind = this.config.steps[i]?.kind ?? 'append';
    if (this.level === 1 && kind === 'check')
      return count
        ? i === 0
          ? this.t('Validado', 'Validated')
          : this.t('Preparado', 'Prepared')
        : this.t('Pendiente', 'Pending');
    if (kind === 'append')
      return `${count} ${this.t(count === 1 ? 'registro' : 'registros', count === 1 ? 'record' : 'records')}`;
    if (kind === 'check')
      return count
        ? this.t('validación OK', 'validation OK')
        : this.t('sin validar', 'not validated');
    if (kind === 'set-state')
      return count
        ? this.t('estado fijado', 'state set')
        : this.t('sin modificar', 'unchanged');
    return `${count} ${this.t(count === 1 ? 'efecto externo' : 'efectos externos', count === 1 ? 'external effect' : 'external effects')}`;
  }
  private buildSteps() {
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
            ${this.level === 2 ? /* HTML */ `<p class="qs-step-nature ${isExternal(step.kind) ? 'has-external' : ''}">${this.actionNature(step.kind)}</p>` : /* HTML */ `<p class="qs-step-contract">${step.kind === 'append' ? this.t('Solo 1 registro por ID.', 'Only 1 record per ID.') : this.t('Repetirlo es seguro.', 'Safe to repeat.')}</p>`}
            <p class="qs-step-state" data-step-state="${i}"></p>
            ${
              this.level === 2
                ? /* HTML */ `<div class="qs-step-options">
                    <label
                      ><input
                        type="checkbox"
                        data-setting="remember-${i}"
                        ${step.remember ? 'checked' : ''}
                      />
                      ${this.t('Recordar por ID', 'Remember by ID')}</label
                    >
                    <details>
                      <summary>
                        ${this.t('Opciones del paso', 'Step options')}
                      </summary>
                      <small class="qs-step-tradeoff"
                        >${isSafeToRepeat(step.kind) ? this.t('Opcional aquí: ahorra repetir trabajo.', 'Optional here: saves repeated work.') : this.t('Evita repetirlo si su marca llegó a guardarse.', 'Avoids repeating it if its marker was saved.')}</small
                      ><label class="qs-kind-label"
                        >${this.t('Este paso hace…', 'This step does…')}<select
                          data-setting="kind-${i}"
                        >
                          ${(['check', 'set-state', 'append', 'external', 'notify'] as ActionKind[]).map((kind) => /* HTML */ `<option value="${kind}" ${step.kind === kind ? 'selected' : ''}>${this.kindLabel(kind)}</option>`).join('')}
                        </select></label
                      >${
                        isExternal(step.kind)
                          ? /* HTML */ `<label
                                ><input
                                  type="checkbox"
                                  data-setting="provider-${i}"
                                  ${step.providerDeduplication ? 'checked' : ''}
                                />
                                ${this.t('El proveedor reconoce el mismo ID (simulado)', 'Provider recognizes the same ID (simulated)')}</label
                              >
                              <p>
                                ${this.t('Necesita soporte del proveedor: puede reconocer la operación aunque no hayas guardado tu marca local.', 'Requires receiver support: it can recognize the operation even when your local marker was not saved.')}
                              </p>`
                          : step.kind === 'append'
                            ? /* HTML */ `<p>
                                ${this.t('Es local, pero añadir otra fila cambia el resultado. La idempotencia también importa dentro de tu sistema.', 'It is local, but adding another row changes the result. Idempotency also matters inside your system.')}
                              </p>`
                            : /* HTML */ `<p>
                                ${this.t('Esta acción concreta puede repetirse con seguridad. No necesita deduplicación del proveedor.', 'This particular action is safe to repeat. It does not need receiver deduplication.')}
                              </p>`
                      }
                    </details>
                  </div>`
                : ''
            }
          </article>`,
      )
      .join('');
  }
  private kindLabel(kind: ActionKind) {
    return this.t(
      {
        check: 'Comprobar datos (repetible)',
        external: 'Crear un efecto externo',
        'set-state': 'Fijar el mismo estado local (repetible)',
        append: 'Añadir un registro local (no repetible)',
        notify: 'Enviar una notificación externa',
      }[kind],
      {
        check: 'Check data (repeatable)',
        external: 'Create an external effect',
        'set-state': 'Set the same local state (repeatable)',
        append: 'Append a local record (not repeatable)',
        notify: 'Send an external notification',
      }[kind],
    );
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
    this.timer = undefined;
    this.playing = false;
  }
  private closeOutcome() {
    this.querySelector<HTMLDialogElement>('[data-outcome]')?.close();
  }
  private start() {
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
    if (!this.playing) return;
    this.timer = setInterval(() => {
      this.state = advance(this.state);
      if (this.state.phase !== 'running') this.stop();
      this.update();
    }, 650);
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
    this.guide = this.level === 1 ? 'ram' : 'partial';
    this.personalizing = false;
    this.config = defaultConfig(this.level);
    this.syncStorageName();
    this.buildSteps();
    this.reset();
    this.q('.qs-stage').scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    });
    this.q<HTMLButtonElement>('.qs-dock [data-action=play]').focus({
      preventScroll: true,
    });
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
      if (this.playing) this.stop();
      else this.start();
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
      else {
        this.q('[data-guide]').scrollIntoView({
          block: 'nearest',
          behavior: 'instant',
        });
        this.q('[data-guide]').focus({ preventScroll: true });
      }
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
      if (this.level === 1)
        this.guide = this.state.phase === 'lost' ? 'storage' : 'identity';
      else this.guide = this.state.phase === 'won' ? 'optimize' : 'charge';
    }
    this.update();
    if (action === 'lesson') {
      this.q('[data-guide]').scrollIntoView({
        block: 'nearest',
        behavior: 'instant',
      });
      this.q('[data-guide]').focus({ preventScroll: true });
    }
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
    try {
      const storageKey = `queue-story-names-${this.es ? 'es' : 'en'}`,
        saved = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
      if (key === 'api' || key === 'storage' || key === 'worker')
        saved[key] = value;
      if (key.startsWith('job-')) saved.jobs = this.labels.jobs;
      if (key.startsWith('step-'))
        saved[`steps${this.level}`] = this.labels.steps;
      sessionStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      /* Naming works without storage. */
    }
    this.update();
  };
  private syncStorageName() {
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

    if (key === 'storage') {
      this.config.storage = input.value === 'db' ? 'db' : 'ram';
      this.syncStorageName();
      if (this.guide !== 'off')
        this.guide =
          this.config.storage === 'ram'
            ? 'ram'
            : this.config.protectLocalRecord
              ? 'safe'
              : 'durable';
    }
    if (key === 'protect') {
      this.config.protectLocalRecord = input.value === 'on';
      if (this.guide !== 'off')
        this.guide =
          this.config.storage === 'ram'
            ? 'ram'
            : this.config.protectLocalRecord
              ? 'safe'
              : 'identity';
    }
    const [group, index] = key.split('-'),
      i = Number(index),
      step = this.config.steps[i];
    if (step && group === 'remember') {
      step.remember = (input as HTMLInputElement).checked;
      if (this.guide !== 'off') {
        if (this.config.steps.every((s) => s.remember))
          this.guide = 'efficient';
        else if (this.config.steps[1]?.remember && this.guide !== 'optimize')
          this.guide = 'safe';
        else if (!this.config.steps[1]?.remember && this.guide !== 'partial')
          this.guide = 'charge';
      }
    }
    if (step && group === 'provider')
      step.providerDeduplication = (input as HTMLInputElement).checked;
    if (
      step &&
      group === 'kind' &&
      ['check', 'external', 'set-state', 'notify', 'append'].includes(
        input.value,
      )
    ) {
      const expanded = [
        ...this.querySelectorAll<HTMLDetailsElement>(
          '.qs-step-options details',
        ),
      ].map((details) => details.open);
      step.kind = input.value as ActionKind;
      step.providerDeduplication = false;
      this.buildSteps();
      [
        ...this.querySelectorAll<HTMLDetailsElement>(
          '.qs-step-options details',
        ),
      ].forEach((details, index) => (details.open = expanded[index] ?? false));
      this.q<HTMLSelectElement>(`[data-setting="kind-${i}"]`).focus({
        preventScroll: true,
      });
    }
    this.reset();
  };
  private replace(selector: string, html: string) {
    const node = this.q(selector);
    if (node.innerHTML !== html) node.innerHTML = html;
  }
  private customSteps() {
    return this.config.steps.some(
      (step, i) =>
        this.step(i) !== this.defaults.steps[i] ||
        step.kind !== defaultConfig(2).steps[i]?.kind,
    );
  }
  // Narration describes observed results; custom actions use generic outcome copy.
  private paymentFeedback(): [string, string] {
    const s = this.state,
      j = esc(this.job(Math.max(s.active, 0)));
    if (s.phase === 'lost')
      return [
        this.t('PERDISTE LOS DATOS', 'YOU LOST THE DATA'),
        this.t(
          `El primer pago está registrado. Los otros ${totals(s).lost} solo estaban pendientes en la RAM de ${esc(this.name('worker'))}. Al caer ese proceso, desapareció su única copia. La API había dicho «recibido», no «guardado».`,
          `The first payment is recorded. The other ${totals(s).lost} were only pending in ${esc(this.name('worker'))}’s RAM. When that process crashed, their only copy disappeared. The API said “received”, not “saved”.`,
        ),
      ];
    if (s.phase === 'duplicate')
      return [
        this.t(
          'Este pago tiene dos registros.',
          'This payment has two records.',
        ),
        this.t(
          `${j} ya estaba registrado. Falló actualizar su estado y volvió como pendiente. El worker no comprobó su ID y creó otra fila. La meta era una por pago.`,
          `${j} was already recorded. Its status update failed and it returned as pending. The worker did not check its ID and created another row. The goal was one per payment.`,
        ),
      ];
    if (s.phase === 'won')
      return [
        this.t('Tres pagos. Tres registros.', 'Three payments. Three records.'),
        this.t(
          'Los pendientes sobrevivieron a la caída. El pago que volvió conservó su registro anterior. Hubo varios intentos, pero solo una fila por ID.',
          'Pending payments survived the crash. The returning payment kept its existing record. There were multiple attempts, but only one row per ID.',
        ),
      ];
    if (s.phase === 'incident')
      return s.incident === 'ack-retry'
        ? [
            this.t(
              'Registrado, pero todavía pendiente.',
              'Recorded, but still pending.',
            ),
            this.t(
              `${j} ya tiene una fila. Falló la confirmación que lo marca como terminado. El sistema vuelve a ofrecer el mismo ID: al reintentar, comprueba si ya existe su registro.`,
              `${j} already has a row. The confirmation marking it complete failed. The system offers the same ID again: on retry, check whether its record already exists.`,
            ),
          ]
        : [
            this.t(
              'El worker cayó. Los pagos siguen aquí.',
              'The worker crashed. The payments are still here.',
            ),
            this.t(
              `${j} aún no estaba registrado. La base de datos conserva el trabajo pendiente porque está fuera del worker. Reinícialo para continuar.`,
              `${j} was not yet recorded. The database retains the pending job because it is outside the worker. Restart it to continue.`,
            ),
          ];
    if (s.phase === 'ready')
      return [
        this.t('Tres pagos por registrar.', 'Three payments to record.'),
        this.t(
          'La tienda ya dijo «recibido». Ahora el worker tiene que registrar cada pago. Elige dónde esperan y qué hará si vuelve el mismo ID.',
          'The shop already said “received”. Now the worker must record each payment. Choose where they wait and what happens if the same ID returns.',
        ),
      ];
    const action =
      s.cursor === 'ack'
        ? this.t(
            'La fila ya existe. Falta marcar el pago como terminado.',
            'The row exists. The payment still needs to be marked complete.',
          )
        : s.step === 1
          ? this.config.protectLocalRecord
            ? this.t(
                'Comprueba el ID: si ya tiene una fila, conserva esa misma.',
                'Check the ID: if it already has a row, keep it.',
              )
            : this.t(
                'Crea una fila sin comprobar si este ID ya estaba registrado.',
                'Create a row without checking whether this ID was already recorded.',
              )
          : s.step === 0
            ? this.t(
                'Revisa los datos. Este paso no crea ningún registro.',
                'Check the data. This step creates no record.',
              )
            : this.t(
                'Prepara el resultado. Repetir este paso no crea otra fila.',
                'Prepare the result. Repeating this step creates no additional row.',
              );
    return [
      this.playing
        ? this.t(
            `Procesando ${this.job(Math.max(s.active, 0))}`,
            `Processing ${this.job(Math.max(s.active, 0))}`,
          )
        : this.t('En pausa', 'Paused'),
      action,
    ];
  }
  private feedback(): [string, string] {
    if (this.level === 1) return this.paymentFeedback();
    const s = this.state,
      j = esc(this.job(Math.max(s.active, 0))),
      step = esc(this.step(s.step)),
      previous = esc(this.step(Math.max(0, s.step - 1)));
    if (s.phase === 'duplicate')
      return [
        this.t('DUPLICASTE EFECTOS SIN QUERER', 'YOU DUPLICATED EFFECTS'),
        !this.customSteps() && s.step === 1
          ? this.t(
              `Cobraste dos veces a «${j}». El primer cobro no se deshizo al caer el worker. Reintentar el pago completo volvió a pasar por Stripe.`,
              `You charged “${j}” twice. The first charge was not undone when the worker crashed. Retrying the whole payment went through Stripe again.`,
            )
          : this.t(
              `«${step}» produjo dos efectos para «${j}». Reiniciar el worker no deshizo el primero.`,
              `“${step}” produced two effects for “${j}”. Restarting the worker did not undo the first.`,
            ),
      ];
    if (s.phase === 'incident') {
      if (s.incident === 'activation-failed')
        return [
          this.t('INCONSISTENCIAS EN EL SISTEMA', 'SYSTEM INCONSISTENCY'),
          !this.customSteps()
            ? this.t(
                `Cobraste a «${j}», pero su suscripción sigue sin activar. El worker cayó antes de la activación. Los pasos muestran un cobro y ninguna activación. Reprocesar no debería cobrarle otra vez.`,
                `You charged “${j}”, but its subscription is still inactive. The worker crashed before activation. The steps show one charge and no activation. Reprocessing should not charge again.`,
              )
            : this.t(
                `«${previous}» terminó, pero el worker cayó antes de «${step}» para «${j}». Tienes un resultado parcial. Lo que ya ocurrió sigue existiendo.`,
                `“${previous}” finished, but the worker crashed before “${step}” for “${j}”. You have a partial result. What already happened still exists.`,
              ),
        ];
      if (s.incident === 'email-failed')
        return [
          this.customSteps()
            ? this.t('Solo falta una acción.', 'Only one action remains.')
            : this.t(
                'El cliente pagó. No recibió confirmación.',
                'The customer paid. No confirmation arrived.',
              ),
          this.t(
            `«${j}» completó los tres primeros pasos. El worker cayó antes de «${step}». Solo falta ese paso: volver al principio puede repetir trabajo ya resuelto.`,
            `“${j}” completed the first three steps. The worker crashed before “${step}”. Only that step remains: starting over can repeat successful work.`,
          ),
        ];
      return [
        this.t(
          'Ocurrió el efecto. No se guardó su marca.',
          'The effect happened. Its marker was not saved.',
        ),
        this.t(
          `«${step}» ya produjo su efecto para «${j}». El worker cayó antes de guardarlo. Una marca local no basta si nunca se guardó. Recordar pasos no puede recuperar una marca que nunca se escribió: necesitas consultar o reconocer la operación en el proveedor.`,
          `“${step}” already produced its effect for “${j}”. The worker crashed before saving it. Remembering steps cannot recover a marker that was never written: you need to query or recognize the operation at the receiver.`,
        ),
      ];
    }
    if (s.phase === 'won') {
      const wasted = s.events.filter(
        (e) => e.job === 3 && e.kind === 'wasted',
      ).length;
      return [
        this.t('LOS TRES PAGOS COMPLETADOS', 'ALL THREE PAYMENTS COMPLETE'),
        wasted
          ? this.t(
              `Completaste los pagos sin duplicar resultados. En «${esc(this.job(2))}» repetiste ${wasted} pasos ya resueltos, cuando solo faltaba el último. Recordar esos avances es opcional: valora si el coste de repetirlos compensa guardar más estado.`,
              `You completed the payments without duplicating results. For “${esc(this.job(2))}”, you repeated ${wasted} successful steps when only the last one remained. Remembering that progress is optional: weigh the repeated work against storing more state.`,
            )
          : this.t(
              `Saltaste ${s.skipped} pasos ya resueltos. Recuperaste cada pago sin volver a aplicar sus efectos externos en este escenario.`,
              `You skipped ${s.skipped} previously resolved steps. You recovered each payment without reapplying its external effects in this scenario.`,
            ),
      ];
    }
    if (s.phase === 'ready')
      return [
        this.t(
          'Un pago puede quedarse a medias.',
          'A payment can stop halfway.',
        ),
        this.customSteps()
          ? this.t(
              'Los tres pagos están guardados. El worker ejecutará las acciones que has elegido. Mira cuáles pueden repetirse y decide qué avances recordar al reintentar.',
              'The three payments are saved. The worker will run the actions you chose. Check which can safely repeat and decide what progress to remember on retry.',
            )
          : this.t(
              'Los tres pagos están guardados en una base de datos. Tu worker debe validar, cobrar, activar la suscripción y avisar al cliente. Decide qué recordar si tiene que volver a empezar.',
              'Three payments are saved in a database. Your worker must validate, charge, activate the subscription and notify the customer. Choose what to remember if it has to start again.',
            ),
      ];
    return [
      this.playing
        ? this.t(
            `Procesando ${this.job(Math.max(s.active, 0))}`,
            `Processing ${this.job(Math.max(s.active, 0))}`,
          )
        : this.t('Procesamiento pausado', 'Processing paused'),
      this.t(
        'Sigue el pago por los pasos del worker. Validar datos, modificar estado local y llamar a un proveedor tienen consecuencias distintas.',
        'Follow the payment through the worker steps. Checking data, changing local state and calling a receiver have different consequences.',
      ),
    ];
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
    const beat = guideBeat({
      level: this.level,
      es: this.es,
      stage: this.guide,
      state: this.state,
      playing: this.playing,
      worker: this.name('worker'),
      api: this.name('api'),
      job: this.job(Math.max(0, this.state.active)),
      chargeStep: this.step(1),
    });
    const targets = {
      storage: '[data-setting=storage]',
      identity: '[data-setting=protect]',
      charge: '[data-setting="remember-1"]',
      steps: '[data-setting^="remember-"]:not(:checked)',
    };
    if (beat.target) {
      this.guideTarget = targets[beat.target];
      const node = this.querySelector<HTMLElement>(this.guideTarget);
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
    const optional =
      this.level === 2 &&
      this.state.phase === 'won' &&
      this.guide !== 'optimize' &&
      !this.config.steps.every((step) => step.remember)
        ? button(
            'lesson',
            this.t('Comparar el trabajo repetido', 'Compare repeated work'),
          )
        : '';
    this.replace(
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
  }
  private showTutorial() {
    this.stop();
    this.closeOutcome();
    const d = this.q<HTMLDialogElement>('[data-outcome]');
    d.dataset.tone = 'story';
    const title =
      this.level === 1
        ? this.t(
            'Tenemos tres pagos. ¿Los ponemos en marcha?',
            'Three payments. Shall we get them moving?',
          )
        : this.t(
            'Un momento antes de darle otra vez.',
            'A moment before you run it again.',
          );
    const lines =
      this.level === 1
        ? [
            this.t(
              'El worker los irá sacando, revisando y registrando. Tú dale a «Iniciar» y vigila que todos lleguen al final.',
              'The worker will pick them up, check them and record them. Press “Start” and watch them reach the finish.',
            ),
            this.t(
              'Dónde esperan lo decides tú: RAM del worker o base de datos. Lo puedes cambiar en el esquema, en «Dónde esperan».',
              'You decide where they wait: worker RAM or a database. Change it on the diagram under “Where they wait”.',
            ),
            this.t(
              'Y si vuelve el mismo ID… no será que quieren pagarnos dos veces, ¿no? Échale un ojo a «Si el pago vuelve». Esa decisión también es tuya.',
              'And if the same ID comes back… surely they are not trying to pay us twice? Take a look at “If the payment returns”. That choice is yours too.',
            ),
          ]
        : [
            this.t(
              'Los pagos ya están guardados. Ahora mira dentro del worker: revisa los datos, cobra, activa la suscripción y manda el email.',
              'The payments are already saved. Now look inside the worker: it checks the data, charges, activates the subscription and sends the email.',
            ),
            this.t(
              'Cada paso tiene «Recordar por ID». Tú decides qué debería recordar el siguiente intento. En «Opciones del paso» también puedes cambiar lo que hace cada caja.',
              'Each step has “Remember by ID”. You decide what the next attempt should remember. Under “Step options”, you can also change what each box does.',
            ),
            this.t(
              'Que el worker vuelva a empezar no devuelve el dinero al cliente. Así que eso de cobrar otra vez… mejor lo vigilamos, ¿eh?',
              'Restarting the worker does not refund the customer. So charging again… let us keep an eye on that, shall we?',
            ),
          ];
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
        ${button('tutorial-start', this.guide !== 'off' ? this.t('Continuar el recorrido', 'Continue walkthrough') : this.t('Vamos a procesarlos', 'Let us process them')).replace('<button ', '<button data-primary ')}${button('walkthrough', this.t('Prefiero un recorrido guiado', 'I would prefer a guided walkthrough'))}
      </div>
    </div>`;
    d.showModal();
    d.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private incidentCall(): { title: string; report: string } {
    const s = this.state,
      job = this.job(Math.max(0, s.active)),
      step = this.step(s.step);
    if (s.phase === 'lost')
      return {
        title: this.t(
          'Los clientes están esperando.',
          'The customers are waiting.',
        ),
        report: this.t(
          `Hay ${totals(s).lost} clientes preguntando por su pago. La web les dijo «recibido», pero aquí no aparecen. Los he buscado y no los encuentro. ¿Puedes mirar qué ha pasado?`,
          `${totals(s).lost} customers are asking about their payments. The website said “received”, but they are missing here. I have looked and cannot find them. Can you check what happened?`,
        ),
      };
    if (s.phase === 'duplicate')
      return {
        title:
          this.level === 1
            ? this.t(
                'Este pago aparece dos veces.',
                'This payment appears twice.',
              )
            : this.t(
                'Tenemos un resultado duplicado.',
                'We have a duplicate result.',
              ),
        report:
          this.level === 1
            ? this.t(
                `Oye, ${job} aparece dos veces en el registro. El cliente solo ha hecho un pago. ¿Hemos guardado el mismo dos veces?`,
                `Hey, ${job} appears twice in the register. The customer only made one payment. Have we recorded it twice?`,
              )
            : !this.customSteps() && s.step === 1
              ? this.t(
                  `Nos acaba de escribir el cliente de ${job}. Le hemos cobrado dos veces el mismo pago. Necesita saber qué ha ocurrido.`,
                  `The customer for ${job} just wrote to us. We charged them twice for the same payment. They need to know what happened.`,
                )
              : this.t(
                  `${step} aparece dos veces para ${job}. No ha entrado otro pago. ¿Puedes revisar qué hemos repetido?`,
                  `${step} appears twice for ${job}. No new payment came in. Can you check what we repeated?`,
                ),
      };
    if (s.incident === 'worker-retry')
      return {
        title: this.t(
          'El cliente sigue esperando.',
          'The customer is still waiting.',
        ),
        report: this.t(
          `Oye, el cliente de ${job} pregunta si hemos recibido su pago. En la web pone que sí, pero aún no aparece registrado. ¿Puedes desbloquearlo?`,
          `Hey, the customer for ${job} wants to know if we received their payment. The website says yes, but it has not been recorded yet. Can you get it moving?`,
        ),
      };
    if (s.incident === 'ack-retry')
      return {
        title: this.t(
          'Este pago vuelve a salir pendiente.',
          'This payment is showing as pending again.',
        ),
        report: this.t(
          `Me sale ${job} pendiente, pero yo juraría que ya lo habíamos registrado. ¿Puedes mirar ese ID antes de volver a pasarlo?`,
          `${job} is showing as pending, but I could swear we already recorded it. Can you check that ID before running it again?`,
        ),
      };
    if (!this.customSteps() && s.incident === 'activation-failed')
      return {
        title: this.t(
          'Ha pagado y no puede entrar.',
          'They paid and cannot get in.',
        ),
        report: this.t(
          `El cliente de ${job} acaba de escribir: «Me habéis cobrado, pero no puedo entrar». ¿Puedes terminar de activarle la cuenta? Y ojo con volver a cobrarle.`,
          `The customer for ${job} just wrote: “You charged me, but I cannot get in.” Can you finish activating their account? And watch out for charging them again.`,
        ),
      };
    if (!this.customSteps() && s.incident === 'email-failed')
      return {
        title: this.t(
          'Falta el email de confirmación.',
          'The confirmation email is missing.',
        ),
        report: this.t(
          `Otro cliente, esta vez por ${job}: la cuenta funciona, pero sigue esperando el email con la confirmación del pago. Parece que solo nos falta enviárselo.`,
          `Another customer, this time for ${job}: their account works, but they are still waiting for the payment confirmation email. It looks like we only need to send it.`,
        ),
      };
    return {
      title: this.t('El pago quedó a medias.', 'The payment stopped halfway.'),
      report: this.t(
        `Me han pasado ${job} porque se ha quedado a medias. Veo resultados de algunas acciones, pero falta confirmar «${step}». ¿Puedes revisar cómo seguir?`,
        `${job} was passed to me because it stopped halfway. I can see some action results, but “${step}” is still unconfirmed. Can you check how to continue?`,
      ),
    };
  }
  private renderIncident() {
    const d = this.q<HTMLDialogElement>('[data-outcome]'),
      ack = this.state.incident === 'ack-retry',
      call = this.incidentCall();
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
          ${s.phase === 'lost' ? this.t(`${m.done} completado · ${m.lost} perdidos al desaparecer la RAM`, `${m.done} completed · ${m.lost} lost when RAM disappeared`) : this.level === 1 ? this.t(`${m.attempts} intentos · 3 registros · uno por ID`, `${m.attempts} attempts · 3 records · one per ID`) : this.t(`${m.attempts} intentos · ${m.skipped} pasos saltados · ningún resultado duplicado`, `${m.attempts} attempts · ${m.skipped} skipped steps · no duplicate results`)}
        </p>`;
    if (s.phase === 'duplicate')
      return /* HTML */ `<div class="qs-repeat-evidence">
        <article class="qs-ticket is-kept">
          <header>
            <span>ID ${String(j.id).padStart(2, '0')}</span><span>✓</span>
          </header>
          <strong>${esc(this.job(j.id - 1))}</strong
          ><span class="qs-ticket-lines" aria-hidden="true"></span>
          <footer>
            ${this.level === 1 ? this.t('Primer registro', 'First record') : this.t('Primer efecto', 'First effect')}
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
            ${this.level === 1 ? this.t('Segundo registro', 'Second record') : this.t('Efecto repetido', 'Repeated effect')}
          </footer>
        </article>
        <p>
          ${esc(this.step(s.step))}<br /><b
            >${this.t('El mismo pago. Dos resultados.', 'The same payment. Two results.')}</b
          >
        </p>
      </div>`;
    if (this.level === 2)
      return /* HTML */ `<div class="qs-action-evidence">
          ${j.steps
            .map(
              (st, i) =>
                /* HTML */ `<article
                  class="${st.effects ? 'is-finished' : i === s.step ? 'was-interrupted' : ''}"
                >
                  <span class="qs-evidence-step"
                    >${String(i + 1).padStart(2, '0')}
                    <b>${st.effects ? '✓' : i === s.step ? '×' : '○'}</b></span
                  ><strong>${esc(this.step(i))}</strong
                  ><small>${this.resultLabel(i, st.effects)}</small>
                </article>`,
            )
            .join('')}
        </div>
        <p class="qs-evidence-caption">
          ${esc(this.job(j.id - 1))} · ID ${String(j.id).padStart(2, '0')} ·
          ${this.t('lo que ya ocurrió sigue existiendo', 'what already happened still exists')}
        </p>`;
    return /* HTML */ `<div class="qs-ack-evidence">
      <div>
        <span>${this.t('ID DEL PAGO', 'PAYMENT ID')}</span
        ><strong
          >${String(j.id).padStart(2, '0')} · ${esc(this.job(j.id - 1))}</strong
        >
      </div>
      <div>
        <span>${this.t('SU REGISTRO', 'ITS RECORD')}</span
        ><strong
          >${s.incident === 'ack-retry' ? '✓ ' + this.t('Ya existe una fila', 'One row already exists') : '— ' + this.t('Todavía sin registrar', 'Not recorded yet')}</strong
        >
      </div>
      <div>
        <span>${this.t('EN LA BASE DE DATOS', 'IN THE DATABASE')}</span
        ><strong
          >↻
          ${this.t('Disponible para reintentar', 'Available to retry')}</strong
        >
      </div>
    </div>`;
  }
  private renderOutcome() {
    const s = this.state;
    if (!['incident', 'won', 'lost', 'duplicate'].includes(s.phase)) return;
    const key = this.outcomeKey();
    if (this.lastOutcome === key) return;
    this.lastOutcome = key;
    if (s.phase === 'incident') {
      this.renderIncident();
      return;
    }
    const d = this.q<HTMLDialogElement>('[data-outcome]'),
      fatal = s.phase === 'lost' || s.phase === 'duplicate',
      won = s.phase === 'won';
    let [, text] = this.feedback(),
      title = '',
      kicker = '';
    if (s.phase === 'lost') {
      title = this.t(
        `Faltan ${totals(s).lost} pagos por registrar.`,
        `${totals(s).lost} payments will never be recorded.`,
      );
      kicker = 'GAME LOSS / ' + this.t('PERDISTE LOS DATOS', 'DATA LOST');
    } else if (s.phase === 'duplicate') {
      title =
        this.level === 2 && !this.customSteps() && s.step === 1
          ? this.t('Le has cobrado dos veces.', 'You charged them twice.')
          : this.level === 1
            ? this.t('Un pago. Dos registros.', 'One payment. Two records.')
            : this.t('Un pago. Dos efectos.', 'One payment. Two effects.');
      kicker =
        'GAME LOSS / ' + this.t('RESULTADO DUPLICADO', 'DUPLICATE RESULT');
    } else if (won) {
      title = this.t('Los tres, completados.', 'All three, complete.');
      kicker =
        this.guide !== 'off'
          ? this.t('RECORRIDO COMPLETADO', 'WALKTHROUGH COMPLETE')
          : this.t('ENSAYO COMPLETADO', 'TRIAL COMPLETE');
    }
    if (fatal) text = '«' + esc(this.incidentCall().report) + '»';
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
    d.innerHTML = /* HTML */ `<div class="qs-outcome-shell">
      <header class="qs-outcome-top">
        <span
          >ASYNC CHAOS LAB
          <span aria-hidden="true">/</span> ${this.t('Ensayo', 'Trial')}
          ${String(this.runId + 1).padStart(2, '0')}</span
        >${button('dismiss', this.t('Volver al esquema ×', 'Back to diagram ×'))}
      </header>
      <div class="qs-outcome-content">
        <p class="qs-outcome-kicker">
          <span aria-hidden="true">${fatal ? '×' : '✓'}</span>${kicker}
        </p>
        <h2 id="qs-outcome-title">${esc(title)}</h2>
        <div class="qs-outcome-visual">${this.outcomeEvidence()}</div>
        ${fatal ? /* HTML */ `<p class="qs-fatal-caller">${labFigure('phone')}<span>${this.t('TU COMPAÑERO DE GUARDIA', 'YOUR ON-CALL TEAMMATE')}</span></p>` : ''}
        <p id="qs-outcome-text">${text}</p>
        <div class="qs-outcome-actions">
          ${button(action, label).replace('<button ', '<button data-primary ')}${this.level === 2 && this.guide !== 'off' && won && !this.config.steps.every((s) => s.remember) ? button('lesson', this.t('Opcional: ahorrar trabajo', 'Optional: save repeated work')) : ''}${action !== 'dismiss' ? button('dismiss', this.t('Revisar el esquema', 'Review diagram')) : ''}
        </div>
        ${awards}
      </div>
    </div>`;
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
    try {
      sessionStorage.setItem(
        'queue-story-achievements',
        JSON.stringify([...this.unlocked]),
      );
    } catch {
      /* Achievements still work in this page. */
    }
  }
  private checkAchievements() {
    const s = this.state;
    const unprotected =
      this.level === 1
        ? s.config.storage === 'ram' && !s.config.protectLocalRecord
        : s.config.steps.every(
            (step) => !step.remember && !step.providerDeduplication,
          ) && s.config.steps.some((step) => !isSafeToRepeat(step.kind));
    if (unprotected && ['lost', 'duplicate'].includes(s.phase)) {
      this.award('brave');
    }
    if (s.phase === 'duplicate') this.award('double');
    if (
      this.level === 1 &&
      s.config.storage === 'db' &&
      s.events.some((e) => e.kind === 'recovered' && e.job === 2)
    )
      this.award('survivor');
    if (this.level === 1 && s.phase === 'won' && s.config.protectLocalRecord)
      this.award('identity');
    if (
      this.level === 2 &&
      s.phase === 'won' &&
      s.skipped >= 5 &&
      s.wasted === 0
    )
      this.award('efficient');
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
    const s = this.state;
    const external = s.jobs.reduce(
      (n, j) =>
        n +
        j.steps.reduce(
          (sum, st, i) =>
            sum + (isExternal(this.config.steps[i]!.kind) ? st.effects : 0),
          0,
        ),
      0,
    );
    const m = totals(s),
      repeatedDeliveries = s.jobs.reduce(
        (n, j) => n + Math.max(0, j.attempt - 1),
        0,
      ),
      extraRecords = s.jobs.reduce(
        (n, j) =>
          n +
          j.steps.reduce(
            (sum, st, i) =>
              sum +
              (s.config.steps[i]?.kind === 'append'
                ? Math.max(0, st.effects - 1)
                : 0),
            0,
          ),
        0,
      );
    this.replace(
      '[data-results]',
      /* HTML */ `<span
          ><b>${m.done}</b> ${this.t('completados', 'completed')}</span
        ><span><b>${m.lost}</b> ${this.t('perdidos', 'lost')}</span
        >${this.level === 1 ? /* HTML */ `<span><b>${repeatedDeliveries}</b> ${this.t('reentregas', 'redeliveries')}</span><span><b>${extraRecords}</b> ${this.t('registros de más', 'extra records')}</span>` : /* HTML */ `<span><b>${external}</b> ${this.t('efectos externos', 'external effects')}</span><span><b>${m.attempts}</b> ${this.t('intentos', 'attempts')}</span><span><b>${m.skipped}</b> ${this.t('pasos saltados', 'skipped steps')}</span><span><b>${m.wasted}</b> ${this.t('pasos repetidos', 'repeated steps')}</span>`}`,
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
    this.classList.toggle('is-playing', this.playing);
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
      play.textContent = this.playing
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
    if (this.level === 1) {
      this.q('[data-process]').className =
        `qs-process ${this.config.storage === 'ram' ? 'is-ram' : 'is-durable'}`;
      this.q('[data-boundary]').textContent =
        this.config.storage === 'ram'
          ? this.t(
              'MISMO PROCESO · comparten la caída',
              'SAME PROCESS · shared fate',
            )
          : this.t(
              'BDD INDEPENDIENTE · sobrevive al worker',
              'INDEPENDENT DB · survives worker',
            );
      this.replace(
        '[data-store-figure]',
        labFigure(this.config.storage === 'ram' ? 'ram' : 'db'),
      );
      this.q<HTMLSelectElement>('[data-setting=storage]').value =
        this.config.storage;
      this.q<HTMLSelectElement>('[data-setting=protect]').value = this.config
        .protectLocalRecord
        ? 'on'
        : 'off';
      this.q('[data-storage-note]').textContent =
        this.config.storage === 'ram'
          ? this.t(
              'Pendientes dentro del worker.',
              'Pending work inside the worker.',
            )
          : this.t(
              'Los pendientes sobreviven al worker.',
              'Pending work survives the worker.',
            );
      this.q('[data-protection-note]').textContent = this.config
        .protectLocalRecord
        ? this.t('Conserva una sola fila por ID.', 'Keep one row per ID.')
        : this.t(
            'Cada intento puede crear otra fila.',
            'Each attempt can create another row.',
          );
    } else {
      for (let i = 0; i < this.config.steps.length; i++)
        this.q<HTMLInputElement>(`[data-setting="remember-${i}"]`).checked =
          this.config.steps[i]!.remember;
    }
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
        active =
          s.active === shown &&
          j.status === 'working' &&
          s.step === i &&
          ['execute', 'save'].includes(s.cursor);
      this.q(`[data-step-card="${i}"]`).className =
        `qs-step ${active ? 'is-active' : ''} ${st.effects > 1 ? 'has-duplicate' : ''}`;
      this.q(`[data-step-icon="${i}"]`).textContent =
        st.effects > 1
          ? '×'
          : st.skipped
            ? '↷'
            : st.effects
              ? '✓'
              : active
                ? '▶'
                : '○';
      this.q(`[data-step-state="${i}"]`).textContent =
        this.level === 1
          ? active
            ? `▶ ID ${String(shown + 1).padStart(2, '0')} · ${this.job(shown)}`
            : `${this.resultLabel(i, st.effects)}${st.skipped ? ' · ' + st.skipped + ' ↷' : ''}`
          : active
            ? s.cursor === 'save'
              ? this.t(
                  '✓ Acción hecha · guardando avance',
                  '✓ Action done · saving progress',
                )
              : this.t('▶ Ejecutando ahora', '▶ Running now')
            : st.executions === 0
              ? this.t('Pendiente', 'Pending')
              : `${st.executions} ${this.t(st.executions === 1 ? 'intento' : 'intentos', st.executions === 1 ? 'attempt' : 'attempts')} · ${this.resultLabel(i, st.effects)}${st.checkpoint ? ' · ✓ ' + this.t('guardado', 'saved') : ''}${st.skipped ? ' · ' + st.skipped + ' ↷' : ''}`;
    }
    const [title, text] = this.feedback();
    this.replace(
      '[data-feedback]',
      /* HTML */ `<strong>${esc(title)}</strong>
        <p>${text}</p>`,
    );
    this.renderMetrics();
    this.checkAchievements();
    this.renderGuide();
    this.renderOutcome();
  }
}
if (!customElements.get('queue-stories-game'))
  customElements.define('queue-stories-game', QueueStories);
