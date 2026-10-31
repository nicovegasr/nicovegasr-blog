import atlas from '@/shared/mascot/worker-reactions.webp?url';
import walkingAtlas from '@/shared/mascot/worker-walk-atlas.webp?url';
import type { SimulationState } from './engine';

export type RetryStage = 'failure' | 'restart' | undefined;
export type ActorState =
  | 'idle' | 'working' | 'saving' | 'skipping' | 'dead'
  | 'uncertain' | 'duplicate' | 'returning' | 'done';
export type WorkerFrame = { state: ActorState; step: number; job: number | null };

/** Presentation only: the actor cannot acknowledge work or advance the engine. */
export function workerFrame(s: SimulationState, retry: RetryStage): WorkerFrame {
  const job = s.jobs[Math.max(0, s.active)]!;
  const step = Math.min(s.step, s.config.steps.length - 1);
  const frame = { step, job: s.active < 0 ? null : job.id };
  if (retry === 'restart') return { ...frame, state: 'returning', step: 0 };
  if (s.phase === 'ready') return { state: 'idle', step: 0, job: null };
  if (s.phase === 'won') return { ...frame, state: 'done' };
  if (s.phase === 'duplicate') return { ...frame, state: 'duplicate' };
  if (s.phase === 'lost' || (s.phase === 'incident' &&
    ['activation-failed', 'worker-retry'].includes(s.incident)))
    return { ...frame, state: 'dead' };
  if (s.phase === 'incident') return { ...frame, state: 'uncertain' };
  const last = s.events.at(-1);
  if (last?.kind === 'skipped' && last.job === job.id)
    return { ...frame, state: 'skipping', step: last.step };
  if (s.cursor === 'save') return { ...frame, state: 'saving' };
  if (job.status === 'done') return { ...frame, state: 'done' };
  return { ...frame, state: 'working' };
}

const poses: Record<ActorState, number> = {
  idle: 3, working: 3, saving: 3, skipping: 3, dead: 5,
  uncertain: 4, duplicate: 2, returning: 3, done: 5,
};

export function actorMarkup() {
  return `<div class="qs-actor" data-worker-actor data-state="idle" aria-hidden="true">
    <span class="qs-actor-shadow"></span>
    <span class="qs-actor-body">
      <span class="qs-actor-sprite" style="background-image:url('${walkingAtlas}')"></span>
    </span>
    <span class="qs-actor-token" data-actor-token></span>
    <span class="qs-actor-reaction" data-actor-reaction></span>
  </div>`;
}

/** CSS owns position interpolation; WAAPI only supplies a short walking gesture. */
export class WorkerActor {
  private step: number | undefined;
  private state: ActorState | undefined;
  private walk: Animation | undefined;
  private gait: Animation | undefined;
  private generation = 0;

  constructor(private node: HTMLElement, private steps: number) {}

  render(frame: WorkerFrame, speed: number, playing: boolean, reduced: boolean) {
    const sprite = this.node.querySelector<HTMLElement>('.qs-actor-sprite')!;
    const body = this.node.querySelector<HTMLElement>('.qs-actor-body')!;
    const moving = this.step !== undefined && this.step !== frame.step;
    const changed = moving || this.state !== frame.state;
    this.node.dataset.state = frame.state;
    this.node.dataset.paused = String(!playing);
    this.node.style.left = `${((frame.step + 0.5) / this.steps) * 100}%`;
    const duration = frame.state === 'returning' ? 850 : Math.max(90, 430 / speed);
    this.node.style.setProperty('--qs-actor-travel', `${reduced ? 0 : duration}ms`);
    const pose = poses[frame.state];
    const setPose = (index: number) => {
      sprite.style.backgroundImage = `url('${['done', 'duplicate'].includes(frame.state) ? atlas : walkingAtlas}')`;
      sprite.style.backgroundPosition = `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`;
    };
    if (changed) {
      this.walk?.cancel();
      this.gait?.cancel();
      this.node.dataset.moving = 'false';
      const generation = ++this.generation;
      setPose(pose);
      if (moving && playing && !reduced && !['dead', 'uncertain', 'duplicate'].includes(frame.state)) {
        sprite.style.backgroundImage = `url('${walkingAtlas}')`;
        this.node.dataset.moving = 'true';
        this.node.dataset.direction = frame.step < this.step! ? 'left' : 'right';
        this.walk = body.animate([
          { transform: 'translateY(0) rotate(-1deg)' },
          { transform: 'translateY(-1px) rotate(1deg)' },
          { transform: 'translateY(0) rotate(-1deg)' },
        ], { duration: duration / 2, iterations: 2, easing: 'ease-in-out' });
        this.gait = sprite.animate([
          { backgroundPosition: '0% 0%', offset: 0 },
          { backgroundPosition: '50% 0%', offset: 0.25 },
          { backgroundPosition: '100% 0%', offset: 0.5 },
          { backgroundPosition: '50% 0%', offset: 0.75 },
          { backgroundPosition: '0% 0%', offset: 1 },
        ], { duration: duration / 2, iterations: 2, easing: 'steps(1, end)' });
        this.walk.onfinish = () => {
          if (generation !== this.generation) return;
          setPose(pose);
          this.node.dataset.moving = 'false';
        };
      }
    }
    if (!playing) {
      this.walk?.cancel();
      this.gait?.cancel();
      this.node.dataset.moving = 'false';
      setPose(pose);
      for (const animation of this.node.getAnimations()) animation.finish();
    }
    const token = this.node.querySelector<HTMLElement>('[data-actor-token]')!;
    token.textContent = frame.job === null ? '' : `ID ${String(frame.job).padStart(2, '0')}`;
    token.hidden = frame.job === null;
    this.node.querySelector<HTMLElement>('[data-actor-reaction]')!.textContent = {
      idle: '', working: '', saving: '✓', skipping: '↷', dead: '',
      uncertain: '?', duplicate: '×2', returning: '↻', done: '✓',
    }[frame.state];
    this.step = frame.step;
    this.state = frame.state;
  }

  stop() {
    this.generation++;
    this.walk?.cancel();
    this.gait?.cancel();
  }
}
