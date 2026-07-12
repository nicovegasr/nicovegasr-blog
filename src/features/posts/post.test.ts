import { describe, expect, it } from 'vitest';
import {
  isPublished,
  searchableText,
  sharedTagCountWith,
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
  translationSlug: undefined,
  ...overrides,
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

describe('sharedTagCountWith', () => {
  it('counts the tags both posts have in common', () => {
    const post = buildPost({ tags: ['astro', 'testing', 'typescript'] });
    const other = buildPost({ tags: ['testing', 'typescript', 'css'] });
    expect(sharedTagCountWith(post, other)).toBe(2);
  });

  it('is zero with no tags in common or when one has none', () => {
    expect(sharedTagCountWith(buildPost({ tags: ['astro'] }), buildPost({ tags: ['css'] }))).toBe(0);
    expect(sharedTagCountWith(buildPost({ tags: [] }), buildPost({ tags: ['astro'] }))).toBe(0);
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
