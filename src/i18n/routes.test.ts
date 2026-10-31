import { describe, expect, it } from 'vitest';
import {
  buildAlternateLocalePath,
  buildLabPath,
  buildPagePath,
  buildPillPath,
  contentSectionOf,
} from '@/i18n/routes';

describe('page paths', () => {
  it('serves the home at the locale root and the content sections under it', () => {
    expect(buildPagePath('home', 'es')).toBe('/es/');
    expect(buildPagePath('pills', 'es')).toBe('/es/contenido/pildoras/');
    expect(buildPagePath('articles', 'es')).toBe('/es/contenido/blog/');
    expect(buildPagePath('labs', 'es')).toBe('/es/contenido/laboratorios/');
    expect(buildPagePath('pills', 'en')).toBe('/en/content/pills/');
    expect(buildPagePath('articles', 'en')).toBe('/en/content/blog/');
    expect(buildPagePath('labs', 'en')).toBe('/en/content/labs/');
  });

  it('keeps published detail pages at their original URLs', () => {
    expect(buildPillPath('es', 'fundamentos', 'api')).toBe('/es/pildoras/fundamentos/api/');
    expect(buildLabPath('en', 'scaling')).toBe('/en/labs/scaling/');
  });
});

describe('alternate locale paths', () => {
  it.each([
    ['/es/', '/en/'],
    ['/es/contenido/pildoras/', '/en/content/pills/'],
    ['/es/contenido/blog/', '/en/content/blog/'],
    ['/es/contenido/laboratorios/', '/en/content/labs/'],
    ['/es/pildoras/fundamentos/api/', '/en/pills/fundamentos/api/'],
    ['/es/laboratorios/scaling/', '/en/labs/scaling/'],
  ])('maps %s to %s', (spanishPath, englishPath) => {
    expect(buildAlternateLocalePath(spanishPath, 'es', 'en')).toBe(englishPath);
  });

  it('falls back to the blog index for posts, whose slugs differ per locale', () => {
    expect(buildAlternateLocalePath('/es/blog/un-articulo/', 'es', 'en')).toBe('/en/content/blog/');
  });
});

describe('content sections', () => {
  it.each([
    ['/es/contenido/blog/', 'es', 'articles'],
    ['/es/blog/un-articulo/', 'es', 'articles'],
    ['/es/contenido/pildoras/', 'es', 'pills'],
    ['/es/pildoras/fundamentos/api/', 'es', 'pills'],
    ['/es/contenido/laboratorios/', 'es', 'labs'],
    ['/es/laboratorios/scaling/', 'es', 'labs'],
    ['/en/content/pills/', 'en', 'pills'],
    ['/en/labs/scaling/', 'en', 'labs'],
  ] as const)('places %s in its section', (pathname, locale, section) => {
    expect(contentSectionOf(pathname, locale)).toBe(section);
  });

  it('leaves the home and the bare content address out of the sections', () => {
    expect(contentSectionOf('/es/', 'es')).toBeNull();
    expect(contentSectionOf('/es/contenido/', 'es')).toBeNull();
  });
});
