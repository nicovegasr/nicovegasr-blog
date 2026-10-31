import { collapsedIndexStorageKey } from './reader-index-storage';

const readerIn = () => document.querySelector<HTMLElement>('[data-pill-reader]');

const render = (reader: HTMLElement, collapsed: boolean) => {
  reader.toggleAttribute('data-index-collapsed', collapsed);
  reader
    .querySelector('[data-pill-index-toggle]')
    ?.setAttribute('aria-expanded', String(!collapsed));
};

const renderDisclosure = (reader: HTMLElement, open: boolean) => {
  reader.setAttribute('data-index-disclosure', open ? 'open' : 'closed');
  reader
    .querySelector('[data-pill-index-disclosure]')
    ?.setAttribute('aria-expanded', String(open));
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('[data-pill-index-disclosure]')) {
    const reader = readerIn();
    if (reader)
      renderDisclosure(reader, reader.getAttribute('data-index-disclosure') !== 'open');
    return;
  }
  if (!event.target.closest('[data-pill-index-toggle]')) return;
  const reader = readerIn();
  if (!reader) return;
  const collapsed = !reader.hasAttribute('data-index-collapsed');
  render(reader, collapsed);
  try {
    localStorage.setItem(collapsedIndexStorageKey, String(collapsed));
  } catch {
    // Storage may be unavailable; the choice still lasts through client navigation.
  }
});

document.addEventListener('astro:page-load', () => {
  const reader = readerIn();
  if (!reader) return;
  render(reader, reader.hasAttribute('data-index-collapsed'));
  // Same-series visits keep the index DOM, so choosing a pill must close it here.
  renderDisclosure(reader, false);
});
