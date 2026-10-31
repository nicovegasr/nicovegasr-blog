const dismissalKey = 'pills.keyboard-tip.dismissed';
let dismissed = false;
try {
  dismissed = sessionStorage.getItem(dismissalKey) === 'true';
} catch {
  // Storage may be unavailable; dismissal still lasts through client navigation.
}

let secondsLeft = 3;
let countdown: ReturnType<typeof setInterval> | undefined;

const dismissTip = () => {
  dismissed = true;
  try {
    sessionStorage.setItem(dismissalKey, 'true');
  } catch {
    // The in-memory flag still prevents the tip from reappearing this visit.
  }
  updateTip();
};

const tick = () => {
  secondsLeft -= 1;
  if (secondsLeft <= 0) dismissTip();
  else updateTip();
};

const updateTip = () => {
  const tip = document.querySelector<HTMLElement>('[data-reader-keyboard-tip]');
  const visible = tip !== null && !dismissed;
  document
    .querySelector('[data-pill-reader]')
    ?.toggleAttribute('data-navigation-hint-visible', visible);
  if (tip) {
    tip.hidden = !visible;
    const seconds = tip.querySelector('[data-keyboard-tip-seconds]');
    if (seconds) seconds.textContent = String(secondsLeft);
  }
  if (!visible) {
    clearInterval(countdown);
    countdown = undefined;
  } else if (countdown === undefined) {
    countdown = setInterval(tick, 1000);
  }
};

document.addEventListener('astro:page-load', updateTip);
updateTip();

export {};
