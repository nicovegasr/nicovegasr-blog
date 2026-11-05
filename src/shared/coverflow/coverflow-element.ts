import { easeOutQuint, positionOf, shortestDelta, wrap } from './coverflow';

const MANUAL_GLIDE_MILLISECONDS = 650;
const EXTRA_GLIDE_PER_SKIPPED_ITEM_MILLISECONDS = 140;
const DRAG_THRESHOLD_PIXELS = 6;
const DRAG_LEARNED_STORAGE_KEY = 'coverflow-drag-learned';
// How far a release keeps travelling: px/ms of flick velocity × this many ms.
const FLICK_PROJECTION_MILLISECONDS = 160;
const DEFAULT_MILLISECONDS_PER_ITEM = 8000;
// Hovering or resuming eases the drift's speed instead of stopping or starting it dead.
const SPEED_EASING_MILLISECONDS = 350;

type Glide = { from: number; delta: number; start: number; length: number };
type Drag = { pointerId: number; startX: number; startOffset: number; lastX: number; lastTime: number; velocity: number; moved: boolean };

class CoverflowCarousel extends HTMLElement {
  private playback: { offset: number; playing: boolean } | undefined;
  private dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.dispose) return;
    const slides = [...this.querySelectorAll<HTMLAnchorElement>('[data-slide]')];
    // Small sets stay as normal links: no duplicated content or broken circular motion.
    if (slides.length < 3) return;
    const count = slides.length;
    const dots = [...this.querySelectorAll<HTMLButtonElement>('[data-dot]')];
    const play = this.querySelector<HTMLButtonElement>('[data-play]')!;
    const icon = this.querySelector('[data-play-icon]')!;
    const counter = this.querySelector('[data-counter]')!;
    const status = this.querySelector('[data-status]')!;
    const stage = this.querySelector<HTMLElement>('.coverflow-stage')!;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const requestedDuration = Number(this.dataset.duration);
    const duration = Number.isFinite(requestedDuration) && requestedDuration >= 1000 ? requestedDuration : DEFAULT_MILLISECONDS_PER_ITEM;

    let offset = wrap(this.playback?.offset ?? (Math.round(Number(this.dataset.initialIndex)) || 0), count);
    let target = wrap(Math.round(offset), count);
    let playing = (this.playback?.playing ?? this.dataset.autoplay !== 'false') && !reducedMotion.matches;
    let glide: Glide | undefined;
    let drag: Drag | undefined;
    let speed = 0;
    let hovering = false;
    let visible = false;
    let suppressNextClick = false;
    let renderedTarget = -1;
    let frame = 0;
    let previousTime: number | undefined;
    const events = new AbortController();
    const { signal } = events;

    const renderSelection = () => {
      if (target === renderedTarget) return;
      renderedTarget = target;
      counter.textContent = String(target + 1).padStart(2, '0');
      slides.forEach((slide, index) => {
        const position = shortestDelta(target, index, count);
        slide.dataset.position = String(position);
        // A focused link must remain focusable and operable while the user keeps it.
        const focused = slide === document.activeElement;
        slide.tabIndex = position === 0 || focused ? 0 : -1;
        slide.inert = Math.abs(position) > 1 && !focused;
        dots[index]!.setAttribute('aria-pressed', String(position === 0));
      });
    };
    const paint = () => {
      renderSelection();
      slides.forEach((slide, index) => {
        const pose = positionOf(index, offset, count);
        slide.style.transform = pose.transform;
        slide.style.opacity = String(pose.opacity);
        slide.style.zIndex = String(pose.zIndex);
        slide.style.setProperty('--coverflow-shade', pose.shade.toFixed(3));
      });
    };

    const needsFrames = () => visible && !document.hidden && !drag && (!!glide || (playing && (!hovering || speed > 0.001)));
    const schedule = () => {
      cancelAnimationFrame(frame);
      if (signal.aborted) return;
      if (needsFrames()) frame = requestAnimationFrame(tick);
      else previousTime = undefined;
    };
    const glideTo = (index: number) => {
      const delta = shortestDelta(offset, index, count);
      target = wrap(index, count);
      if (reducedMotion.matches || Math.abs(delta) < 0.0001) {
        glide = undefined;
        offset = target;
      } else {
        const skipped = Math.max(0, Math.ceil(Math.abs(delta)) - 1);
        glide = {
          from: offset,
          delta,
          start: performance.now(),
          length: MANUAL_GLIDE_MILLISECONDS + skipped * EXTRA_GLIDE_PER_SKIPPED_ITEM_MILLISECONDS,
        };
      }
      paint();
      schedule();
    };
    function tick(time: number) {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50);
      previousTime = time;
      if (glide) {
        const progress = Math.min(1, Math.max(0, (time - glide.start) / glide.length));
        offset = wrap(glide.from + glide.delta * easeOutQuint(progress), count);
        if (progress >= 1) { offset = target; glide = undefined; }
      } else if (playing) {
        // Ramping the speed linearly gives the position a smooth quadratic ease in and out.
        const step = elapsed / SPEED_EASING_MILLISECONDS;
        speed = hovering ? Math.max(0, speed - step) : Math.min(1, speed + step);
        offset = wrap(offset + (speed * elapsed) / duration, count);
        target = wrap(Math.round(offset), count);
      }
      paint();
      schedule();
    }

    const renderControls = () => {
      const action = (playing ? this.dataset.pauseLabel : this.dataset.playLabel)!;
      play.setAttribute('aria-label', action);
      play.title = action;
      icon.setAttribute('d', playing ? 'M9 6v12M15 6v12' : 'm9 5 10 7-10 7Z');
    };
    const setPlaying = (value: boolean) => {
      playing = value;
      speed = 0;
      renderControls();
      schedule();
    };
    // Any deliberate choice by the visitor stops the tour on what they picked.
    const choose = (index: number) => {
      if (playing) setPlaying(false);
      glideTo(index);
      status.textContent = slides[target]!.getAttribute('aria-label');
    };

    play.addEventListener('click', () => setPlaying(!playing), { signal });
    dots.forEach((dot, index) => dot.addEventListener('click', () => choose(index), { signal }));
    slides.forEach((slide, index) => slide.addEventListener('click', (event) => {
      if (suppressNextClick) { suppressNextClick = false; event.preventDefault(); return; }
      // Modified clicks and keyboard activation keep their native link behavior.
      if (event.detail === 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (index !== target) { event.preventDefault(); choose(index); }
    }, { signal }));
    this.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const fromSlide = event.target instanceof Element && !!event.target.closest('[data-slide]');
      choose(target + (event.key === 'ArrowLeft' ? -1 : 1));
      if (fromSlide) slides[target]!.focus({ preventScroll: true });
    }, { signal });
    this.addEventListener('focusin', (event) => {
      if (playing && event.target instanceof Element && event.target.matches('[data-slide]:focus-visible')) setPlaying(false);
    }, { signal });
    this.addEventListener('focusout', () => {
      queueMicrotask(() => { if (!signal.aborted) { renderedTarget = -1; renderSelection(); } });
    }, { signal });

    // Hovering holds the countdown so a card can be read; it never cuts a glide short.
    stage.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') { hovering = true; schedule(); }
    }, { signal });
    stage.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') { hovering = false; schedule(); }
    }, { signal });

    const stepWidth = () => Math.max(1, slides[0]!.offsetWidth * 0.82);
    stage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || drag) return;
      drag = { pointerId: event.pointerId, startX: event.clientX, startOffset: offset, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, moved: false };
    }, { signal });
    stage.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const distance = event.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(distance) < DRAG_THRESHOLD_PIXELS) return;
        drag.moved = true;
        // Grab the cards where they are, even mid-glide.
        glide = undefined;
        drag.startOffset = offset;
        drag.startX = event.clientX;
        stage.setPointerCapture(event.pointerId);
        this.classList.add('is-dragging', 'has-dragged');
        try { localStorage.setItem(DRAG_LEARNED_STORAGE_KEY, '1'); } catch { /* storage may be unavailable */ }
        if (playing) setPlaying(false);
        schedule();
        return;
      }
      const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
      drag.velocity = drag.velocity * 0.6 + ((event.clientX - drag.lastX) / elapsed) * 0.4;
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      offset = wrap(drag.startOffset - distance / stepWidth(), count);
      target = wrap(Math.round(offset), count);
      paint();
    }, { signal });
    const release = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const { moved, velocity, lastTime } = drag;
      drag = undefined;
      if (!moved) { schedule(); return; }
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 0);
      this.classList.remove('is-dragging');
      // A pause before letting go cancels the flick.
      const flick = event.timeStamp - lastTime > 80 ? 0 : velocity;
      const projected = offset - (flick * FLICK_PROJECTION_MILLISECONDS) / stepWidth();
      const landing = Math.round(offset + Math.max(-1.5, Math.min(1.5, shortestDelta(offset, projected, count))));
      glideTo(landing);
      status.textContent = slides[target]!.getAttribute('aria-label');
    };
    stage.addEventListener('pointerup', release, { signal });
    stage.addEventListener('pointercancel', release, { signal });
    stage.addEventListener('dragstart', (event) => event.preventDefault(), { signal });

    document.addEventListener('visibilitychange', schedule, { signal });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) setPlaying(false); }, { signal });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      schedule();
    });
    observer.observe(stage);

    this.dispose = () => {
      this.playback = { offset, playing };
      cancelAnimationFrame(frame);
      observer.disconnect();
      events.abort();
      this.classList.remove('is-interactive', 'is-dragging', 'has-dragged');
      this.querySelectorAll<HTMLElement>('[data-controls], .coverflow-dots, [data-hint]').forEach((element) => { element.hidden = true; });
      slides.forEach((slide) => { slide.inert = false; slide.removeAttribute('tabindex'); slide.removeAttribute('style'); });
    };
    this.querySelectorAll<HTMLElement>('[hidden]').forEach((element) => { element.hidden = false; });
    // Once a visitor has dragged, the hint has done its job on every later visit too.
    try { if (localStorage.getItem(DRAG_LEARNED_STORAGE_KEY)) this.classList.add('has-dragged'); } catch { /* storage may be unavailable */ }
    this.classList.add('is-interactive');
    paint();
    renderControls();
    schedule();
  }

  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
  }
}

if (!customElements.get('coverflow-carousel')) customElements.define('coverflow-carousel', CoverflowCarousel);
