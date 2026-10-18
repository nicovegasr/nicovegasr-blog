import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('astro:transitions/client', () => ({ navigate }));

let documentEvents: EventTarget;
let selected: number;
let selection: string;
class Target {
  constructor(private blocked = false, private inside = true) {}
  closest(selector: string) {
    return selector === '[data-pill-swipe]'
      ? (this.inside ? this : null)
      : (this.blocked ? this : null);
  }
}
const touch = (x: number, y = 200, identifier = 1) => ({ clientX: x, clientY: y, identifier });
const emit = (type: string, touches: ReturnType<typeof touch>[], fields = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' ? [] : touches },
    changedTouches: { value: touches },
    target: { value: new Target() },
    timeStamp: { value: type === 'touchstart' ? 0 : 100 },
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value }])),
  });
  documentEvents.dispatchEvent(event);
  return event;
};
const swipe = (start = 220, end = 100) => {
  emit('touchstart', [touch(start)]);
  return emit('touchend', [touch(end)]);
};

beforeEach(async () => {
  vi.resetModules();
  selected = 1;
  selection = '';
  const links = ['/one/', '/two/', '/three/'].map((href, index) => ({
    href,
    hasAttribute: () => index === selected,
  }));
  const reader = {
    getBoundingClientRect: () => ({ top: 0, bottom: 1200 }),
    querySelectorAll: () => links,
    querySelector: () => null,
  };
  documentEvents = Object.assign(new EventTarget(), { querySelector: () => reader });
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('Element', Target);
  vi.stubGlobal('window', {
    innerWidth: 480,
    innerHeight: 800,
    scrollY: 0,
    getSelection: () => selection,
    location: { assign: vi.fn() },
  });
  navigate.mockReset();
  navigate.mockResolvedValue(undefined);
  await import('./reader-swipe-navigation');
  await import('./reader-keyboard-navigation');
});
afterEach(() => vi.unstubAllGlobals());

describe('reader swipe navigation', () => {
  it('opens the next pill with a left swipe without preventing native touch behavior', () => {
    expect(swipe().defaultPrevented).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/three/', expect.any(Object));
  });

  it('opens the previous pill with a right swipe', () => {
    swipe(120, 240);
    expect(navigate).toHaveBeenCalledWith('/one/', expect.any(Object));
  });

  it.each([[0, 120, 240], [2, 220, 100]])('does not wrap at endpoint %i', (index, start, end) => {
    selected = index;
    swipe(start, end);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    [200, 205, 100], // vertical
    [180, 220, 100], // short
    [100, 290, 100], // diagonal
    [100, 200, 900], // long press
  ])('ignores an end at (%i, %i) after %i ms', (x, y, timeStamp) => {
    emit('touchstart', [touch(220)]);
    emit('touchend', [touch(x, y)], { timeStamp });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps a vertical reading gesture vertical even if the finger later moves sideways', () => {
    emit('touchstart', [touch(220)]);
    expect(emit('touchmove', [touch(225, 230)]).defaultPrevented).toBe(false);
    emit('touchend', [touch(100)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels when the page scrolls', () => {
    emit('touchstart', [touch(220)]);
    window.scrollY = 20;
    emit('touchend', [touch(100)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([10, 470])('leaves browser gestures near edge %i alone', (x) => {
    swipe(x, x < 100 ? 180 : 300);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([new Target(true), new Target(false, false)])('ignores controls, code and touches outside the article', (target) => {
    emit('touchstart', [touch(220)], { target });
    emit('touchend', [touch(100)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('preserves text selection', () => {
    emit('touchstart', [touch(220)]);
    selection = 'Selected text';
    emit('touchend', [touch(100)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['touchcancel', 'astro:before-preparation', 'astro:page-load'])('cancels an unfinished swipe on %s', (name) => {
    emit('touchstart', [touch(220)]);
    documentEvents.dispatchEvent(new Event(name));
    emit('touchend', [touch(100)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels pinch gestures and a changed touch identifier', () => {
    emit('touchstart', [touch(220)]);
    emit('touchmove', [touch(200), touch(300, 200, 2)]);
    emit('touchend', [touch(100)]);
    emit('touchstart', [touch(220)]);
    emit('touchend', [touch(100, 200, 2)]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shares the loading lock between swipe and keyboard on hybrid devices', () => {
    navigate.mockReturnValue(new Promise(() => {}));
    swipe();
    documentEvents.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowLeft' }));
    swipe(120, 240);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
