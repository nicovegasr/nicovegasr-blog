import { recordAttempt, type Attempt } from './attempts';
import { renderBriefing } from './briefing';
import { CHALLENGES, INCIDENT_WARNING, requestedChallengeId, starsFor, type Challenge } from './challenges';
import { CoachOverlay, type Coach } from './coach-overlay';
import { renderCode } from './code-view';
import { tutorial } from './tutorial';
import {
  advance,
  BATCH_SIZES,
  isComplete,
  isOver,
  isReadCard,
  listMegabytes,
  outcomeOf,
  startRun,
  type BatchSize,
  type Build,
  type Card,
  type Incident,
  type RunState,
} from './engine';
import { renderHud } from './hud-view';
import { labTextFor, type LabText } from './lab-text';
import { loadProgress, loadSeenTips, recordRun, saveSeenTips, type Progress } from './progress';
import { renderLiveObjectives, renderResult } from './result-view';
import { StageAnimator } from './stage-animator';

const STEPS_PER_SECOND = 30;

class OutOfMemoryLab extends HTMLElement {
  private text: LabText = labTextFor('es');
  private challenge: Challenge = CHALLENGES[0]!;
  private build: Build = { read: null, write: null };
  private batchSize: BatchSize = 1_000;
  private progress: Progress = { stars: {}, survived: {} };
  private seen = new Set<string>();
  private run: RunState | null = null;
  private paused = false;
  private frame = 0;
  private lastTime = 0;
  private stepClock = 0;
  private draggedCard: Card | null = null;
  private tutorialIndex: number | null = null;
  private warnedIncidents = new Set<Incident>();
  private attempts = new Map<number, readonly Attempt[]>();
  private readonly coach = new CoachOverlay(this, () => this.isNarrow);
  private readonly animator = new StageAnimator(this, () => this.reducedMotion);

