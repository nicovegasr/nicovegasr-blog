import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let documentEvents: EventTarget;
let media: EventTarget & { matches: boolean };
let tip: { hidden: boolean; contains: () => boolean };
let storage: {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};
class DismissButton {
  closest = () => ({});
}

const start = async (matches = true, dismissed = false) => {
  vi.resetModules();
  tip = { hidden: true, contains: () => false };
  documentEvents = Object.assign(new EventTarget(), {
    querySelector: () => tip,
  });
  media = Object.assign(new EventTarget(), { matches });
  storage = {
    getItem: vi.fn(() => (dismissed ? 'true' : null)),
    setItem: vi.fn(),
  };
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('window', { matchMedia: () => media });
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('Element', DismissButton);
  await import('./reader-keyboard-tip');
};
const dismiss = () => {
  const event = new Event('click');
  Object.defineProperty(event, 'target', { value: new DismissButton() });
  documentEvents.dispatchEvent(event);
};

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('reader keyboard tip', () => {
  it('appears for a fine pointer with hover support and follows capability changes', async () => {
    await start();
    expect(tip.hidden).toBe(false);
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(tip.hidden).toBe(true);
  });

  it('stays hidden on touch-oriented devices', async () => {
    await start(false);
    expect(tip.hidden).toBe(true);
  });

  it('remembers dismissal through chapter changes and the browser session', async () => {
    await start();
    dismiss();
    expect(tip.hidden).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'pills.keyboard-tip.dismissed',
      'true',
    );
    tip = { hidden: false, contains: () => false };
    documentEvents.dispatchEvent(new Event('astro:page-load'));
    expect(tip.hidden).toBe(true);
    await start(true, true);
    expect(tip.hidden).toBe(true);
  });

  it('still dismisses when browser storage cannot be written', async () => {
    await start();
    storage.setItem.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    dismiss();
    tip.hidden = false;
    documentEvents.dispatchEvent(new Event('astro:page-load'));
    expect(tip.hidden).toBe(true);
  });
});
