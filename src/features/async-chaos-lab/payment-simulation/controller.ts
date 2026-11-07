import { PLAYBACK_SPEEDS, TICK_MILLISECONDS, advance, continueAfterIncident, initialState, totals } from './engine';
import type { SimulationConfig, SimulationState } from './engine';
import { cleanLabel, escapeHtml } from '../shared/text';
import type { Labels } from './labels';
import { achievements } from './achievements';
import { paymentCopy } from './copy';
import { incidentCall, isFatalOutcome, outcomeScene, tutorialCall } from './dialogs';
import { guidePanel } from './guide-panel';
import type { PaymentLabDefinition } from './definition';
import type { GuideStage } from './guide';
import type { AchievementId } from './achievements';
import { workerFrame, WorkerActor } from './worker-actor';
import { achievementList, achievementToast, labShell, stepCards } from './markup';
import { paintActiveJob, paintControls, paintJobs, paintNames, paintStatus, paintSteps } from './painter';
import { inLanguage, isSpanishLab } from '../shared/lab-ui';
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
  speed = 1;
  guide: GuideStage = 'off';
  private backup:
    | {
        config: SimulationConfig;
        state: SimulationState;
        inspected: number;
        personalizing: boolean;
      }
    | undefined;
  inspected = -1;
  private guideTarget = '';
  personalizing = false;
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
    return cleanLabel(this.labels.steps[index], this.defaults.steps[index] ?? `${this.copy.step} ${index + 1}`);
  }
  // Lifecycle: initialize once connected; stop timers/listeners on disconnect.
  connectedCallback() {
    this.config = this.definition.defaultConfig();
    this.state = initialState(this.config);
    this.defaults = this.definition.defaultLabels(this.es);
    this.labels = restoreLabels(this.defaults, this.definition.stepNamesKey, this.es);
    this.unlocked = restoreAchievements();
    this.syncStorageName();
    this.innerHTML = labShell(this);
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
  buildSteps() {
    this.element('[data-steps]').innerHTML = stepCards(this);
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
    if (this.state.phase === 'incident' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    this.element<HTMLButtonElement>('.lab-dock [data-action=play]').focus({
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
    if (this.state.phase === 'incident') this.state = continueAfterIncident(this.state);
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
    }, TICK_MILLISECONDS / this.speed);
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
    this.element<HTMLButtonElement>('.lab-dock [data-action=play]').focus({
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
  private onClick = (event: Event) => {
    const clickedButton = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!clickedButton || clickedButton.disabled) return;
    const [action, value] = clickedButton.dataset.action!.split(':');
    if (action === 'play') {
      if (this.playing || this.retryStage) this.stop();
      else this.start();
    }
    if (action === 'speed' && PLAYBACK_SPEEDS.some((speed) => speed === Number(value))) {
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
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
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
  private onInput = (event: Event) => {
    const input = event.target as HTMLInputElement,
      key = input.dataset.label;
    if (!key) return;
    const value = input.value.slice(0, 64);
    if (key === 'api' || key === 'storage' || key === 'worker') this.labels[key] = value;
    else if (key.startsWith('job-')) this.labels.jobs[Number(key.slice(4))] = value;
    else if (key.startsWith('step-')) this.labels.steps[Number(key.slice(5))] = value;
    saveLabel(key, this.labels, this.definition.stepNamesKey, this.es);
    this.update();
  };
  syncStorageName() {
    if (['Memoria RAM', 'RAM memory', 'Base de datos', 'Database'].includes(this.labels.storage))
      this.labels.storage = this.config.storage === 'ram' ? this.copy.ramMemory : this.copy.database;
    const input = this.querySelector<HTMLInputElement>('[data-label=storage]');
    if (input) input.value = this.labels.storage;
  }
  private onChange = (event: Event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement,
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
      node?.setAttribute('aria-describedby', 'lab-guide-task');
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
    if (this.lastOutcome === key || this.outcomeTimer || this.retryStage) return;
    if (!revealed && state.phase !== 'won' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Let the character react before a dialog obscures the worker stage.
      this.dataset.outcomePending = 'true';
      this.outcomeTimer = setTimeout(() => {
        this.outcomeTimer = undefined;
        this.dataset.outcomePending = '';
        if (!this.isConnected || this.outcomeKey() !== key || this.retryStage) return;
        this.renderOutcome(true);
      }, 700);
      return;
    }
    this.lastOutcome = key;
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
    this.replace('[data-achievements]', achievementList(this, this.unlocked));
    this.replace('[data-toast]', achievementToast(this));
  }
  private renderMetrics() {
    const counts = totals(this.state);
    this.replace(
      '[data-results]',
      /* HTML */ `<span><b>${counts.done}</b> ${this.copy.completedCount}</span
        ><span><b>${counts.lost}</b> ${this.copy.lostCount}</span>${this.definition.metrics(this)}`,
    );
  }
  // Paint the current engine snapshot. Animation and DOM state cannot commit work.
  private update() {
    paintStatus(this);
    paintControls(this);
    paintNames(this);
    paintJobs(this);
    this.definition.paintSystem(this);
    paintActiveJob(this);
    paintSteps(this);
    this.renderActor();
    const [title, text] = this.definition.feedback(this);
    this.replace(
      '[data-feedback]',
      /* HTML */ `<strong>${escapeHtml(title)}</strong>
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
    this.actor?.render(
      frame,
      this.speed,
      this.playing || !!this.retryStage,
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    this.element('[data-worker-journey]').dataset.actorState = frame.state;
    for (let index = 0; index < this.config.steps.length; index++) {
      const station = this.element(`[data-actor-station="${index}"]`);
      station.classList.toggle('is-current', index === frame.step);
      const progress = this.state.jobs[Math.max(0, this.state.active)]!.steps[index]!;
      station.classList.toggle(
        'is-finished',
        progress.effects > 0 && !(frame.state === 'uncertain' && index === frame.step),
      );
    }
    const caption: Record<typeof frame.state, string> = {
      idle: this.copy.workerReadyWaitingForPayment,
      working: this.copy.numberedStep(frame.step + 1, this.step(frame.step)),
      saving: this.copy.savingThisStepsCheckpoint,
      skipping: this.copy.stepSavedSkippingIt(frame.step + 1),
      dead: this.copy.workerCrashedEarlierEffectsRemain,
      uncertain: this.copy.stillAliveWaitingForConfirmation,
      duplicate: this.copy.sameIdProducedTwoEffects,
      returning: ['activation-failed', 'worker-retry'].includes(this.state.incident)
        ? this.copy.newWorkerSamePaymentBackToStart
        : this.copy.sameWorkerSamePaymentBackToStart,
      done: this.copy.paymentCompleteWorkDelivered,
    };
    this.element('[data-actor-caption]').textContent =
      `${!this.playing && !this.retryStage && this.state.phase === 'running' ? this.copy.paused : ''}${caption[frame.state]}`;
  }
}
export function definePaymentLab(definition: PaymentLabDefinition) {
  if (customElements.get('payment-lab')) return;
  customElements.define(
    'payment-lab',
    class extends PaymentLab {
      readonly definition = definition;
    },
  );
}
