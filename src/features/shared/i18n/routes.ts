import type { Locale } from '@/features/shared/domain/locale';
import { LOCALES } from '@/features/shared/domain/locale';

/**
 * Logical page identifiers, decoupled from their localized URL segment.
 * Use these everywhere in the code; never hardcode "/sobre-mi" or "/about".
 */
export type PageKey = 'blog' | 'about' | 'work' | 'contact';

const PATH_SEGMENT_BY_PAGE: Record<PageKey, Record<Locale, string>> = {
  blog: { es: '', en: '' },
  about: { es: 'sobre-mi', en: 'about' },
  work: { es: 'trabajo', en: 'work' },
  contact: { es: 'contacto', en: 'contact' },
};

const joinPath = (...segments: string[]): string => {
  const path = segments.filter((segment) => segment.length > 0).join('/');
  return `/${path}/`;
};

export const buildPagePath = (page: PageKey, locale: Locale): string =>
  joinPath(locale, PATH_SEGMENT_BY_PAGE[page][locale]);

export const buildBlogPostPath = (locale: Locale, slug: string): string =>
  joinPath(locale, 'blog', slug);

/**
 * Given the current pathname, returns the equivalent path in the other
 * locale, preserving the logical page. Used by the language switcher.
 *
 * Static pages (blog index, about, work, contact) map cleanly. Individual
 * blog posts have different slugs per locale, so without an explicit
 * translation link we cannot know the counterpart: we fall back to the
 * blog index of the target locale (safe, never a 404).
 */
export const buildAlternateLocalePath = (
  currentPathname: string,
  currentLocale: Locale,
  targetLocale: Locale,
): string => {
  const [, ...pathAfterLocale] = currentPathname.split('/').filter(Boolean);
  const firstSegment = pathAfterLocale[0] ?? '';

  const matchingPage = (Object.keys(PATH_SEGMENT_BY_PAGE) as PageKey[]).find(
    (page) => PATH_SEGMENT_BY_PAGE[page][currentLocale] === firstSegment,
  );

  if (matchingPage !== undefined && pathAfterLocale.length <= 1) {
    return buildPagePath(matchingPage, targetLocale);
  }

  return buildPagePath('blog', targetLocale);
};

export const localesOtherThan = (locale: Locale): readonly Locale[] =>
  LOCALES.filter((candidate) => candidate !== locale);
