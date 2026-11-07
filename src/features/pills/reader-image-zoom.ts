const zoomableImageSelector = '.chapter-body img';

const zoomParts = () => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-pill-image-zoom]');
  const image = dialog?.querySelector<HTMLImageElement>('img');
  return dialog && image ? { dialog, image } : null;
};

const openImage = (source: HTMLImageElement) => {
  const parts = zoomParts();
  if (!parts) return;
  parts.image.src = source.currentSrc || source.src;
  parts.image.alt = source.alt;
  parts.image.removeAttribute('data-enlarged');
  parts.dialog.showModal();
};

const toggleEnlarged = () => {
  const parts = zoomParts();
  if (!parts) return;
  const { dialog, image } = parts;
  image.toggleAttribute('data-enlarged');
  dialog.scrollTo((dialog.scrollWidth - dialog.clientWidth) / 2, (dialog.scrollHeight - dialog.clientHeight) / 2);
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('[data-pill-image-zoom-close]')) {
    zoomParts()?.dialog.close();
  } else if (event.target.closest('[data-pill-image-zoom] img')) {
    toggleEnlarged();
  } else if (event.target.matches(zoomableImageSelector) && !event.target.closest('a')) {
    openImage(event.target as HTMLImageElement);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!(event.target instanceof Element) || !event.target.matches(zoomableImageSelector)) return;
  if (event.target.closest('a')) return;
  event.preventDefault();
  openImage(event.target as HTMLImageElement);
});

document.addEventListener('astro:page-load', () => {
  const label = zoomParts()?.dialog.dataset.enlargeLabel ?? '';
  document.querySelectorAll<HTMLImageElement>(zoomableImageSelector).forEach((image) => {
    if (image.closest('a')) return;
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', image.alt ? `${label}: ${image.alt}` : label);
  });
});

export {};
