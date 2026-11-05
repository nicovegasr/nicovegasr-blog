import { placeBubble, type Side } from './bubble-placement';

export interface Coach {
  readonly target: string;
  readonly side?: Side;
  readonly alsoHighlight?: string;
  readonly waiting?: string;
  readonly title: string;
  readonly text: string;
  readonly step?: string;
  readonly button: string | null;
  readonly skippable: boolean;
  readonly onNext?: () => void;
}

/** The dimmed game with framed targets and a bubble that explains them. */
export class CoachOverlay {
  current: Coach | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly isNarrow: () => boolean,
  ) {}

  private one(selector: string) {
    return this.root.querySelector<HTMLElement>(selector)!;
  }

  show(coach: Coach) {
    this.current = coach;
    this.one('[data-coach]').hidden = false;
    this.one('[data-bubble-step]').textContent = coach.step ?? '';
    this.one('[data-bubble-title]').textContent = coach.title;
    this.one('[data-bubble-text]').textContent = coach.text;
    this.one('[data-bubble-wait]').textContent = coach.waiting ?? '';
    const next = this.one('[data-bubble-next]');
    next.hidden = coach.button === null;
    next.textContent = coach.button ?? '';
    this.one('[data-bubble-skip]').hidden = !coach.skippable;
    // Steps that wait for an action let the run start; the rest pause it.
    this.one('[data-coach]').classList.toggle('is-blocking', coach.button !== null);
    this.callCards(coach.alsoHighlight);
    this.place();
  }

  hide() {
    this.callCards(undefined);
    this.current = null;
    this.one('[data-coach]').hidden = true;
  }

  place = () => {
    const coach = this.current;
    if (coach === null) return;
    const targetElement = this.root.querySelector(coach.target);
    if (targetElement === null) return;
    const bubble = this.one('[data-bubble]');
    const docked = this.isNarrow();
    // On a phone the game is taller than the screen: the bubble docks and what to touch comes to it.
    const focus = coach.alsoHighlight === undefined ? targetElement : (this.root.querySelector(coach.alsoHighlight) ?? targetElement);
    if (docked) focus.scrollIntoView({ block: 'center', behavior: 'instant' });
    else this.bringIntoCodePanel(targetElement);

    const game = this.one('[data-game]').getBoundingClientRect();
    const target = this.highlight('[data-spotlight]', coach.target);
    this.highlight('[data-spotlight-also]', coach.alsoHighlight);
    this.cutDimAroundFrames();
    if (target === null) return;
    if (docked) {
      bubble.removeAttribute('style');
      // A target at the end of the page cannot reach the centre: the bubble must not sit on it.
      bubble.classList.toggle('is-docked-top', focus.getBoundingClientRect().bottom > window.innerHeight / 2);
      return;
    }
    bubble.classList.remove('is-docked-top');
    // The height depends on the width, so the width goes first.
    bubble.style.width = `${Math.min(340, game.width - 32)}px`;
    const { left, top } = placeBubble(target, { width: bubble.offsetWidth, height: bubble.offsetHeight }, game, coach.side);
    Object.assign(bubble.style, { left: `${left}px`, top: `${top}px` });
  };

  /** While the player scrolls, the frames follow what they mark and the bubble stays put. */
  follow = () => {
    if (this.current === null) return;
    this.highlight('[data-spotlight]', this.current.target);
    this.highlight('[data-spotlight-also]', this.current.alsoHighlight);
    this.cutDimAroundFrames();
  };

  private callCards(groupSelector: string | undefined) {
    this.root.querySelectorAll('[data-group]').forEach((group) => group.classList.remove('is-called'));
    if (groupSelector !== undefined) this.root.querySelector(groupSelector)?.classList.add('is-called');
  }

  /** Scrolls only the panel: on a big screen the page itself must stay where the player left it. */
  private bringIntoCodePanel(element: Element) {
    const panel = element.closest('[data-code-panel]');
    if (panel === null) return;
    const inPanel = panel.getBoundingClientRect();
    const inPage = element.getBoundingClientRect();
    if (inPage.top < inPanel.top) panel.scrollTop -= inPanel.top - inPage.top;
    else if (inPage.bottom > inPanel.bottom) panel.scrollTop += inPage.bottom - inPanel.bottom;
  }

  private cutDimAroundFrames() {
    const dim = this.one('[data-dim]');
    const holes = [this.one('[data-spotlight]'), this.one('[data-spotlight-also]')]
      .filter((frame) => !frame.hidden)
      .map((frame) => `M${frame.offsetLeft} ${frame.offsetTop}h${frame.offsetWidth}v${frame.offsetHeight}h${-frame.offsetWidth}z`);
    dim.style.clipPath = `path(evenodd, "M0 0H${dim.offsetWidth}V${dim.offsetHeight}H0z${holes.join('')}")`;
  }

  /** Frames an element, kept inside its panel, and returns where it is relative to the game. */
  private highlight(spotlightSelector: string, targetSelector: string | undefined) {
    const spotlight = this.one(spotlightSelector);
    const element = targetSelector === undefined ? null : this.root.querySelector(targetSelector);
    spotlight.hidden = true;
    if (element === null) return null;
    const rectangle = element.getBoundingClientRect();
    const game = this.one('[data-game]').getBoundingClientRect();
    const panel = element.closest('[data-code-panel]')?.getBoundingClientRect() ?? game;
    const pad = 6;
    const left = Math.max(2, panel.left - game.left, rectangle.left - game.left - pad);
    const top = Math.max(2, panel.top - game.top, rectangle.top - game.top - pad);
    const right = Math.min(game.width - 2, panel.right - game.left, rectangle.right - game.left + pad);
    const bottom = Math.min(game.height - 2, panel.bottom - game.top, rectangle.bottom - game.top + pad);
    // Scrolled out of its panel: a frame here would mark something else.
    if (right <= left || bottom <= top) return null;
    spotlight.hidden = false;
    Object.assign(spotlight.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    return { left, top, width: right - left, height: bottom - top };
  }
}
