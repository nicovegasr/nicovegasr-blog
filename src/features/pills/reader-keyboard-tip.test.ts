import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TipStub = {
  hidden: boolean;
  querySelector: () => { textContent: string };
  toggleAttribute: () => void;
};

let documentEvents: EventTarget;
let seconds: { textContent: string };
let tip: TipStub | null;
let storage: {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

const newTip = (hidden = true): TipStub => ({
  hidden,
  querySelector: () => seconds,
  toggleAttribute: () => undefined,
});
const start = async (dismissed = false) => {
  vi.resetModules();
  seconds = { textContent: '' };
  tip = newTip();
  documentEvents = Object.assign(new EventTarget(), {
    querySelector: () => tip,
  });
  storage = {
    getItem: vi.fn(() => (dismissed ? 'true' : null)),
    setItem: vi.fn(),
  };
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('sessionStorage', storage);
  await import('./reader-keyboard-tip');
};
const changePage = () => documentEvents.dispatchEvent(new Event('astro:page-load'));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('reader keyboard tip', () => {
  it('counts down three seconds, closes itself and does not return in the session', async () => {
    await start();
    expect(tip?.hidden).toBe(false);
    expect(seconds.textContent).toBe('3');
    vi.advanceTimersByTime(2000);
    expect(seconds.textContent).toBe('1');
    expect(tip?.hidden).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(tip?.hidden).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'pills.keyboard-tip.dismissed',
      'true',
    );
    tip = newTip(false);
    changePage();
    expect(tip.hidden).toBe(true);
    await start(true);
    expect(tip.hidden).toBe(true);
  });

  it('keeps the same countdown across chapter changes', async () => {
    await start();
    vi.advanceTimersByTime(2000);
    tip = newTip();
    changePage();
    vi.advanceTimersByTime(1000);
    expect(tip.hidden).toBe(true);
  });

  it('does not spend the time on pages without the tip', async () => {
    await start();
    tip = null;
    changePage();
    vi.advanceTimersByTime(5000);
    expect(storage.setItem).not.toHaveBeenCalled();
    tip = newTip();
    changePage();
    expect(tip.hidden).toBe(false);
  });

  it('still closes for good when browser storage cannot be written', async () => {
    await start();
    storage.setItem.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    vi.advanceTimersByTime(3000);
    tip = newTip(false);
    changePage();
    expect(tip.hidden).toBe(true);
  });
});
