import {
  JOB_COUNT,
  advance,
  continueAfterIncident,
  initialState,
  totals,
} from './engine';
import type { SimulationConfig, SimulationState } from './engine';
import { cleanLabel, escapeHtml as esc } from '../shared/text';
import type { Labels } from './labels';
import { achievements } from './achievements';
import { paymentCopy } from './copy';
import { incidentCall, isFatalOutcome, outcomeScene, tutorialCall } from './dialogs';
import { guidePanel } from './guide-panel';
import type { PaymentLabDefinition } from './definition';
import type { GuideStage } from './guide';
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
  runId = 0;
  private lastOutcome = '';
  private unlocked = new Set<AchievementId>();
  notices: AchievementId[] = [];
  get es() {
    return isSpanishLab(this);
  }
  get copy() {
    return paymentCopy(this.es);
  }
  inLocale(es: string, en: string) {
    return inLanguage(this.es, es, en);
  }
  element<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }
  name(key: 'api' | 'storage' | 'worker') {
    return cleanLabel(this.labels[key], this.defaults[key]);
  }
  job(index: number) {
    return cleanLabel(this.labels.jobs[index], this.defaults.jobs[index]!);
  }
  step(index: number) {
    return cleanLabel(
      this.labels.steps[index],
      this.defaults.steps[index] ?? `${this.copy.step} ${index + 1}`,
    );
  }
  // Lifecycle: initialize once connected; stop timers/listeners on disconnect.
  connectedCallback() {
    this.config = this.definition.defaultConfig();
    this.state = initialState(this.config);
    this.defaults = this.definition.defaultLabels(this.es);
    this.labels = restoreLabels(this.defaults, this.definition.stepNamesKey, this.es);
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
          aria-label="${this.copy.guidedWalkthrough}"
        ></aside>
      </div>
      <div
        class="qs-dock"
        aria-label="${this.copy.simulationControls}"
      >
        <div class="qs-transport">
          ${button('play', this.copy.start)}<button
            type="button"
            class="qs-dock-icon"
            data-action="reset"
            aria-label="${this.copy.resetWalkthrough}"
            title="${this.copy.reset}"
          >
            <span aria-hidden="true">↺</span>
          </button>
        </div>
        <div class="qs-speeds" role="group" aria-label="${this.copy.playbackSpeed}">
          ${[1, 2, 3, 4].map((speed) => button(`speed:${speed}`, `×${speed}`).replace('<button ', `<button aria-pressed="${speed === this.speed}" `)).join('')}
        </div>
        <div
          class="qs-progress"
          aria-label="${this.copy.completedPayments}"
        >
          <div class="qs-progress-dots" aria-hidden="true">
            ${Array.from({ length: JOB_COUNT }, (_, index) => /* HTML */ `<span data-progress="${index}"></span>`).join('')}
          </div>
          <span class="qs-score" data-score>0/${JOB_COUNT}</span>
        </div>
        <div class="qs-tools">
          <button
            type="button"
            data-action="guide"
            aria-label="${this.copy.openTutorial}"
            title="${this.copy.tutorial}"
          >
            <span class="qs-tool-symbol" aria-hidden="true">?</span
            ><span class="qs-tool-label" data-tutorial-label
              >${this.copy.tutorial}</span
            >
          </button>
        </div>
      </div>
      <div
        class="qs-result-metrics"
        data-results
        aria-label="${this.copy.trialMetrics}"
      ></div>
      <details class="qs-achievements">
        <summary data-achievement-summary></summary>
        <p>
          ${this.copy.achievementsForThisBrowserSession}
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
    this.actor = new WorkerActor(this.element('[data-worker-actor]'), this.config.steps.length);
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
        (value, index) =>
          /* HTML */ `<div class="qs-job" data-job-row="${index}">
            ${button('inspect:' + index, String(index + 1).padStart(2, '0'))}
            <div>
              ${this.editor('job-' + index, value, this.copy.paymentName + ' ' + (index + 1))}<small
                data-job-status="${index}"
              ></small>
            </div>
            <span class="qs-job-icon" data-job-icon="${index}">○</span>
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
        aria-label="${this.copy.editNames}"
        title="${this.copy.editNames}"
      >
        <span class="qs-tool-symbol" aria-hidden="true">✎</span
        ><span class="qs-rename-label" data-personalize-label
          >${this.copy.names}</span
        >
      </button>
    </div>`;
  }
  workerJourney() {
    return /* HTML */ `<div class="qs-worker-journey" data-worker-journey>
      <div class="qs-actor-track">
        <div class="qs-actor-stations" aria-hidden="true">${this.config.steps.map((_, index) => `<span data-actor-station="${index}">${String(index + 1).padStart(2, '0')}</span>`).join('')}</div>
        ${actorMarkup()}
      </div>
      <p class="qs-actor-caption" data-actor-caption></p>
    </div>`;
  }
  buildSteps() {
    this.element('[data-steps]').innerHTML = this.config.steps
      .map(
        (step, index) =>
          /* HTML */ `<article class="qs-step" data-step-card="${index}">
            <div class="qs-step-heading">
              <span class="qs-step-number"
                >${String(index + 1).padStart(2, '0')}</span
              >${this.editor('step-' + index, this.step(index), this.copy.stepName + ' ' + (index + 1))}<span
                data-step-icon="${index}"
                >○</span
              >
            </div>
            ${this.definition.stepDescription(this, step, index)}
            <p class="qs-step-state" data-step-state="${index}"></p>
            ${this.definition.stepOptions(this, step, index)}
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
    this.element('[data-worker-journey]').scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
    this.element<HTMLButtonElement>('.qs-dock [data-action=play]').focus({
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
    this.state = advance(this.state, this.definition.rules);
    if (this.state.phase !== 'running') this.stop();
    this.update();
    this.schedulePlayback();
  }
  private schedulePlayback() {
    clearInterval(this.timer);
    if (!this.playing) return;
    this.timer = setInterval(() => {
      this.state = advance(this.state, this.definition.rules);
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
    this.config = this.definition.defaultConfig();
    this.syncStorageName();
    this.buildSteps();
    this.reset();
    this.element<HTMLButtonElement>('.qs-dock [data-action=play]').focus({
      preventScroll: true,
    });
  }
  /** On short screens the diagram and its explanation do not fit together; the explanation wins. */
  private revealGuide(focus = true) {
    const guide = this.element('[data-guide]');
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
    const clickedButton = (e.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!clickedButton || clickedButton.disabled) return;
    const [action, value] = clickedButton.dataset.action!.split(':');
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
    saveLabel(key, this.labels, this.definition.stepNamesKey, this.es);
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
          ? this.copy.ramMemory
          : this.copy.database;
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
    const node = this.element(selector);
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
    const changed = this.replace('[data-guide]', guidePanel(this, beat));
    if (changed) this.revealGuide(false);
  }
  private showTutorial(introduction = false) {
    this.stop();
    this.closeOutcome();
    const dialog = this.element<HTMLDialogElement>('[data-outcome]');
    dialog.dataset.tone = 'story';
    dialog.innerHTML = tutorialCall(this, introduction);
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private renderIncident() {
    const dialog = this.element<HTMLDialogElement>('[data-outcome]');
    dialog.dataset.tone = 'incident';
    dialog.innerHTML = incidentCall(this);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
      preventScroll: true,
    });
  }
  private outcomeKey() {
    return `${this.runId}:${this.state.phase}:${this.state.tick}`;
  }
  private renderOutcome(revealed = false) {
    const state = this.state;
    if (!['incident', 'won', 'lost', 'duplicate'].includes(state.phase)) return;
    const key = this.outcomeKey();
    if (this.lastOutcome === key) return;
    this.lastOutcome = key;
    if (!revealed && state.phase !== 'won' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    if (state.phase === 'incident') {
      this.renderIncident();
      return;
    }
    const dialog = this.element<HTMLDialogElement>('[data-outcome]');
    dialog.dataset.tone = isFatalOutcome(this) ? 'loss' : 'win';
    dialog.innerHTML = outcomeScene(this);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector<HTMLButtonElement>('[data-primary]')?.focus({
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
      `✦ ${this.copy.sessionAchievements} · ${this.unlocked.size}/${achievements.length}`,
    );
    this.replace(
      '[data-achievements]',
      achievements
        .map((achievement) => {
          const [title, description] = this.es ? achievement.es : achievement.en;
          return /* HTML */ `<article
            class="${this.unlocked.has(achievement.id) ? 'is-unlocked' : ''}"
          >
            <span aria-hidden="true"
              >${this.unlocked.has(achievement.id) ? '✦' : '◇'}</span
            >
            <div>
              <h3>
                ${esc(title)}${this.unlocked.has(achievement.id) ? /* HTML */ ` <small>· ${this.copy.unlocked}</small>` : ''}
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
              >✦ ${this.copy.achievementUnlocked}</span
            >${this.notices
              .map((id) => {
                const achievement = achievements.find((first) => first.id === id)!;
                return /* HTML */ `<strong
                    >${esc((this.es ? achievement.es : achievement.en)[0])}</strong
                  ><small>${esc((this.es ? achievement.es : achievement.en)[1])}</small>`;
              })
              .join('')}${button('toast-close', this.copy.gotIt)}`
        : '',
    );
  }
  private status(status: SimulationState['jobs'][number]['status']) {
    return {
      pending: this.copy.pending,
      working: this.copy.processing,
      retrying: this.copy.unconfirmedRetry,
      done: this.copy.completed,
      lost: this.copy.lost,
      failed: this.copy.duplicatedStopped,
    }[status];
  }
  private renderMetrics() {
    const counts = totals(this.state);
    this.replace(
      '[data-results]',
      /* HTML */ `<span
          ><b>${counts.done}</b> ${this.copy.completed2}</span
        ><span><b>${counts.lost}</b> ${this.copy.lost2}</span
        >${this.definition.metrics(this)}`,
    );
  }
  // Paint the current engine snapshot. Animation and DOM state cannot commit work.
  private update() {
    this.paintStatus();
    this.paintControls();
    this.paintNames();
    this.paintJobs();
    this.definition.paintSystem(this);
    this.paintActiveJob();
    this.paintSteps();
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
  private get shownJobIndex() {
    return this.inspected >= 0 ? this.inspected : Math.max(0, this.state.active);
  }
  private paintStatus() {
    const state = this.state,
      counts = totals(state);
    this.dataset.phase = state.phase;
    this.dataset.retryStage = this.retryStage ?? '';
    this.style.setProperty('--qs-tick-duration', `${650 / this.speed}ms`);
    for (const speed of [1, 2, 3, 4])
      this.element(`[data-action="speed:${speed}"]`).setAttribute('aria-pressed', String(speed === this.speed));
    this.classList.toggle('is-playing', this.playing || !!this.retryStage);
    this.classList.toggle('is-guided', this.guide !== 'off');
    this.classList.toggle(
      'is-worker-down',
      state.phase === 'lost' ||
        (state.phase === 'incident' && state.incident !== 'ack-retry'),
    );
    this.classList.toggle('is-personalizing', this.personalizing);
    this.element('[data-score]').textContent = `${counts.done}/${JOB_COUNT}`;
  }
  private paintControls() {
    const state = this.state,
      terminal = ['won', 'lost', 'duplicate'].includes(state.phase);
    for (const play of this.querySelectorAll<HTMLButtonElement>(
      '[data-action=play]',
    ))
      play.textContent = this.retryStage
        ? this.copy.pauseRestart
        : this.playing
        ? this.copy.pause
        : state.phase === 'incident'
          ? this.copy.reprocessPayment
          : terminal
            ? this.copy.tryAgain
            : state.phase === 'ready'
              ? this.copy.start
              : this.copy.resume;
    const help = this.element('[data-action=guide]');
    this.element('[data-tutorial-label]').textContent =
      this.guide === 'off'
        ? this.copy.tutorial
        : this.copy.viewStep;
    help.setAttribute(
      'aria-label',
      this.guide === 'off'
        ? this.copy.openTutorial
        : this.copy.readTheWalkthroughStep,
    );
    help.title = help.getAttribute('aria-label')!;
    this.element('[data-personalize-label]').textContent = this.personalizing
      ? this.copy.done
      : this.copy.names;
    this.element('[data-action=personalize]').setAttribute(
      'aria-label',
      this.personalizing
        ? this.copy.finishEditing
        : this.copy.editNames,
    );
  }
  private paintNames() {
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
  }
  private paintJobs() {
    for (const job of this.state.jobs) {
      const index = job.id - 1;
      this.element(`[data-progress="${index}"]`).className = `is-${job.status}`;
      this.element(`[data-job-row="${index}"]`).className =
        `qs-job is-${job.status}${this.inspected === index ? ' is-inspected' : ''}`;
      this.element(`[data-job-status="${index}"]`).textContent = this.status(job.status);
      this.element(`[data-job-icon="${index}"]`).textContent = {
        pending: '○',
        working: '▶',
        retrying: '↻',
        done: '✓',
        lost: '×',
        failed: '×',
      }[job.status];
    }
  }
  private paintActiveJob() {
    const state = this.state,
      shown = this.shownJobIndex,
      job = state.jobs[shown]!;
    this.element('[data-active-job]').classList.toggle(
      'is-executing',
      job.status === 'working' && state.active === shown,
    );
    this.element('[data-active-job]').textContent =
      state.phase === 'ready'
        ? this.copy.waitingForTheFirstPayment
        : `${this.inspected >= 0 ? this.copy.inspecting : ''}${this.job(shown)} · ID ${String(shown + 1).padStart(2, '0')}${job.status === 'working' && state.active === shown ? ' → ' + (state.cursor === 'ack' ? this.copy.confirmCompletion : this.step(state.step)) : ''}`;
  }
  private paintSteps() {
    const state = this.state,
      shown = this.shownJobIndex,
      job = state.jobs[shown]!;
    for (let index = 0; index < this.config.steps.length; index++) {
      const progress = job.steps[index]!,
        retryOrigin = this.retryStage === 'failure' && state.active === shown && state.step === index,
        restarting = this.retryStage === 'restart' && state.active === shown && index === 0,
        uncertain = state.phase === 'incident' && state.incident === 'email-uncertain' && state.active === shown && state.step === index,
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
      this.element(`[data-step-card="${index}"]`).className =
        `qs-step ${active ? 'is-active' : ''} ${failed ? 'is-failed' : ''} ${uncertain ? 'is-uncertain' : ''} ${retryOrigin ? 'is-retry-origin' : ''} ${restarting ? 'is-restarting' : ''} ${progress.effects > 1 ? 'has-duplicate' : ''}`;
      this.element(`[data-step-icon="${index}"]`).textContent =
        restarting
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
      this.element(`[data-step-state="${index}"]`).textContent = this.definition.stepState(this, index, {
        progress: progress,
        shown,
        active,
        restarting,
        uncertain,
        failed,
      });
    }
  }
  private renderActor() {
    const frame = workerFrame(this.state, this.retryStage);
    this.actor?.render(frame, this.speed, this.playing || !!this.retryStage,
      matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.element('[data-worker-journey]').dataset.actorState = frame.state;
    for (let index = 0; index < this.config.steps.length; index++) {
      const station = this.element(`[data-actor-station="${index}"]`);
      station.classList.toggle('is-current', index === frame.step);
      const progress = this.state.jobs[Math.max(0, this.state.active)]!.steps[index]!;
      station.classList.toggle('is-finished', progress.effects > 0 && !(frame.state === 'uncertain' && index === frame.step));
    }
    const caption: Record<typeof frame.state, string> = {
      idle: this.copy.workerReadyWaitingForA,
      working: this.copy.symbol(frame.step + 1, this.step(frame.step)),
      saving: this.copy.savingThisStepsCheckpoint,
      skipping: this.copy.stepSavedSkippingIt(frame.step + 1),
      dead: this.copy.workerCrashedEarlierEffectsStill,
      uncertain: this.copy.stillAliveWaitingForA,
      duplicate: this.copy.againTheSameIdproduced,
      returning: ['activation-failed', 'worker-retry'].includes(this.state.incident)
        ? this.copy.newWorkerSamePaymentBack
        : this.copy.sameWorkerSamePaymentBack,
      done: this.copy.paymentCompleteWorkDelivered,
    };
    this.element('[data-actor-caption]').textContent = `${!this.playing && !this.retryStage && this.state.phase === 'running' ? this.copy.paused : ''}${caption[frame.state]}`;
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
