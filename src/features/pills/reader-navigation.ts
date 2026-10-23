import {
  swapFunctions,
  type TransitionBeforeSwapEvent,
} from 'astro:transitions/client';

// Only transient DOM state is carried between static pages. Astro owns URL,
// history, metadata, loading failures, and the navigation lifecycle.
let pendingIndex:
  | { key: string; scrollTop: number; focusArticle: boolean }
  | undefined;
let panelAnimation: Animation | undefined;

const readerIn = (root: Document) =>
  root.querySelector<HTMLElement>('[data-pill-reader]');

const revealSelection = (index: HTMLElement) => {
  if (index.scrollHeight <= index.clientHeight) return;
  const selected = index.querySelector<HTMLElement>('.journey a[aria-current]');
  if (!selected) return;
  const bounds = index.getBoundingClientRect();
  const item = selected.getBoundingClientRect();
  const padding = 8;
  if (item.top < bounds.top + padding) {
    index.scrollTop -= bounds.top + padding - item.top;
  } else if (item.bottom > bounds.bottom - padding) {
    index.scrollTop += item.bottom - bounds.bottom + padding;
  }
};

const prepareNavigation = (event: TransitionBeforeSwapEvent) => {
  pendingIndex = undefined;
  const current = readerIn(document);
  const incoming = readerIn(event.newDocument);
  if (
    !current ||
    !incoming ||
    current.dataset.pillReader !== incoming.dataset.pillReader
  )
    return;
  const index = current.querySelector<HTMLElement>('.contents');
  const nextIndex = incoming.querySelector<HTMLElement>('.contents');
  if (!index || !nextIndex) return;

  pendingIndex = {
    key: current.dataset.pillReader!,
    scrollTop: index.scrollTop,
    focusArticle: event.navigationType !== 'traverse',
  };

  const currentPanel = current.querySelector<HTMLElement>('.reading-desk');
  const incomingPanel = incoming.querySelector<HTMLElement>('.reading-desk');
  if (!currentPanel || !incomingPanel) {
    pendingIndex = undefined;
    return;
  }
  panelAnimation?.cancel();
  // Skipping the native snapshot rejects ready with AbortError. Consume that
  // expected rejection; the reading panel has its own animation below.
  void event.viewTransition.ready.catch((error: unknown) => {
    if (!(error instanceof DOMException && error.name === 'AbortError'))
      console.error('Reader view transition failed', error);
  });
  event.viewTransition.skipTransition();
  event.swap = () => {
    swapReadingPanel(event.newDocument, currentPanel, incomingPanel);
    updateSelection(index, nextIndex);
  };
};

const swapReadingPanel = (
  incoming: Document,
  currentPanel: HTMLElement,
  incomingPanel: HTMLElement,
) => {
  // Keep the shell and index. Astro owns loading, history and script scheduling.
  swapFunctions.deselectScripts(incoming);
  swapFunctions.swapHeadElements(incoming);
  currentPanel.replaceWith(incomingPanel);
  const currentLanguage = document.querySelector('.language-switcher');
  const incomingLanguage = incoming.querySelector('.language-switcher');
  if (currentLanguage && incomingLanguage)
    currentLanguage.replaceWith(incomingLanguage);
};

const updateSelection = (index: HTMLElement, incoming: HTMLElement) => {
  const activeHref = incoming.querySelector('a[aria-current]')?.getAttribute('href');
  index.querySelectorAll('a').forEach((link) => {
    if (link.getAttribute('href') === activeHref)
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};

const alignReadingTarget = (reader: HTMLElement, targetSelector: string) => {
  const target = reader.querySelector<HTMLElement>(targetSelector);
  if (!target) return;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  window.scrollTo({
    top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - margin),
    left: 0,
    behavior: 'instant',
  });
};

const animateReadingPanel = (reader: HTMLElement) => {
  const panel = reader.querySelector<HTMLElement>('.reading-desk');
  if (!panel?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-duration-reading')
    .trim();
  const milliseconds = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
  panelAnimation = panel.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    {
      duration: Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : 400,
      easing: 'ease-in-out',
    },
  );
};

const restoreReader = () => {
  const reader = readerIn(document);
  const pending = pendingIndex;
  if (!reader || !pending || reader.dataset.pillReader !== pending.key) return;
  const index = reader.querySelector<HTMLElement>('.contents');
  if (index) index.scrollTop = pending.scrollTop;
  if (pending.focusArticle) alignReadingTarget(reader, '#pill-reading');
  animateReadingPanel(reader);
};

const finishNavigation = () => {
  const reader = readerIn(document);
  if (!reader) return;
  const index = reader.querySelector<HTMLElement>('.contents');
  if (index) revealSelection(index);
  if (pendingIndex?.focusArticle)
    reader.querySelector<HTMLElement>('#chapter-title')?.focus({ preventScroll: true });
  pendingIndex = undefined;
};

document.addEventListener('astro:before-swap', prepareNavigation);
document.addEventListener('astro:after-swap', restoreReader);
document.addEventListener('astro:page-load', finishNavigation);
finishNavigation();
