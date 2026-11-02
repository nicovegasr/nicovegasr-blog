let tracking: AbortController | undefined;

export const trackCacheMetrics = () => {
  tracking?.abort();
  tracking = new AbortController();
  const { signal } = tracking;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll<HTMLElement>('[data-cache-metric]').forEach((metric) => {
    const station = metric.closest('[data-route-station]');
    let visible = false;
    let played = false;
    let timers: number[] = [];
    const stop = () => { timers.forEach(window.clearTimeout); timers = []; };
    const update = () => {
      const active = !station || station.classList.contains('is-current');
      if (!active) played = false;
      stop();
      if (preference.matches) { metric.dataset.phase = 'ready'; return; }
      if (!active || !visible || document.hidden || played) return;
      played = true;
      metric.dataset.phase = 'lookup';
      // Timing illustrates reuse; it does not replay the approximate performance figures.
      const phases = [[600, 'build'], [1400, 'store'], [2200, 'lookup'], [2800, 'reuse'], [3900, 'ready']] as const;
      timers = phases.map(([delay, phase]) => window.setTimeout(() => { metric.dataset.phase = phase; }, delay));
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); }, { threshold: 0.5 });
    observer.observe(metric);
    const mutations = new MutationObserver(update);
    if (station) mutations.observe(station, { attributes: true, attributeFilter: ['class'] });
    preference.addEventListener('change', update, { signal });
    document.addEventListener('visibilitychange', update, { signal });
    signal.addEventListener('abort', () => { stop(); observer.disconnect(); mutations.disconnect(); });
  });
};
