import { localeFrom } from '@/i18n/locale';
import { terminalCopy } from './terminal-copy';
const LIMIT_MEGABYTES = 1024;
const DANGER_MEGABYTES = 800;
const TOTAL_LOGS = 20_000;

class TerminalPreview extends HTMLElement {
  private dispose: (() => void) | undefined;

  connectedCallback() {
    if (this.dispose) return;
    // Reduced motion keeps the server-rendered finished streaming run.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const text = terminalCopy(localeFrom(this.dataset.locale));
    const number = (value: number) => value.toLocaleString(text.numbers);
    const mode = this.querySelector('[data-mode]')!;
    const megabytes = this.querySelector('[data-megabytes]')!;
    const gauge = this.querySelector<HTMLElement>('[data-gauge]')!;
    const log = this.querySelector('[data-log]')!;
    const timers = new Set<number>();
    let visible = false;
    let resume: (() => void) | undefined;
    let stopped = false;

    // Each step waits its time and, while the terminal is offscreen or the tab hidden, waits for it to return.
    const tick = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          if (visible && !document.hidden) resolve();
          else resume = resolve;
        }, milliseconds);
        timers.add(timer);
      });
    const wake = () => {
      if (visible && !document.hidden && resume) {
        const next = resume;
        resume = undefined;
        next();
      }
    };
    const show = (value: number) => {
      megabytes.textContent = number(value);
      gauge.style.width = `${(value / LIMIT_MEGABYTES) * 100}%`;
      gauge.classList.toggle('is-danger', value > DANGER_MEGABYTES);
    };
    const line = (className: string, text: string) => {
      log.replaceChildren(Object.assign(document.createElement('span'), { className, textContent: text }));
    };

    const loop = async () => {
      while (!stopped) {
        mode.textContent = 'all-at-once';
        log.textContent = text.loading(number(TOTAL_LOGS));
        for (let value = 0; value <= LIMIT_MEGABYTES; value += 16) {
          show(value);
          await tick(28);
        }
        log.replaceChildren(
          Object.assign(document.createElement('span'), { className: 'is-killed', textContent: '[1]    4242 killed' }),
          '     java -jar LogAnalyzerJob.jar\nOOM Killed · exit code 137',
        );
        await tick(2600);
        mode.textContent = 'streaming';
        for (let step = 0; step <= 20; step++) {
          show(40 + Math.round(Math.sin(step) * 12 + 12));
          log.textContent = text.processed(number(step * 1000), number(TOTAL_LOGS));
          await tick(140);
        }
        show(64);
        line('is-ok', text.finished(number(TOTAL_LOGS)));
        await tick(2600);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      wake();
    });
    observer.observe(this);
    document.addEventListener('visibilitychange', wake);
    void loop();

    this.dispose = () => {
      stopped = true;
      timers.forEach((timer) => clearTimeout(timer));
      observer.disconnect();
      document.removeEventListener('visibilitychange', wake);
    };
  }

  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
  }
}

if (!customElements.get('terminal-preview')) customElements.define('terminal-preview', TerminalPreview);
