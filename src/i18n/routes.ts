import type { Locale } from '@/i18n/locale';
import { LOCALES } from '@/i18n/locale';

// Logical page identifiers, decoupled from their localized URL segment.
// Never hardcode "/sobre-mi" or "/about"; resolve URLs through buildPagePath.
export type PageKey = 'blog' | 'about' | 'work' | 'contact';

const PATH_SEGMENT_BY_PAGE: Record<PageKey, Record<Locale, string>> = {
  blog: { es: '', en: '' },
  about: { es: 'sobre-mi', en: 'about' },
  work: { es: 'trabajo', en: 'work' },
  contact: { es: 'contacto', en: 'contact' },
};

const joinPath = (...segments: string[]): string => {
  const path = segments.filter((segment) => segment.length > 0).join('/');
  return path.length > 0 ? `/${path}/` : '/';
};

export const buildPagePath = (page: PageKey, locale: Locale): string =>
  joinPath(locale, PATH_SEGMENT_BY_PAGE[page][locale]);

export const buildBlogPostPath = (locale: Locale, slug: string): string =>
  joinPath(locale, 'blog', slug);

// Maps the current path to its equivalent in another locale (language switcher).
// Blog posts have different slugs per locale, so they cannot be mapped and fall
// back to the target blog index (safe, never a 404).
export const buildAlternateLocalePath = (
  currentPathname: string,
  currentLocale: Locale,
  targetLocale: Locale,
): string => {
  const segments = currentPathname.split('/').filter(Boolean);
  const pageSegments = segments.slice(1);
  const firstSegment = pageSegments[0] ?? '';

  const matchingPage = (Object.keys(PATH_SEGMENT_BY_PAGE) as PageKey[]).find(
    (page) => PATH_SEGMENT_BY_PAGE[page][currentLocale] === firstSegment,
  );

  if (matchingPage !== undefined && pageSegments.length <= 1) {
    return buildPagePath(matchingPage, targetLocale);
  }

  return buildPagePath('blog', targetLocale);
};

export const localesOtherThan = (locale: Locale): readonly Locale[] =>
  LOCALES.filter((candidate) => candidate !== locale);
