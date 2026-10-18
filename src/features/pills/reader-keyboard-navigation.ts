import { changePill } from './reader-actions';

// Up/down retain native reading scroll. Left/right navigate only while the
// reader is visible and the focused control does not own those keys.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  if (
    event.target instanceof Element &&
    event.target.closest(
      'input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="tablist"], pre, table, video, audio, .site-header, .site-footer',
    )
  )
    return;
  if (changePill(event.key === 'ArrowRight' ? 'next' : 'previous'))
    event.preventDefault();
});
