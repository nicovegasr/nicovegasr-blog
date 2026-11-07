let tracking: AbortController | undefined;

export const trackBatchMetrics = () => {
  tracking?.abort();
  tracking = new AbortController();
  const { signal } = tracking;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll<HTMLElement>('[data-batch-metric]').forEach((metric) => {
    const station = metric.closest('[data-route-station]');
    const batches = [...metric.querySelectorAll<SVGElement>('[data-batch]')];
    let visible = false;
    let frame = 0;
    let started = 0;
    let played = false;
    let current = 2;

    const paint = (index: number) => {
      if (index === current) return;
      current = index;
      metric.style.setProperty('--batch-position', `${((index + 0.5) / batches.length) * 100}%`);
      batches.forEach((batch, position) => batch.classList.toggle('is-active', position === index));
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const advance = (now: number) => {
      const elapsed = now - started;
      paint(Math.min(batches.length - 1, Math.floor(elapsed / 750)));
      // A single short pass demonstrates the process without an endless attention loop.
      if (elapsed < 4_500) frame = requestAnimationFrame(advance);
      else frame = 0;
    };
    const update = () => {
      const active = !station || station.classList.contains('is-current');
      if (!active) played = false;
      stop();
      if (preference.matches) {
        paint(2);
        return;
      }
      if (!visible || !active || document.hidden || played) return;
      played = true;
      paint(0);
      started = performance.now();
      frame = requestAnimationFrame(advance);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        update();
      },
      { threshold: 0.5 },
    );
    observer.observe(metric);
    const mutations = new MutationObserver(update);
    if (station) mutations.observe(station, { attributes: true, attributeFilter: ['class'] });
    preference.addEventListener('change', update, { signal });
    document.addEventListener('visibilitychange', update, { signal });
    signal.addEventListener('abort', () => {
      stop();
      observer.disconnect();
      mutations.disconnect();
    });
  });
};
