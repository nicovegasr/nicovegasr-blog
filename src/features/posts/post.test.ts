import { describe, expect, it } from 'vitest';
import {
  calculateReadingTimeInMinutes,
  countSharedTags,
  isPublished,
  searchableText,
  type Post,
} from '@/features/posts/post';

const buildPost = (overrides: Partial<Post> = {}): Post => ({
  slug: 'a-post',
  locale: 'es',
  title: 'A post',
  summary: 'A summary long enough to be valid',
  publicationDate: new Date('2026-01-01'),
  lastUpdateDate: undefined,
  tags: [],
  readingTimeInMinutes: 1,
  ...overrides,
});

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

describe('isPublished', () => {
  it('is published when the publication date is in the past', () => {
    const post = buildPost({ publicationDate: new Date('2020-01-01') });
    expect(isPublished(post, new Date('2026-01-01'))).toBe(true);
  });

  it('is published when the publication date is exactly now', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    expect(isPublished(buildPost({ publicationDate: now }), now)).toBe(true);
  });

  it('is not published when the publication date is in the future', () => {
    const post = buildPost({ publicationDate: new Date('2030-01-01') });
    expect(isPublished(post, new Date('2026-01-01'))).toBe(false);
  });
});

describe('countSharedTags', () => {
  it('counts tags present in both posts', () => {
    const first = buildPost({ tags: ['astro', 'testing', 'typescript'] });
    const second = buildPost({ tags: ['testing', 'typescript', 'css'] });
    expect(countSharedTags(first, second)).toBe(2);
  });

  it('is zero when no tags are in common', () => {
    expect(
      countSharedTags(buildPost({ tags: ['astro'] }), buildPost({ tags: ['css'] })),
    ).toBe(0);
  });

  it('is zero when either post has no tags', () => {
    expect(
      countSharedTags(buildPost({ tags: [] }), buildPost({ tags: ['astro'] })),
    ).toBe(0);
  });
});

describe('searchableText', () => {
  it('joins title, summary and tags, lowercased', () => {
    const post = buildPost({
      title: 'Astro Islands',
      summary: 'Partial hydration',
      tags: ['Performance', 'SSR'],
    });

    expect(searchableText(post)).toBe(
      'astro islands partial hydration performance ssr',
    );
  });
});
