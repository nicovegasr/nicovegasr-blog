import { describe, expect, it } from 'vitest';
import {
  calculateReadingTimeInMinutes,
  isPublished,
  selectRelatedPostsByTags,
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

describe('selectRelatedPostsByTags', () => {
  const target = buildPost({ slug: 'target', tags: ['astro', 'testing'] });

  it('excludes the target post itself', () => {
    const sameSlug = buildPost({ slug: 'target', tags: ['astro'] });
    expect(selectRelatedPostsByTags(target, [sameSlug], 3)).toEqual([]);
  });

  it('excludes posts that share no tags', () => {
    const unrelated = buildPost({ slug: 'unrelated', tags: ['cooking'] });
    expect(selectRelatedPostsByTags(target, [unrelated], 3)).toEqual([]);
  });

  it('ranks by number of shared tags, descending', () => {
    const oneShared = buildPost({ slug: 'one', tags: ['astro'] });
    const twoShared = buildPost({ slug: 'two', tags: ['astro', 'testing'] });

    const result = selectRelatedPostsByTags(target, [oneShared, twoShared], 3);

    expect(result.map((post) => post.slug)).toEqual(['two', 'one']);
  });

  it('breaks ties by most recent publication date', () => {
    const older = buildPost({
      slug: 'older',
      tags: ['astro'],
      publicationDate: new Date('2025-01-01'),
    });
    const newer = buildPost({
      slug: 'newer',
      tags: ['astro'],
      publicationDate: new Date('2026-01-01'),
    });

    const result = selectRelatedPostsByTags(target, [older, newer], 3);

    expect(result.map((post) => post.slug)).toEqual(['newer', 'older']);
  });

  it('caps the result to the given limit', () => {
    const candidates = ['a', 'b', 'c', 'd'].map((slug) =>
      buildPost({ slug, tags: ['astro'] }),
    );

    expect(selectRelatedPostsByTags(target, candidates, 2)).toHaveLength(2);
  });
});