  connectedCallback() {
    this.text = labTextFor(this.dataset.locale === 'en' ? 'en' : 'es');
    this.progress = loadProgress();
    this.seen = loadSeenTips();
    this.listen();
    this.fitToScreen();
    window.addEventListener('resize', this.fitToScreen);

    // Every visit starts over at the challenge in the link, or challenge 1; the stars won stay.
    this.selectChallenge(requestedChallengeId(window.location.search));
    void document.fonts.ready.then(this.coach.place);
    this.frame = requestAnimationFrame(this.tick);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.coach.place);
    window.removeEventListener('resize', this.fitToScreen);
  }

  private listen() {
    this.querySelectorAll<HTMLButtonElement>('[data-challenge]').forEach((button) =>
      button.addEventListener('click', () => this.selectChallenge(Number(button.dataset.challenge))),
    );
    this.querySelectorAll<HTMLElement>('[data-card]').forEach((element) => {
      const card = element.dataset.card as Card;
      element.querySelector('[data-place]')!.addEventListener('click', () => this.place(card));
      element.querySelector('[data-flip]')!.addEventListener('click', () => element.classList.toggle('is-flipped'));
      element.addEventListener('dragstart', (event) => {
        this.draggedCard = card;
        event.dataTransfer?.setData('text/plain', card);
        this.one('[data-code-panel]').classList.add('is-dragging', isReadCard(card) ? 'drags-read' : 'drags-write');
      });
      element.addEventListener('dragend', () => {
        this.draggedCard = null;
        this.one('[data-code-panel]').classList.remove('is-dragging', 'drags-read', 'drags-write');
      });
    });
    const codePanel = this.one('[data-code-panel]');
    codePanel.addEventListener('dragover', (event) => {
      if (this.draggedCard !== null && this.canEdit) event.preventDefault();
    });
    codePanel.addEventListener('drop', (event) => {
      event.preventDefault();
      if (this.draggedCard !== null) this.place(this.draggedCard);
    });
    codePanel.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const remove = target.closest<HTMLElement>('[data-remove]');
      if (remove) this.removeCard(remove.dataset.remove as Card);
      const dial = target.closest<HTMLElement>('[data-dial]');
      if (dial) this.turnDial(dial.dataset.dial === '+' ? 1 : -1);
    });

    this.one('[data-run]').addEventListener('click', () => this.start());
    this.one('[data-pause]').addEventListener('click', () => this.setPaused(!this.paused));
    this.one('[data-stop]').addEventListener('click', () => this.stop());
    this.one('[data-retry]').addEventListener('click', () => this.stop());
    this.one('[data-next]').addEventListener('click', () => this.selectChallenge(this.challenge.id + 1));
    this.one('[data-help]').addEventListener('click', () => this.startTutorial());
    this.one('[data-briefing-start]').addEventListener('click', () => this.closeBriefing());
    this.one('[data-bubble-next]').addEventListener('click', () => this.coach.current?.onNext?.());
    this.one('[data-bubble-skip]').addEventListener('click', () => this.endTutorial());
    window.addEventListener('resize', this.coach.place);
    // Scroll events do not bubble: capturing is what catches the code panel and the hand of cards.
    this.addEventListener('scroll', this.coach.follow, true);
  }

  /** The game takes the screen under the site navigation, and the page opens on it. */
  private fitToScreen = () => {
    const navigation = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
    this.style.setProperty('--oom-nav', `${navigation}px`);
    const game = this.one('[data-game]');
    const top = game.getBoundingClientRect().top + window.scrollY - navigation - 8;
    if (window.scrollY < top + 40 && window.matchMedia('(min-width: 901px)').matches) window.scrollTo({ top });
  };

  private one<Type extends Element = HTMLElement>(selector: string): Type {
    return this.querySelector<Type>(selector)!;
  }

  private get canEdit() {
    return this.run === null;
  }

  /** On a phone the game stacks and is taller than the screen, so the page has to follow the action. */
  private get isNarrow() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  private get reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Challenge and pipeline ──────────────────────────────────────────

  private selectChallenge(id: number) {
    const challenge = CHALLENGES.find((candidate) => candidate.id === id);
    if (challenge === undefined) return;
    this.challenge = challenge;
    this.build = { read: null, write: null };
    this.stop();
    this.renderHud();
    this.renderCards();
    this.renderScript();
    // Entering a challenge always starts it from scratch, on its sheet.
    this.showBriefing();
  }

  /** Before playing a challenge: what it asks, how big it is, what wins each star. */
  private showBriefing() {
    if (this.tutorialIndex !== null) return;
    const sheet = this.one('[data-briefing]');
    renderBriefing(this.text, sheet, this.challenge);
    sheet.hidden = false;
    this.one<HTMLButtonElement>('[data-briefing-start]').focus({ preventScroll: true });
  }

  private closeBriefing() {
    this.one('[data-briefing]').hidden = true;
    if (!this.seen.has('tutorial') && this.challenge.id === 1) this.startTutorial();
    else this.offerNewCardTip();
  }

  private place(card: Card) {
    if (!this.canEdit || !this.challenge.cards.includes(card)) return;
    this.build = isReadCard(card) ? { ...this.build, read: card } : { ...this.build, write: card };
    this.afterBuildChange();
    if (card === 'batches' && this.tutorialIndex === null) {
      this.showTip('dial', { target: '[data-dial-control]', ...this.text.copy.tips.dial, button: this.text.copy.controls.gotIt, skippable: false });
    }
  }

  private removeCard(card: Card) {
    if (!this.canEdit) return;
    this.build = isReadCard(card) ? { ...this.build, read: null } : { ...this.build, write: null };
    this.afterBuildChange();
  }

  private afterBuildChange() {
    this.renderCards();
    this.renderScript();
    this.renderStage(null);
    this.advanceTutorial();
  }

  private turnDial(direction: 1 | -1) {
    if (!this.canEdit) return;
    const index = BATCH_SIZES.indexOf(this.batchSize) + direction;
    const next = BATCH_SIZES[Math.max(0, Math.min(BATCH_SIZES.length - 1, index))];
    if (next === undefined || next === this.batchSize) return;
    this.batchSize = next;
    this.renderScript();
  }

  private renderHud() {
    renderHud(this.text, this, this.challenge, this.progress);
  }

  private renderCards() {
    const running = !this.canEdit;
    this.querySelectorAll<HTMLElement>('[data-card]').forEach((element) => {
      const card = element.dataset.card as Card;
      element.hidden = !this.challenge.cards.includes(card);
      element.classList.toggle('is-placed', this.build.read === card || this.build.write === card);
      element.classList.toggle('is-new', this.challenge.id > 1 && this.challenge.newCards.includes(card) && !this.progress.survived[this.challenge.id]);
      element.classList.toggle('is-locked', running);
      if (!this.challenge.cards.includes(card)) element.classList.remove('is-flipped');
      element.draggable = !running;
      element.querySelector<HTMLButtonElement>('[data-place]')!.disabled = running;
    });
    this.querySelectorAll<HTMLElement>('[data-group]').forEach((group) => {
      const visibleCards = group.querySelectorAll('[data-card]:not([hidden])').length;
      group.hidden = visibleCards === 0;
      group.style.flexGrow = String(visibleCards);
    });
    const run = this.one<HTMLButtonElement>('[data-run]');
    run.disabled = !isComplete(this.build);
    run.textContent = isComplete(this.build) ? this.text.copy.controls.run : this.text.copy.controls.completeTheCode;
  }

  private renderScript() {
    renderCode(this.text.copy, this.one('[data-code]'), this.build, this.batchSize, this.canEdit);
  }

  // ── Running ─────────────────────────────────────────────────────────

  private start() {
    if (!isComplete(this.build) || this.run !== null) return;
    const build = this.build;
    this.run = startRun(build, this.challenge.scenario);
    this.paused = false;
    this.stepClock = 0;
    this.warnedIncidents.clear();
    this.resetStage();
    if (build.read === 'load-all') this.animator.walkToShelf();
    this.one('[data-stage]').classList.toggle('is-streaming', build.read === 'cursor');
    this.setRunControls(true);
    this.renderCards();
    this.renderScript();
    if (this.tutorialIndex !== null && tutorial[this.tutorialIndex]?.until === 'run') this.endTutorial();
    if (this.isNarrow) this.one('[data-stage]').scrollIntoView({ block: 'center', behavior: 'instant' });
    if (this.reducedMotion) {
      let run = this.run;
      while (!isOver(run)) run = advance(run, this.batchSize);
      this.run = run;
      this.finish();
    }
  }

  private stop() {
    this.run = null;
    this.paused = false;
    this.setRunControls(false);
    this.resetStage();
    this.renderCards();
    this.renderScript();
  }

  private setPaused(paused: boolean) {
    this.paused = paused;
    this.one('[data-pause]').textContent = paused ? this.text.copy.controls.resume : this.text.copy.controls.pause;
    this.one('[data-stage]').classList.toggle('is-paused', paused);
  }

  private setRunControls(running: boolean) {
    this.one('[data-run]').hidden = running;
    this.one('[data-pause]').hidden = !running;
    this.one('[data-stop]').hidden = !running;
    this.one('[data-progress]').hidden = !running;
    this.one('[data-pause]').textContent = this.text.copy.controls.pause;
    this.one('[data-result]').hidden = true;
  }

  private tick = (now: number) => {
    const elapsed = this.lastTime === 0 ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    let run = this.run;
    if (run !== null && !isOver(run) && !this.paused && this.coach.current === null) {
      this.stepClock += elapsed;
      while (this.stepClock >= 1 / STEPS_PER_SECOND && !isOver(run)) {
        this.stepClock -= 1 / STEPS_PER_SECOND;
        run = advance(run, this.batchSize);
        this.animator.react(run);
      }
      this.run = run;
      this.renderStage(run);
      this.warnAboutIncidents(run);
      if (isOver(run)) this.finish();
    }
    if (!this.paused && this.coach.current === null) this.animator.animate(elapsed, this.run);
    this.frame = requestAnimationFrame(this.tick);
  };

  private warnAboutIncidents(run: RunState) {
    const progress = run.logsAnalyzed / run.scenario.logs;
    const upcoming = run.scenario.incidents.find(
      (incident) => progress >= incident.from - INCIDENT_WARNING && progress < incident.from,
    );
    const banner = this.one('[data-incident]');
    if (run.incident !== null && !isOver(run)) {
      banner.hidden = false;
      banner.className = 'oom-incident is-active';
      this.one('[data-incident-title]').textContent = this.text.copy.incidents[run.incident.kind].title;
      this.one('[data-incident-text]').textContent = this.text.copy.incidents[run.incident.kind].text;
    } else if (upcoming !== undefined && !isOver(run)) {
      banner.hidden = false;
      banner.className = 'oom-incident is-warning';
      this.one('[data-incident-title]').textContent = this.text.copy.controls.attention;
      this.one('[data-incident-text]').textContent = this.text.copy.incidents[upcoming.kind].warning;
      if (!this.warnedIncidents.has(upcoming)) {
        this.warnedIncidents.add(upcoming);
        this.animator.surprise();
        this.showTip(`incident-${upcoming.kind}`, {
          target: '[data-incident]',
          side: 'left',
          ...this.text.copy.tips.incident(this.text.copy.incidents[upcoming.kind].tip),
          button: this.text.copy.controls.continue,
          skippable: false,
        });
      }
    } else {
      banner.hidden = true;
    }
  }

  private finish() {
    const run = this.run;
    if (run === null) return;
    const build = run.build;
    const outcome = outcomeOf(run);
    const stars = starsFor(this.challenge, outcome);
    const survived = outcome.killedBy === null;
    this.renderStage(run);
    this.one('[data-incident]').hidden = true;
    const stage = this.one('[data-stage]');
    stage.classList.remove('is-streaming', 'is-loading');
    stage.classList.add(survived ? 'is-done' : 'is-killed');
    this.animator.stopWalking();
    if (survived) this.animator.confetti();
    else this.animator.burst();

    this.progress = recordRun(this.progress, this.challenge.id, stars, survived);
    const attempts = recordAttempt(this.attempts.get(this.challenge.id) ?? [], { build, batchSize: this.batchSize, stars, outcome });
    this.attempts.set(this.challenge.id, attempts);
    this.renderHud();
    renderLiveObjectives(this.text, this, this.challenge, run);
    this.one('[data-progress]').hidden = true;
    this.one('[data-pause]').hidden = true;
    this.one('[data-stop]').hidden = true;

    window.setTimeout(() => {
      if (this.run !== run) return;
      const hasNext = CHALLENGES.some(({ id }) => id === this.challenge.id + 1);
      renderResult(this.text, this, { challenge: this.challenge, build, outcome, stars, attempts, hasNext });
      const result = this.one('[data-result]');
      result.hidden = false;
      if (this.isNarrow) result.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, this.reducedMotion ? 0 : 1_300);
  }

  // ── Stage ───────────────────────────────────────────────────────────

  private resetStage() {
    this.one('[data-stage]').classList.remove('is-killed', 'is-done', 'is-streaming', 'is-loading', 'is-paused');
    this.one('[data-incident]').hidden = true;
    this.animator.reset();
    this.renderStage(null);
    this.animator.animate(0, null);
  }

  private renderStage(run: RunState | null) {
    const { scenario } = this.challenge;
    const limit = scenario.memoryLimitMegabytes;
    const megabytes = run?.megabytes ?? (isComplete(this.build) ? 150 : 0);
    const share = Math.min(1, megabytes / limit);
    const squeeze = run?.incident?.kind === 'memory-squeeze' ? run.incident.amount / limit : 0;
    this.one('[data-memory-fill]').style.width = `${share * 100}%`;
    this.one('[data-memory-squeeze]').style.width = `${squeeze * 100}%`;
    this.one('[data-memory-label]').textContent = `${this.text.format.megabytes(megabytes)} / ${this.text.format.megabytes(limit - squeeze * limit)}`;
    const effectiveShare = Math.min(1, megabytes / (limit * (1 - squeeze)));
    const memory = this.one('[data-memory]');
    memory.classList.toggle('is-warm', effectiveShare > 0.6);
    memory.classList.toggle('is-danger', effectiveShare > 0.85);
    const hero = this.one('[data-hero]');
    hero.style.setProperty('--fill', String(effectiveShare));
    hero.classList.toggle('is-warm', effectiveShare > 0.6);
    hero.classList.toggle('is-danger', effectiveShare > 0.85);
    this.one('[data-stage]').classList.toggle('is-loading', run?.phase === 'loading');
    this.one('[data-rows]').style.height = `${this.logsLeft(run) * 100}%`;
    renderLiveObjectives(this.text, this, this.challenge, run);
    this.one('[data-progress] i').style.width = `${run === null ? 0 : (run.step / scenario.steps) * 100}%`;
  }

  /** Share of the logs still on the shelf. A list too big to fit barely makes a dent before dying. */
  private logsLeft(run: RunState | null) {
    if (run === null) return 1;
    if (run.build.read === 'load-all') return 1 - Math.min(1, run.loadedMegabytes / listMegabytes(run.scenario));
    return 1 - run.logsAnalyzed / run.scenario.logs;
  }

  // ── Tutorial and tips ───────────────────────────────────────────────

  private startTutorial() {
    this.coach.hide();
    // The tutorial plays on challenge 1, so its sheet is not needed on top.
    this.one('[data-briefing]').hidden = true;
    // Always from an empty method: the tutorial points at the holes. Set first, so no sheet opens.
    this.tutorialIndex = 0;
    this.selectChallenge(1);
    this.showTutorialStep();
  }

  private showTutorialStep() {
    const index = this.tutorialIndex;
    const step = index === null ? undefined : tutorial[index];
    if (index === null || step === undefined) return this.endTutorial();
    this.coach.show({
      target: step.target,
      side: step.side,
      ...(step.alsoHighlight === undefined ? {} : { alsoHighlight: step.alsoHighlight }),
      ...this.text.copy.tutorial[step.id]!,
      step: this.text.copy.controls.step(index + 1, tutorial.length),
      ...(step.until === undefined ? {} : { waiting: this.text.copy.waiting[step.until] }),
      button: step.until === undefined ? this.text.copy.page.next : null,
      skippable: true,
      onNext: () => {
        this.tutorialIndex = index + 1;
        this.showTutorialStep();
      },
    });
  }

  private advanceTutorial() {
    if (this.tutorialIndex === null || tutorial[this.tutorialIndex]?.until === undefined) return;
    // Follows the method in both directions: removing a card goes back to the step that asks for it.
    this.tutorialIndex = tutorial.findIndex(
      ({ until }) => (until === 'read' && this.build.read === null) || (until === 'write' && this.build.write === null) || until === 'run',
    );
    this.showTutorialStep();
  }

  private endTutorial() {
    this.tutorialIndex = null;
    this.seen.add('tutorial');
    saveSeenTips(this.seen);
    this.coach.hide();
  }

  private offerNewCardTip() {
    if (this.tutorialIndex !== null || this.challenge.id === 1) return;
    const card = this.challenge.newCards[0];
    if (card === undefined) return;
    this.showTip(`card-${card}`, {
      target: `[data-card="${card}"]`,
      ...this.text.copy.tips.newCard(this.text.copy.cards[card].label),
      button: this.text.copy.controls.okay,
      skippable: false,
    });
  }

  private showTip(id: string, coach: Omit<Coach, 'onNext'>) {
    if (this.seen.has(id) || this.coach.current !== null) return;
    this.seen.add(id);
    saveSeenTips(this.seen);
    this.coach.show({ ...coach, onNext: () => this.coach.hide() });
  }
}

customElements.define('out-of-memory-lab', OutOfMemoryLab);
