// Decorative catalogue preview: payments travel API → queue → workers → bank; failed charges retry.
// Narrow screens fit one station; the CSS mirrors these positions.
const STATIONS = [54, 66, 78];
const COMPACT_STATIONS = [56];
const COMPACT_QUERY = '(max-width: 640px)';
const WALK_CELLS = { standing: 3, thinking: 4 } as const;
const REACTION_CELLS = { surprised: 2, done: 5 } as const;
const QUEUE_CAPACITY = 5;
const FAILURE_PROBABILITY = 0.25;

type Station = { left: number; worker: HTMLElement; bubble: HTMLElement; busy: boolean };

class AssemblyLinePreview extends HTMLElement {
  private dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.dispose) return;
    const walk = this.dataset.walk!;
    const reactions = this.dataset.reactions!;
    const paid = this.querySelector('[data-count="paid"]')!;
    const retries = this.querySelector('[data-count="retries"]')!;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const timers: number[] = [];
    const queue: HTMLElement[] = [];
    let visible = false;
    let ticketNumber = 1;
    let paidCount = 0;
    let retryCount = 0;

    const pose = (element: HTMLElement, atlas: 'walk' | 'reactions', cell: number) => {
      element.style.backgroundImage = `url(${atlas === 'walk' ? walk : reactions})`;
      element.style.backgroundPosition = `${(cell % 3) * 50}% ${Math.floor(cell / 3) * 100}%`;
    };
    const later = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, milliseconds));
      });
    const running = () => visible && !document.hidden && !reducedMotion.matches && this.isConnected;

    const compact = matchMedia(COMPACT_QUERY).matches;
    const bankLeft = compact ? 'calc(97% - 3rem)' : '91%';
    const stations: Station[] = (compact ? COMPACT_STATIONS : STATIONS).map((left) => {
      const worker = Object.assign(document.createElement('div'), { className: 'assembly-worker' });
      worker.style.left = `calc(${left}% - 0.3rem)`;
      pose(worker, 'walk', WALK_CELLS.standing);
      const bubble = Object.assign(document.createElement('div'), {
        className: 'assembly-bubble',
        textContent: this.dataset.fails,
      });
      bubble.style.left = `calc(${left}% + 0.6rem)`;
      this.append(worker, bubble);
      return { left, worker, bubble, busy: false };
    });

    const placeQueue = () =>
      queue.forEach((ticket, index) => {
        ticket.style.left = `calc(${compact ? 28 : 33}% + 0.4rem + ${index * 4}px)`;
        ticket.style.bottom = `calc(20px + 2rem + ${index * 16}px)`;
      });
    const newTicket = () => {
      const ticket = Object.assign(document.createElement('div'), {
        className: 'assembly-ticket',
        textContent: `ID ${String(ticketNumber++ % 100).padStart(2, '0')}`,
      });
      this.append(ticket);
      return ticket;
    };

    const arrive = () => {
      if (!running() || queue.length >= QUEUE_CAPACITY) return;
      const ticket = newTicket();
      Object.assign(ticket.style, { left: '4%', bottom: 'calc(20px + 4.2rem)' });
      requestAnimationFrame(() => Object.assign(ticket.style, { left: '24%', bottom: 'calc(20px + 0.8rem)' }));
      void later(900).then(() => {
        queue.push(ticket);
        placeQueue();
      });
    };

    const work = async () => {
      const station = stations.find((candidate) => !candidate.busy);
      if (!running() || !station || queue.length === 0) return;
      station.busy = true;
      const ticket = queue.shift()!;
      placeQueue();
      Object.assign(ticket.style, { left: `calc(${station.left}% + 0.6rem)`, bottom: 'calc(20px + 2rem)' });
      pose(station.worker, 'walk', WALK_CELLS.thinking);
      await later(1500);
      if (Math.random() < FAILURE_PROBABILITY) {
        pose(station.worker, 'reactions', REACTION_CELLS.surprised);
        station.bubble.classList.add('is-visible');
        ticket.classList.add('is-failed');
        retries.textContent = String(++retryCount);
        await later(800);
        station.bubble.classList.remove('is-visible');
        ticket.classList.remove('is-failed');
        queue.push(ticket);
        placeQueue();
      } else {
        pose(station.worker, 'reactions', REACTION_CELLS.done);
        Object.assign(ticket.style, { left: bankLeft, bottom: 'calc(20px + 4.2rem)' });
        await later(900);
        ticket.classList.add('is-done');
        paid.textContent = String(++paidCount);
        void later(300).then(() => ticket.remove());
      }
      pose(station.worker, 'walk', WALK_CELLS.standing);
      station.busy = false;
    };

    const syncRunning = () => this.classList.toggle('is-running', running());
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      syncRunning();
    });
    observer.observe(this);
    document.addEventListener('visibilitychange', syncRunning);
    timers.push(
      window.setInterval(arrive, 1100),
      window.setInterval(() => void work(), 500),
    );

    // Without motion the line still reads: a few tickets wait in the queue.
    if (reducedMotion.matches) {
      for (let index = 0; index < 3; index++) queue.push(newTicket());
      placeQueue();
    }

    this.dispose = () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
      });
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncRunning);
      this.querySelectorAll('.assembly-worker, .assembly-bubble, .assembly-ticket').forEach((element) =>
        element.remove(),
      );
    };
  }

  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
  }
}

if (!customElements.get('assembly-line-preview')) customElements.define('assembly-line-preview', AssemblyLinePreview);
