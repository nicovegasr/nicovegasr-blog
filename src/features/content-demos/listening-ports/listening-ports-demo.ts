import type { Locale } from '@/i18n/locale';
import { labelsFor } from './labels';
import { renderDemo, renderScene } from './view';
import styles from './listening-ports-demo.css?inline';

export const mount = (host: HTMLElement, locale: Locale): (() => void) => {
  const fallback = [...host.childNodes];
  const labels = labelsFor(locale);
  const identifier = `ports-${crypto.randomUUID()}`;
  host.innerHTML = renderDemo(locale, identifier);
  const stylesheet = document.createElement('style');
  stylesheet.textContent = styles;
  host.prepend(stylesheet);
  const graphic = host.querySelector<SVGSVGElement>('svg')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let visible = false;
  let dialog: HTMLDialogElement | undefined;
  let enlarged: SVGSVGElement | undefined;
  graphic.pauseAnimations();

  const syncMotion = () => {
    const stopped = document.hidden || reducedMotion.matches;
    if (stopped || !visible || dialog?.open) graphic.pauseAnimations();
    else graphic.unpauseAnimations();
    if (enlarged) {
      if (stopped || !dialog?.open) enlarged.pauseAnimations();
      else enlarged.unpauseAnimations();
    }
    if (reducedMotion.matches) {
      graphic.setCurrentTime(0);
      enlarged?.setCurrentTime(0);
    }
  };

  const openIllustration = () => {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'ports-zoom';
      dialog.setAttribute('aria-label', labels.enlarge);
      dialog.innerHTML = `<button class="ports-zoom-close" type="button">${labels.close}</button><div class="ports-zoom-content">${renderScene(locale, `${identifier}-zoom`)}</div>`;
      document.body.append(dialog);
      enlarged = dialog.querySelector<SVGSVGElement>('svg')!;
      dialog.querySelector('button')!.addEventListener('click', () => dialog?.close(), { signal: events.signal });
      dialog.addEventListener(
        'close',
        () => {
          if (enlarged) graphic.setCurrentTime(enlarged.getCurrentTime());
          syncMotion();
        },
        { signal: events.signal },
      );
    }
    enlarged!.pauseAnimations();
    enlarged!.setCurrentTime(graphic.getCurrentTime());
    dialog.showModal();
    syncMotion();
  };

  host.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-enlarge]')) openIllustration();
    },
    { signal: events.signal },
  );

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      syncMotion();
    },
    { threshold: 0.08 },
  );
  observer.observe(host);
  document.addEventListener('visibilitychange', syncMotion, { signal: events.signal });
  reducedMotion.addEventListener('change', syncMotion, { signal: events.signal });
  syncMotion();

  return () => {
    events.abort();
    observer.disconnect();
    graphic.pauseAnimations();
    enlarged?.pauseAnimations();
    dialog?.close();
    dialog?.remove();
    host.replaceChildren(...fallback);
  };
};
