import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMascotWalker } from './mascot-walker';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('mascot walking and resting', () => {
  it('keeps walking when the next station requests a different rest pose', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
    const styles = new Map<string, string>();
    const mascot = {
      style: { setProperty: (name: string, value: string) => styles.set(name, value) },
    } as unknown as HTMLElement;
    const walker = createMascotWalker(mascot);

    walker.walk(18, true);
    walker.rest('fallen');
    expect(styles.get('--sprite-row')).toBe('0');
    vi.advanceTimersByTime(100);
    walker.walk(18, true);
    walker.rest('welcoming');
    expect(styles.get('--reaction-visibility')).toBe('0');
    vi.advanceTimersByTime(139);
    expect(styles.get('--sprite-row')).toBe('0');
    vi.advanceTimersByTime(1);
    expect(styles.get('--reaction-visibility')).toBe('1');
    expect(styles.get('--reaction-column')).toBe('2');

    walker.rest('thinking');
    expect(styles.get('--reaction-visibility')).toBe('0');
    expect(styles.get('--sprite-row')).toBe('1');
    expect(styles.get('--sprite-column')).toBe('1');
  });
});
