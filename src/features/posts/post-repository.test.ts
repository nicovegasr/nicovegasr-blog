import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getCollection } = vi.hoisted(() => ({ getCollection: vi.fn() }));

vi.mock('astro:content', () => ({ getCollection, render: vi.fn() }));

import { findRelatedPosts } from '@/features/posts/post-repository';

type EntryInput = { id: string; tags?: string[]; publicationDate?: string };

const buildEntry = ({ id, tags = [], publicationDate = '2020-01-01' }: EntryInput) => ({
  id,
  body: 'body text',
  data: {
    title: id,
    summary: 'a summary long enough to be valid',
    publicationDate: new Date(publicationDate),
    lastUpdateDate: undefined,
    tags,
  },
});

const givenEntries = (...entries: EntryInput[]) =>
  getCollection.mockResolvedValue(entries.map(buildEntry));

beforeEach(() => getCollection.mockReset());

describe('findRelatedPosts', () => {
  it('ranks by shared tag count, breaking ties by most recent', async () => {
    givenEntries(
      { id: 'es/target', tags: ['a', 'b'] },
      { id: 'es/two-shared', tags: ['a', 'b'], publicationDate: '2021-01-01' },
      { id: 'es/one-newer', tags: ['a'], publicationDate: '2023-01-01' },
      { id: 'es/one-older', tags: ['a'], publicationDate: '2022-01-01' },
    );

    const related = await findRelatedPosts('es', 'target');

    expect(related.map((post) => post.slug)).toEqual([
      'two-shared',
      'one-newer',
      'one-older',
    ]);
  });

  it('excludes the target and posts with no shared tags', async () => {
    givenEntries(
      { id: 'es/target', tags: ['a'] },
      { id: 'es/unrelated', tags: ['z'] },
    );

    expect(await findRelatedPosts('es', 'target')).toEqual([]);
  });

  it('caps the result to the limit', async () => {
    givenEntries(
      { id: 'es/target', tags: ['a'] },
      { id: 'es/one', tags: ['a'] },
      { id: 'es/two', tags: ['a'] },
      { id: 'es/three', tags: ['a'] },
      { id: 'es/four', tags: ['a'] },
    );

    expect(await findRelatedPosts('es', 'target', 2)).toHaveLength(2);
  });

  it('only considers posts in the same locale', async () => {
    givenEntries(
      { id: 'es/target', tags: ['a'] },
      { id: 'en/other', tags: ['a'] },
    );

    expect(await findRelatedPosts('es', 'target')).toEqual([]);
  });

  it('ignores unpublished (future) posts', async () => {
    givenEntries(
      { id: 'es/target', tags: ['a'] },
      { id: 'es/future', tags: ['a'], publicationDate: '2999-01-01' },
    );

    expect(await findRelatedPosts('es', 'target')).toEqual([]);
  });

  it('returns empty when the target does not exist', async () => {
    givenEntries({ id: 'es/some-post', tags: ['a'] });

    expect(await findRelatedPosts('es', 'missing')).toEqual([]);
  });
});
