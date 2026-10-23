const collapsedKey = 'pills.index.collapsed';

const readerIn = () => document.querySelector<HTMLElement>('[data-pill-reader]');

const render = (reader: HTMLElement, collapsed: boolean) => {
  reader.toggleAttribute('data-index-collapsed', collapsed);
  reader
    .querySelector('[data-pill-index-toggle]')
    ?.setAttribute('aria-expanded', String(!collapsed));
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('[data-pill-index-toggle]')) return;
  const reader = readerIn();
  if (!reader) return;
  const collapsed = !reader.hasAttribute('data-index-collapsed');
  render(reader, collapsed);
  try {
    localStorage.setItem(collapsedKey, String(collapsed));
  } catch {
    // Storage may be unavailable; the choice still lasts through client navigation.
  }
});

document.addEventListener('astro:page-load', () => {
  const reader = readerIn();
  if (reader) render(reader, reader.hasAttribute('data-index-collapsed'));
});

export {};
