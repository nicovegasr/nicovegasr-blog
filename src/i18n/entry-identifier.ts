import type { Locale } from '@/i18n/locale';
import { isLocale } from '@/i18n/locale';

export type LocalizedEntryIdentifier = {
  readonly locale: Locale;
  readonly slug: string;
};

const removeMarkdownExtension = (path: string): string =>
  path.replace(/\.mdx?$/, '');

/**
 * Astro exposes content entry ids as "<locale>/<slug>.md"
 * (e.g. "es/mi-post.md"). This translates that raw identifier into
 * the locale and clean slug that the domain understands.
 * Returns null when the prefix is not a known locale.
 */
export const parseLocalizedEntryIdentifier = (
  entryId: string,
): LocalizedEntryIdentifier | null => {
  const [localePrefix, ...slugSegments] = removeMarkdownExtension(entryId).split('/');
  if (localePrefix === undefined || !isLocale(localePrefix)) {
    return null;
  }
  return { locale: localePrefix, slug: slugSegments.join('/') };
};
