import atlas from '@/shared/mascot/worker-reactions.webp?url';
import walkingAtlas from '@/shared/mascot/worker-walk-atlas.webp?url';
import type { SimulationState } from './engine';

export type RetryStage = 'failure' | 'restart' | undefined;
export type ActorState =
  | 'idle' | 'working' | 'saving' | 'skipping' | 'dead'
  | 'uncertain' | 'duplicate' | 'returning' | 'done';
export type WorkerFrame = { state: ActorState; step: number; job: number | null };

/** Presentation only: the actor cannot acknowledge work or advance the engine. */
export function workerFrame(state: SimulationState, retry: RetryStage): WorkerFrame {
  const job = state.jobs[Math.max(0, state.active)]!;
  const step = Math.min(state.step, state.config.steps.length - 1);
  const frame = { step, job: state.active < 0 ? null : job.id };
  if (retry === 'restart') return { ...frame, state: 'returning', step: 0 };
  if (state.phase === 'ready') return { state: 'idle', step: 0, job: null };
  if (state.phase === 'won') return { ...frame, state: 'done' };
  if (state.phase === 'duplicate') return { ...frame, state: 'duplicate' };
  if (state.phase === 'lost' || (state.phase === 'incident' &&
    ['activation-failed', 'worker-retry'].includes(state.incident)))
    return { ...frame, state: 'dead' };
  if (state.phase === 'incident') return { ...frame, state: 'uncertain' };
  const last = state.events.at(-1);
  if (last?.kind === 'skipped' && last.job === job.id)
    return { ...frame, state: 'skipping', step: last.step };
  if (state.cursor === 'save') return { ...frame, state: 'saving' };
  if (job.status === 'done') return { ...frame, state: 'done' };
  return { ...frame, state: 'working' };
}

const poses: Record<ActorState, number> = {
  idle: 3, working: 3, saving: 3, skipping: 3, dead: 5,
  uncertain: 4, duplicate: 2, returning: 3, done: 5,
};

export function actorMarkup() {
  return `<div class="lab-actor" data-worker-actor data-state="idle" aria-hidden="true">
    <span class="lab-actor-shadow"></span>
    <span class="lab-actor-body">
      <span class="lab-actor-sprite" style="background-image:url('${walkingAtlas}')"></span>
    </span>
    <span class="lab-actor-token" data-actor-token></span>
    <span class="lab-actor-reaction" data-actor-reaction></span>
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
    const sprite = this.node.querySelector<HTMLElement>('.lab-actor-sprite')!;
    const body = this.node.querySelector<HTMLElement>('.lab-actor-body')!;
    const moving = this.step !== undefined && this.step !== frame.step;
    const changed = moving || this.state !== frame.state;
    this.node.dataset.state = frame.state;
    this.node.dataset.paused = String(!playing);
    this.node.style.left = `${((frame.step + 0.5) / this.steps) * 100}%`;
    const duration = frame.state === 'returning' ? 850 : Math.max(90, 430 / speed);
    this.node.style.setProperty('--lab-actor-travel', `${reduced ? 0 : duration}ms`);
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
