import { describe, expect, it } from 'vitest';
import { buildAlternateLocalePath, buildLabPath, buildPagePath, buildPillPath, contentSectionOf } from '@/i18n/routes';

describe('page paths', () => {
  it('serves the home at the locale root and the content sections under it', () => {
    expect(buildPagePath('home', 'es')).toBe('/');
    expect(buildPagePath('pills', 'es')).toBe('/contenido/pildoras/');
    expect(buildPagePath('articles', 'es')).toBe('/contenido/blog/');
    expect(buildPagePath('labs', 'es')).toBe('/contenido/laboratorios/');
    expect(buildPagePath('pills', 'en')).toBe('/en/content/pills/');
    expect(buildPagePath('articles', 'en')).toBe('/en/content/blog/');
    expect(buildPagePath('labs', 'en')).toBe('/en/content/labs/');
  });

  it('keeps published detail pages at their original URLs', () => {
    expect(buildPillPath('es', 'fundamentos', 'api')).toBe('/pildoras/fundamentos/api/');
    expect(buildLabPath('en', 'scaling')).toBe('/en/labs/scaling/');
  });
});

describe('alternate locale paths', () => {
  it.each([
    ['/', '/en/'],
    ['/contenido/pildoras/', '/en/content/pills/'],
    ['/contenido/blog/', '/en/content/blog/'],
    ['/contenido/laboratorios/', '/en/content/labs/'],
    ['/pildoras/fundamentos/api/', '/en/pills/fundamentos/api/'],
    ['/laboratorios/scaling/', '/en/labs/scaling/'],
  ])('maps %s to %s', (spanishPath, englishPath) => {
    expect(buildAlternateLocalePath(spanishPath, 'es', 'en')).toBe(englishPath);
  });

  it('falls back to the blog index for posts, whose slugs differ per locale', () => {
    expect(buildAlternateLocalePath('/blog/un-articulo/', 'es', 'en')).toBe('/en/content/blog/');
  });
});

describe('content sections', () => {
  it.each([
    ['/contenido/blog/', 'es', 'articles'],
    ['/blog/un-articulo/', 'es', 'articles'],
    ['/contenido/pildoras/', 'es', 'pills'],
    ['/pildoras/fundamentos/api/', 'es', 'pills'],
    ['/contenido/laboratorios/', 'es', 'labs'],
    ['/laboratorios/scaling/', 'es', 'labs'],
    ['/en/content/pills/', 'en', 'pills'],
    ['/en/labs/scaling/', 'en', 'labs'],
  ] as const)('places %s in its section', (pathname, locale, section) => {
    expect(contentSectionOf(pathname, locale)).toBe(section);
  });

  it('leaves the home and the bare content address out of the sections', () => {
    expect(contentSectionOf('/', 'es')).toBeNull();
    expect(contentSectionOf('/contenido/', 'es')).toBeNull();
  });
});
