import { navigate, swapFunctions } from 'astro:transitions/client';

// Only transient DOM state is carried between static pages. Astro owns URL,
// history, metadata, loading failures, and the navigation lifecycle.
let pendingIndex:
  | { key: string; scrollTop: number; focusArticle: boolean; target: string }
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

document.addEventListener('astro:before-swap', (event) => {
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
    target: event.to.hash === '#resumen' ? '#resumen' : '#pill-reading',
  };

  const currentPanel = current.querySelector<HTMLElement>('.reading-desk');
  const incomingPanel = incoming.querySelector<HTMLElement>('.reading-desk');
  if (currentPanel && incomingPanel) {
    panelAnimation?.cancel();
    event.viewTransition.skipTransition();
    // Keep the current shell and index DOM intact. Astro still owns fetching,
    // browser history, script scheduling, and document metadata.
    event.swap = () => {
      swapFunctions.deselectScripts(event.newDocument);
      swapFunctions.swapHeadElements(event.newDocument);
      currentPanel.replaceWith(incomingPanel);
      const languageSwitcher = document.querySelector('.language-switcher');
      const incomingSwitcher =
        event.newDocument.querySelector('.language-switcher');
      if (languageSwitcher && incomingSwitcher)
        languageSwitcher.replaceWith(incomingSwitcher);
    };
  }
  const selectedHref = nextIndex
    .querySelector('a[aria-current]')
    ?.getAttribute('href');
  const summaryHref = nextIndex
    .querySelector('a[href$="#resumen"]')
    ?.getAttribute('href');
  const activeHref = event.to.hash === '#resumen' ? summaryHref : selectedHref;
  index.querySelectorAll('a').forEach((link) => {
    if (link.getAttribute('href') === activeHref)
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
});

document.addEventListener('astro:after-swap', () => {
  const reader = readerIn(document);
  const pending = pendingIndex;
  if (!reader || !pending || reader.dataset.pillReader !== pending.key) return;
  const index = reader.querySelector<HTMLElement>('.contents');
  if (index) index.scrollTop = pending.scrollTop;
  if (pending.focusArticle) {
    const target = reader.querySelector<HTMLElement>(pending.target);
    if (target) {
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + target.getBoundingClientRect().top - margin,
        ),
        left: 0,
        behavior: 'instant',
      });
    }
  }
  const panel = reader.querySelector<HTMLElement>('.reading-desk');
  if (
    panel?.animate &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
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
        duration: Number.isFinite(milliseconds) ? milliseconds : 400,
        easing: 'ease-in-out',
      },
    );
  }
});

const finishNavigation = () => {
  const reader = readerIn(document);
  if (!reader) return;
  const index = reader.querySelector<HTMLElement>('.contents');
  if (index) revealSelection(index);
  if (pendingIndex?.focusArticle) {
    const target =
      location.hash === '#resumen' ? '#summary-title' : '#chapter-title';
    reader.querySelector<HTMLElement>(target)?.focus({ preventScroll: true });
  }
  pendingIndex = undefined;
};

document.addEventListener('astro:page-load', finishNavigation);
finishNavigation();

// Up/down retain native reading scroll. Left/right navigate only while the
// reader is visible and the focused control does not own those keys.
let changingChapter = false;
document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    changingChapter
  )
    return;
  if (
    event.target instanceof Element &&
    event.target.closest(
      'input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="tablist"], pre, table, video, audio, .site-header, .site-footer',
    )
  )
    return;
  if (window.getSelection()?.toString()) return;

  const reader = readerIn(document);
  if (!reader) return;
  const bounds = reader.getBoundingClientRect();
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
  const links = [
    ...reader.querySelectorAll<HTMLAnchorElement>('.journey a[data-pill-link]'),
  ];
  const selected = links.findIndex((link) => link.hasAttribute('aria-current'));
  if (selected < 0) return;
  const target = links[selected + (event.key === 'ArrowRight' ? 1 : -1)];
  if (!target) return;

  event.preventDefault();
  changingChapter = true;
  void navigate(target.href, { sourceElement: target }).finally(() => {
    changingChapter = false;
  });
});
