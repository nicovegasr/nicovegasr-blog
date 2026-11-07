import walkAtlas from '@/shared/mascot/worker-walk-atlas.webp?url';
import reactionsAtlas from '@/shared/mascot/worker-reactions.webp?url';
import type { RunState } from './engine';

const SHELF_X = 15;
const DESK_X = 46;
const CABINET_X = 82;
const WALK_SPEED = 55;
const SPRINT_SPEED = 120;

type Atlas = 'walk' | 'reactions';
const POSES = {
  walk: [0, 1, 2, 1],
  standing: { atlas: 'walk', cell: 3 },
  thinking: { atlas: 'walk', cell: 4 },
  dead: { atlas: 'walk', cell: 5 },
  surprised: { atlas: 'reactions', cell: 2 },
  celebrating: { atlas: 'reactions', cell: 5 },
} as const;

type Carried = 'stack' | 'note' | 'box' | null;
interface Waypoint {
  readonly x: number;
  readonly carrying?: Carried;
  readonly arrive?: () => void;
}

/** The mascot and the things it carries: it acts out each step of the run, it never drives it. */
export class StageAnimator {
  private heroX = DESK_X;
  private route: Waypoint[] = [];
  private carrying: Carried = null;
  private heroClock = 0;
  private reaction: { pose: 'surprised'; until: number } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly reducedMotion: () => boolean,
  ) {}

  private one(selector: string) {
    return this.root.querySelector<HTMLElement>(selector)!;
  }

  reset() {
    this.one('[data-stage]').querySelectorAll('.oom-flying, .oom-confetti, .oom-paper').forEach((element) => element.remove());
    this.one('[data-drawer]').replaceChildren();
    this.heroX = DESK_X;
    this.route = [];
    this.carrying = null;
    this.reaction = null;
  }

  walkToShelf() {
    this.route = [{ x: SHELF_X + 7 }];
  }

  stopWalking() {
    this.route = [];
    this.carrying = null;
  }

  surprise() {
    this.reaction = { pose: 'surprised', until: performance.now() + 900 };
  }

  /** Turns what happened in a step into something the mascot does. */
  react(run: RunState) {
    if (this.reducedMotion()) return;
    const { events } = run;
    if (run.phase === 'loading' && run.step % 3 === 0) this.fly(SHELF_X, this.heroX, 'log');
    const idle = this.route.length === 0;
    if (events.includes('page') && idle) {
      this.route = [{ x: SHELF_X + 7, arrive: () => (this.carrying = 'stack') }, { x: DESK_X, arrive: () => (this.carrying = null) }];
    } else if (events.includes('trip') && idle) {
      this.route = [
        { x: CABINET_X - 7, carrying: 'note', arrive: () => this.file('note') },
        { x: DESK_X, carrying: null },
      ];
    } else if (events.includes('flush') && idle) {
      this.route = [{ x: CABINET_X - 7, carrying: 'box', arrive: () => this.file('box') }, { x: DESK_X }];
    } else if (events.includes('flush')) {
      this.fly(this.heroX, CABINET_X, 'box');
    }
    if (events.includes('incident')) this.surprise();
  }

  animate(elapsed: number, run: RunState | null) {
    const hero = this.one('[data-hero]');
    const sprite = this.one('[data-sprite]');
    this.heroClock += elapsed;
    const next = this.route[0];
    let pose: { atlas: Atlas; cell: number };
    let facingLeft = false;

    if (run?.phase === 'dead') pose = POSES.dead;
    else if (run?.phase === 'done') pose = POSES.celebrating;
    else if (this.reaction !== null && performance.now() < this.reaction.until) pose = POSES[this.reaction.pose];
    else if (next !== undefined) {
      if (next.carrying !== undefined) this.carrying = next.carrying;
      const speed = run?.build.write === 'one-by-one' ? SPRINT_SPEED : WALK_SPEED;
      const distance = next.x - this.heroX;
      this.heroX += Math.sign(distance) * Math.min(Math.abs(distance), speed * elapsed);
      facingLeft = distance < 0;
      if (Math.abs(next.x - this.heroX) < 0.01) {
        this.route.shift();
        next.arrive?.();
      }
      pose = { atlas: 'walk', cell: POSES.walk[Math.floor(this.heroClock * 9) % POSES.walk.length] ?? 3 };
    } else if (run?.phase === 'loading') {
      pose = Math.floor(this.heroClock * 4) % 2 === 0 ? POSES.thinking : POSES.standing;
      facingLeft = true;
    } else if (run !== null) {
      pose = Math.floor(this.heroClock * 2.5) % 3 === 0 ? POSES.thinking : POSES.standing;
    } else pose = POSES.standing;

    hero.style.setProperty('--hero-x', String(this.heroX));
    hero.classList.toggle('is-facing-left', facingLeft);
    hero.classList.toggle('is-walking', next !== undefined);
    sprite.style.backgroundImage = `url(${pose.atlas === 'walk' ? walkAtlas : reactionsAtlas})`;
    sprite.style.backgroundPosition = `${(pose.cell % 3) * 50}% ${Math.floor(pose.cell / 3) * 100}%`;
    this.one('[data-carried]').className = `oom-carried${this.carrying === null ? '' : ` is-${this.carrying}`}`;
  }

  burst() {
    if (this.reducedMotion()) return;
    const stage = this.one('[data-stage]');
    for (let index = 0; index < 16; index += 1) {
      const paper = Object.assign(document.createElement('i'), { className: 'oom-paper' });
      const angle = (index / 16) * Math.PI * 2;
      paper.style.left = `${this.heroX}%`;
      paper.style.setProperty('--dx', `${Math.cos(angle) * (60 + (index % 3) * 40)}px`);
      paper.style.setProperty('--dy', `${Math.sin(angle) * (50 + (index % 4) * 25) - 40}px`);
      paper.style.setProperty('--turn', `${(index % 2 === 0 ? 1 : -1) * (90 + index * 25)}deg`);
      stage.append(paper);
    }
  }

  confetti() {
    if (this.reducedMotion()) return;
    const stage = this.one('[data-stage]');
    for (let index = 0; index < 24; index += 1) {
      const piece = Object.assign(document.createElement('i'), { className: 'oom-confetti' });
      piece.style.left = `${4 + ((index * 37) % 92)}%`;
      piece.style.animationDelay = `${(index % 6) * 90}ms`;
      piece.style.setProperty('--turn', `${(index % 2 === 0 ? 1 : -1) * (180 + index * 20)}deg`);
      stage.append(piece);
    }
  }

  private file(kind: 'note' | 'box') {
    this.carrying = null;
    const drawer = this.one('[data-drawer]');
    if (drawer.childElementCount >= 30) drawer.firstElementChild?.remove();
    drawer.append(Object.assign(document.createElement('i'), { className: `is-${kind}` }));
  }

  private fly(fromX: number, toX: number, kind: 'log' | 'box') {
    const stage = this.one('[data-stage]');
    const element = Object.assign(document.createElement('i'), { className: `oom-flying is-${kind}` });
    element.style.setProperty('--flying-x', String(fromX));
    stage.append(element);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        element.style.setProperty('--flying-x', String(toX));
        element.classList.add('is-arriving');
      }),
    );
    window.setTimeout(() => {
      element.remove();
      if (kind === 'box') this.file('box');
    }, 460);
  }
}
