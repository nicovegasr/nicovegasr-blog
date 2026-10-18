import { changePill } from './reader-actions';

const edgeMargin = 32;
const minimumDistance = 72;
const maximumDuration = 700;
const directionThreshold = 12;
const horizontalRatio = 1.5;

let gesture: {
  id: number;
  x: number;
  y: number;
  startedAt: number;
  scrollY: number;
} | undefined;

const cancelGesture = () => { gesture = undefined; };

document.addEventListener('touchstart', (event) => {
  cancelGesture();
  if (event.touches.length !== 1 || event.defaultPrevented) return;
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('[data-pill-swipe]')) return;
  if (event.target.closest(
    'a, button, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="tablist"], pre, table, video, audio, summary',
  )) return;
  if (window.getSelection()?.toString()) return;
  const touch = event.touches[0]!;
  // Leave browser back/forward edge gestures alone.
  if (touch.clientX <= edgeMargin || touch.clientX >= window.innerWidth - edgeMargin)
    return;
  gesture = {
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    startedAt: event.timeStamp,
    scrollY: window.scrollY,
  };
}, { passive: true });

document.addEventListener('touchmove', (event) => {
  if (!gesture) return;
  const touch = event.touches[0];
  if (event.touches.length !== 1 || !touch || touch.identifier !== gesture.id) {
    cancelGesture();
    return;
  }
  const dx = Math.abs(touch.clientX - gesture.x);
  const dy = Math.abs(touch.clientY - gesture.y);
  // Once a gesture becomes vertical or scrolls the page, it stays a read gesture.
  if ((dy >= directionThreshold && dy >= dx) ||
      Math.abs(window.scrollY - gesture.scrollY) > 8)
    cancelGesture();
}, { passive: true });

document.addEventListener('touchend', (event) => {
  const start = gesture;
  cancelGesture();
  if (!start || event.touches.length || event.defaultPrevented) return;
  const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.id);
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = Math.abs(touch.clientY - start.y);
  if (event.timeStamp - start.startedAt > maximumDuration ||
      Math.abs(window.scrollY - start.scrollY) > 8 ||
      Math.abs(dx) < minimumDistance || Math.abs(dx) < dy * horizontalRatio)
    return;
  changePill(dx < 0 ? 'next' : 'previous');
}, { passive: true });

document.addEventListener('touchcancel', cancelGesture, { passive: true });
document.addEventListener('astro:before-preparation', cancelGesture);
document.addEventListener('astro:page-load', cancelGesture);
