import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('astro:transitions/client', () => ({ navigate }));

const reader = (_key = 'es/docker', selected = 0) => ({
  links: ['/intro/#pill-reading', '/images/#pill-reading'].map((href, index) => ({
    href,
    hasAttribute: () => index === selected,
  })),
  getBoundingClientRect: () => ({ top: 0, bottom: 1200 }),
  querySelectorAll() { return this.links; },
});
let current: ReturnType<typeof reader>;
let documentEvents: EventTarget;
const assign = vi.fn();
beforeEach(async () => {
  vi.resetModules();
  current = reader();
  documentEvents = Object.assign(new EventTarget(), { querySelector: () => current });
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('Element', class {});
  vi.stubGlobal('window', {
    innerHeight: 800,
    getSelection: () => null,
    location: { assign },
  });
  assign.mockReset();
  navigate.mockReset();
  navigate.mockResolvedValue(undefined);
  await import('./reader-keyboard-navigation');
});
afterEach(() => vi.unstubAllGlobals());

const pressKey = (key: string, fields = {}) => {
  const event = Object.assign(new Event('keydown', { cancelable: true }), {
    key,
    ...fields,
  });
  documentEvents.dispatchEvent(event);
  return event;
};

describe('reader keyboard navigation', () => {
  it('opens the next pill with right, keeping native up/down reading scroll', () => {
    expect(pressKey('ArrowDown').defaultPrevented).toBe(false);
    expect(pressKey('ArrowUp').defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(pressKey('ArrowRight').defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/images/#pill-reading', {
      sourceElement: current.links[1],
    });
  });

  it('opens the previous pill with left, without wrapping at either endpoint', () => {
    expect(pressKey('ArrowLeft').defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    current = reader('es/docker', 1);
    expect(pressKey('ArrowRight').defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    pressKey('ArrowLeft');
    expect(navigate).toHaveBeenCalledWith('/intro/#pill-reading', {
      sourceElement: current.links[0],
    });
  });

  it('leaves browser shortcuts, held keys, and offscreen readers alone', () => {
    pressKey('ArrowRight', { altKey: true });
    pressKey('ArrowRight', { metaKey: true });
    pressKey('ArrowRight', { repeat: true });
    current.getBoundingClientRect = () => ({ top: 900, bottom: 2000 });
    pressKey('ArrowRight');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves arrow keys to focused editing or horizontally scrolling controls', () => {
    class Control {
      closest = () => ({ tagName: 'INPUT' });
    }
    vi.stubGlobal('Element', Control);
    const event = Object.assign(new Event('keydown', { cancelable: true }), {
      key: 'ArrowRight',
    });
    Object.defineProperty(event, 'target', { value: new Control() });
    documentEvents.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('prevents overlapping keyboard navigations while a chapter is loading', () => {
    navigate.mockReturnValue(new Promise(() => {}));
    pressKey('ArrowRight');
    pressKey('ArrowRight');
    expect(navigate).toHaveBeenCalledTimes(1);
  });
  it('falls back to the static page and releases the key lock after a failure', async () => {
    navigate.mockRejectedValueOnce(new Error('Navigation failed'));
    pressKey('ArrowRight');
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/images/#pill-reading'));
    navigate.mockResolvedValue(undefined);
    pressKey('ArrowRight');
    expect(navigate).toHaveBeenCalledTimes(2);
  });
});
