import type { Locale } from '@/i18n/locale';
import { LOCALES } from '@/i18n/locale';

// Logical page identifiers, decoupled from their localized URL segments.
// Never hardcode "/contenido" or "/content"; resolve URLs through buildPagePath.
export type PageKey = 'home' | 'pills' | 'articles' | 'labs';
export type ContentSection = Exclude<PageKey, 'home'>;

const CONTENT_SEGMENT: Record<Locale, string> = { es: 'contenido', en: 'content' };
const PILLS_DETAIL_SEGMENT: Record<Locale, string> = { es: 'pildoras', en: 'pills' };
const LABS_DETAIL_SEGMENT: Record<Locale, string> = { es: 'laboratorios', en: 'labs' };
const BLOG_DETAIL_SEGMENT = 'blog';

// Spanish, the default locale, lives at the root; other locales keep their prefix.
const LOCALE_PREFIX_SEGMENTS: Record<Locale, readonly string[]> = { es: [], en: ['en'] };

const PATH_SEGMENTS_BY_PAGE: Record<PageKey, Record<Locale, readonly string[]>> = {
  home: { es: [], en: [] },
  pills: {
    es: [CONTENT_SEGMENT.es, PILLS_DETAIL_SEGMENT.es],
    en: [CONTENT_SEGMENT.en, PILLS_DETAIL_SEGMENT.en],
  },
  articles: {
    es: [CONTENT_SEGMENT.es, BLOG_DETAIL_SEGMENT],
    en: [CONTENT_SEGMENT.en, BLOG_DETAIL_SEGMENT],
  },
  labs: {
    es: [CONTENT_SEGMENT.es, LABS_DETAIL_SEGMENT.es],
    en: [CONTENT_SEGMENT.en, LABS_DETAIL_SEGMENT.en],
  },
};

const joinPath = (...segments: readonly string[]): string => {
  const path = segments.filter((segment) => segment.length > 0).join('/');
  return path.length > 0 ? `/${path}/` : '/';
};

const joinLocalePath = (locale: Locale, ...segments: readonly string[]): string =>
  joinPath(...LOCALE_PREFIX_SEGMENTS[locale], ...segments);

export const buildPagePath = (page: PageKey, locale: Locale): string =>
  joinLocalePath(locale, ...PATH_SEGMENTS_BY_PAGE[page][locale]);

export const buildBlogPostPath = (locale: Locale, slug: string): string =>
  joinLocalePath(locale, BLOG_DETAIL_SEGMENT, slug);

export const buildPillSeriesPath = (locale: Locale, series: string): string =>
  joinLocalePath(locale, PILLS_DETAIL_SEGMENT[locale], series);

export const buildPillPath = (locale: Locale, series: string, pill: string): string =>
  joinLocalePath(locale, PILLS_DETAIL_SEGMENT[locale], series, pill);

export const buildLabPath = (locale: Locale, lab: string): string =>
  joinLocalePath(locale, LABS_DETAIL_SEGMENT[locale], lab);

// RSS endpoints keep their explicit extension, so no trailing slash here.
export const buildRssFeedPath = (locale: Locale): string => `${joinLocalePath(locale)}rss.xml`;

const pathSegments = (pathname: string): readonly string[] => pathname.split('/').filter(Boolean);

const pathSegmentsWithinLocale = (pathname: string, locale: Locale): readonly string[] =>
  pathSegments(pathname).slice(LOCALE_PREFIX_SEGMENTS[locale].length);

// Content indexes live under /contenido, but published articles, pills and labs
// keep their original URLs so that shared links and search results stay valid.
export const contentSectionOf = (pathname: string, locale: Locale): ContentSection | null => {
  const [firstSegment, secondSegment] = pathSegmentsWithinLocale(pathname, locale);
  const sectionSegment = firstSegment === CONTENT_SEGMENT[locale] ? secondSegment : firstSegment;
  if (sectionSegment === PILLS_DETAIL_SEGMENT[locale]) return 'pills';
  if (sectionSegment === LABS_DETAIL_SEGMENT[locale]) return 'labs';
  if (sectionSegment === BLOG_DETAIL_SEGMENT) return 'articles';
  return null;
};

export const isSamePath = (firstPathname: string, secondPathname: string): boolean =>
  pathSegments(firstPathname).join('/') === pathSegments(secondPathname).join('/');

// Maps the current path to its equivalent in another locale (language switcher).
// Blog posts have different slugs per locale, so they cannot be mapped and fall
// back to the target blog index (safe, never a 404).
export const buildAlternateLocalePath = (
  currentPathname: string,
  currentLocale: Locale,
  targetLocale: Locale,
): string => {
  const matchingPage = (Object.keys(PATH_SEGMENTS_BY_PAGE) as PageKey[]).find((page) =>
    isSamePath(buildPagePath(page, currentLocale), currentPathname),
  );

  if (matchingPage !== undefined) {
    return buildPagePath(matchingPage, targetLocale);
  }

  const [firstSegment, ...restSegments] = pathSegmentsWithinLocale(currentPathname, currentLocale);

  // Pills and labs slugs are locale-independent, so deeper paths map segment by segment.
  if (firstSegment === PILLS_DETAIL_SEGMENT[currentLocale]) {
    return joinLocalePath(targetLocale, PILLS_DETAIL_SEGMENT[targetLocale], ...restSegments);
  }

  if (firstSegment === LABS_DETAIL_SEGMENT[currentLocale]) {
    return joinLocalePath(targetLocale, LABS_DETAIL_SEGMENT[targetLocale], ...restSegments);
  }

  return buildPagePath('articles', targetLocale);
};

export const localesOtherThan = (locale: Locale): readonly Locale[] =>
  LOCALES.filter((candidate) => candidate !== locale);
