import { navigate } from 'astro:transitions/client';

let changingChapter = false;

// All input methods share the same boundaries, loading lock and fallback.
export const changePill = (direction: 'previous' | 'next'): boolean => {
  if (changingChapter || window.getSelection()?.toString()) return false;
  const reader = document.querySelector<HTMLElement>('[data-pill-reader]');
  if (!reader) return false;
  const bounds = reader.getBoundingClientRect();
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return false;
  const links = [
    ...reader.querySelectorAll<HTMLAnchorElement>('.journey a[data-pill-link]'),
  ];
  const selected = links.findIndex((link) => link.hasAttribute('aria-current'));
  if (selected < 0) return false;
  const target = links[selected + (direction === 'next' ? 1 : -1)] ??
    (direction === 'next'
      ? reader.querySelector<HTMLAnchorElement>('[data-pill-next-series]')
      : null);
  if (!target) return false;

  changingChapter = true;
  void navigate(target.href, { sourceElement: target })
    .catch(() => {
      // Keep the real static link usable if client navigation fails.
      window.location.assign(target.href);
    })
    .finally(() => {
      changingChapter = false;
    });
  return true;
};
