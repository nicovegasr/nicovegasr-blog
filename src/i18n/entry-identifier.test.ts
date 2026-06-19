import { describe, expect, it } from 'vitest';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

describe('parseLocalizedEntryIdentifier', () => {
  it('splits a "<locale>/<slug>.md" identifier', () => {
    expect(parseLocalizedEntryIdentifier('es/mi-post.md')).toEqual({
      locale: 'es',
      slug: 'mi-post',
    });
  });

  it('supports the .mdx extension', () => {
    expect(parseLocalizedEntryIdentifier('en/my-post.mdx')).toEqual({
      locale: 'en',
      slug: 'my-post',
    });
  });

  it('keeps nested slug segments', () => {
    expect(parseLocalizedEntryIdentifier('es/2026/mi-post.md')).toEqual({
      locale: 'es',
      slug: '2026/mi-post',
    });
  });

  it('returns null when the prefix is not a known locale', () => {
    expect(parseLocalizedEntryIdentifier('fr/mon-article.md')).toBeNull();
  });

  it('returns null when there is no locale prefix', () => {
    expect(parseLocalizedEntryIdentifier('mi-post.md')).toBeNull();
  });
});
