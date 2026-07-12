import { describe, expect, it } from 'vitest';
import { calculateReadingTimeInMinutes } from '@/features/reading-time/reading-time';

describe('calculateReadingTimeInMinutes', () => {
  it('returns at least one minute for empty or tiny text', () => {
    expect(calculateReadingTimeInMinutes('')).toBe(1);
    expect(calculateReadingTimeInMinutes('   ')).toBe(1);
    expect(calculateReadingTimeInMinutes('one word')).toBe(1);
  });

  it('rounds up partial minutes', () => {
    const words = Array.from({ length: 221 }, () => 'word').join(' ');
    expect(calculateReadingTimeInMinutes(words)).toBe(2);
  });

  it('ignores collapsing whitespace when counting words', () => {
    expect(calculateReadingTimeInMinutes('a\n\n  b\t c')).toBe(1);
  });
});
