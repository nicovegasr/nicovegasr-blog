import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { navigate, deselectScripts, swapHeadElements } = vi.hoisted(() => ({
  navigate: vi.fn(),
  deselectScripts: vi.fn(),
  swapHeadElements: vi.fn(),
}));
vi.mock('astro:transitions/client', () => ({
  navigate,
  swapFunctions: { deselectScripts, swapHeadElements },
}));

const link = (href: string, active = false, top = 120, bottom = 180) => {
  const attributes = new Map([['href', href]]);
  if (active) attributes.set('aria-current', 'page');
  return {
    href,
    hasAttribute: (name: string) => attributes.has(name),
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    getBoundingClientRect: () => ({ top, bottom }),
  };
};

const reader = (key = 'es/docker', selected = 0) => {
  const links = [
    link('/intro/#pill-reading', selected === 0),
    link('/images/#pill-reading', selected === 1),
    link('/docker/#resumen'),
  ];
  const focus = vi.fn();
  const index = {
    scrollTop: 0,
    scrollHeight: 700,
    clientHeight: 200,
    getBoundingClientRect: () => ({ top: 100, bottom: 300 }),
    querySelector: (selector: string) =>
      selector.includes('#resumen')
        ? links[2]
        : links.find((item) => item.getAttribute('aria-current')),
    querySelectorAll: () => links,
  };
  const panel = {
    replaceWith: vi.fn(),
    animate: vi.fn(() => ({ cancel: vi.fn() })),
  };
  return {
    links,
    index,
    focus,
    panel,
    dataset: { pillReader: key },
    getBoundingClientRect: () => ({ top: 0, bottom: 1200 }),
    querySelectorAll: () => links.slice(0, 2),
    querySelector: (selector: string) =>
      selector === '.contents'
        ? index
        : selector === '.reading-desk'
          ? panel
          : { focus, getBoundingClientRect: () => ({ top: 220 }) },
  };
};

let current: ReturnType<typeof reader>;
let documentEvents: EventTarget;
const emit = (name: string, fields = {}) =>
  documentEvents.dispatchEvent(Object.assign(new Event(name), fields));
const beforeSwap = (
  incoming: ReturnType<typeof reader>,
  navigationType = 'push',
  hash = '#pill-reading',
) => {
  const event = Object.assign(new Event('astro:before-swap'), {
    newDocument: {
      querySelector: (selector: string) =>
        selector === '[data-pill-reader]' ? incoming : null,
    },
    viewTransition: { skipTransition: vi.fn() },
    swap: vi.fn(),
    navigationType,
    to: new URL(`https://example.test/images/${hash}`),
  });
  documentEvents.dispatchEvent(event);
  return event;
};

beforeEach(async () => {
  vi.resetModules();
  current = reader();
  documentEvents = Object.assign(new EventTarget(), {
    querySelector: (selector: string) =>
      selector === '[data-pill-reader]' ? current : null,
    documentElement: {},
  });
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('location', { hash: '#pill-reading' });
  vi.stubGlobal('Element', class {});
  vi.stubGlobal('window', {
    innerHeight: 800,
    scrollY: 100,
    getSelection: () => null,
    scrollTo: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: false })),
  });
  vi.stubGlobal('getComputedStyle', () => ({
    scrollMarginTop: '40px',
    getPropertyValue: () => '3s',
  }));
  deselectScripts.mockReset();
  swapHeadElements.mockReset();
  navigate.mockReset();
  navigate.mockResolvedValue(undefined);
  await import('./reader-navigation');
});
afterEach(() => vi.unstubAllGlobals());

describe('notebook navigation lifecycle', () => {
  it('swaps only the reading panel and metadata within the current series', () => {
    const incoming = reader('es/docker', 1);
    const event = beforeSwap(incoming);
    event.swap();
    expect(event.viewTransition.skipTransition).toHaveBeenCalled();
    expect(swapHeadElements).toHaveBeenCalledWith(event.newDocument);
    expect(current.panel.replaceWith).toHaveBeenCalledWith(incoming.panel);
  });

  it('explicitly aligns every new chapter below the header and uses the duration token', () => {
    beforeSwap(reader('es/docker', 1));
    emit('astro:after-swap');
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 280,
      left: 0,
      behavior: 'instant',
    });
    expect(current.panel.animate).toHaveBeenCalledWith(expect.any(Array), {
      duration: 3000,
      easing: 'ease-in-out',
    });
    emit('astro:page-load');
    beforeSwap(reader('es/docker', 0));
    emit('astro:after-swap');
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it('omits the panel animation when reduced motion is enabled', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
    } as MediaQueryList);
    beforeSwap(reader('es/docker', 1));
    emit('astro:after-swap');
    expect(current.panel.animate).not.toHaveBeenCalled();
  });

  it('updates the persistent index and restores its scroll after a chapter swap', () => {
    current.index.scrollTop = 125;
    beforeSwap(reader('es/docker', 1));
    expect(current.links[0]!.getAttribute('aria-current')).toBeNull();
    expect(current.links[1]!.getAttribute('aria-current')).toBe('page');
    current.index.scrollTop = 0;
    emit('astro:after-swap');
    expect(current.index.scrollTop).toBe(125);
    emit('astro:page-load');
    expect(current.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not carry an index selection between different series', () => {
    beforeSwap(reader('es/fundamentos', 1));
    emit('astro:after-swap');
    emit('astro:page-load');
    expect(current.links[0]!.getAttribute('aria-current')).toBe('page');
    expect(current.focus).not.toHaveBeenCalled();
  });

  it('reveals an offscreen selection by scrolling only the index', () => {
    current.links[0]!.getBoundingClientRect = () => ({ top: 320, bottom: 380 });
    emit('astro:page-load');
    expect(current.index.scrollTop).toBe(88);
    expect(current.focus).not.toHaveBeenCalled();
  });

  it('does not move focus when restoring browser history', () => {
    beforeSwap(reader('es/docker', 1), 'traverse');
    emit('astro:after-swap');
    emit('astro:page-load');
    expect(current.links[1]!.getAttribute('aria-current')).toBe('page');
    expect(current.focus).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('marks the summary instead of the first chapter for summary navigation', () => {
    beforeSwap(reader(), 'push', '#resumen');
    expect(current.links[0]!.getAttribute('aria-current')).toBeNull();
    expect(current.links[2]!.getAttribute('aria-current')).toBe('page');
  });
});

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

  it('opens the previous pill with left, without wrapping at either endpoint', async () => {
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
});
