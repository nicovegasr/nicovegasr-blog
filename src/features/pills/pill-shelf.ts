// Without JavaScript every book stays open and each spine jumps to its own.
const openBook = (shelf: HTMLElement, bookId: string) => {
  shelf.querySelectorAll<HTMLElement>('[data-book]').forEach((book) => {
    book.hidden = book.id !== bookId;
  });
  shelf.querySelectorAll<HTMLElement>('[data-spine]').forEach((spine) => {
    if (spine.dataset.spine === bookId) spine.setAttribute('aria-current', 'true');
    else spine.removeAttribute('aria-current');
  });
};

const enhanceShelves = () => {
  document.querySelectorAll<HTMLElement>('[data-pill-shelf]').forEach((shelf) => {
    const requested = location.hash.slice(1);
    const requestedBookExists = shelf.querySelector(`[data-book][id="${CSS.escape(requested)}"]`) !== null;
    const initial = requestedBookExists ? requested : shelf.querySelector<HTMLElement>('[data-book]')?.id;
    if (initial) openBook(shelf, initial);
    shelf.dataset.enhanced = '';
  });
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const spine = event.target.closest<HTMLElement>('[data-spine]');
  const shelf = spine?.closest<HTMLElement>('[data-pill-shelf]');
  if (!spine?.dataset.spine || !shelf) return;
  event.preventDefault();
  openBook(shelf, spine.dataset.spine);
  history.replaceState(history.state, '', `#${spine.dataset.spine}`);
});

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping(event.target)) return;
  const shelf = document.querySelector<HTMLElement>('[data-pill-shelf]');
  if (!shelf) return;
  const spines = [...shelf.querySelectorAll<HTMLElement>('[data-spine]')];
  const current = spines.findIndex((spine) => spine.getAttribute('aria-current') === 'true');
  const next = spines[current + (event.key === 'ArrowRight' ? 1 : -1)];
  if (!next?.dataset.spine) return;
  event.preventDefault();
  openBook(shelf, next.dataset.spine);
  history.replaceState(history.state, '', `#${next.dataset.spine}`);
  if (shelf.contains(document.activeElement)) next.focus();
});

enhanceShelves();
document.addEventListener('astro:page-load', enhanceShelves);
