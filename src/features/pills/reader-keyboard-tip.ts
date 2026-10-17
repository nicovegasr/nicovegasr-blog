const dismissalKey = 'pills.keyboard-tip.dismissed';
const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let dismissed = false;
try {
  dismissed = sessionStorage.getItem(dismissalKey) === 'true';
} catch {
  // Storage may be unavailable; dismissal still lasts through client navigation.
}

const updateTip = () => {
  const tip = document.querySelector<HTMLElement>('[data-reader-keyboard-tip]');
  if (tip) tip.hidden = dismissed || !desktopPointer.matches;
};

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('[data-dismiss-keyboard-tip]')) return;
  const tip = document.querySelector<HTMLElement>('[data-reader-keyboard-tip]');
  if (tip?.contains(document.activeElement)) {
    document
      .querySelector<HTMLElement>('#chapter-title')
      ?.focus({ preventScroll: true });
  }
  dismissed = true;
  try {
    sessionStorage.setItem(dismissalKey, 'true');
  } catch {
    // The in-memory flag still prevents the tip from reappearing this visit.
  }
  updateTip();
});

desktopPointer.addEventListener('change', updateTip);
document.addEventListener('astro:page-load', updateTip);
updateTip();

export {};
