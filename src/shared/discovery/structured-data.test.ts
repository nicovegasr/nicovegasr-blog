import { describe, expect, it } from 'vitest';
import { buildArticleGraph, buildSiteGraph, serializeJsonLd } from '@/shared/discovery/structured-data';

const SITE_URL = 'https://example.com';

describe('buildSiteGraph', () => {
  it('describes the website and its author, linked by @id', () => {
    const graph = buildSiteGraph({ siteUrl: SITE_URL, name: 'Site', description: 'About', language: 'es' });
    const [website, person] = graph['@graph'] as Record<string, unknown>[];

    expect(website).toMatchObject({ '@type': 'WebSite', url: 'https://example.com/', inLanguage: 'es' });
    expect(website?.publisher).toEqual({ '@id': 'https://example.com/#person' });
    expect(person).toMatchObject({ '@type': 'Person', '@id': 'https://example.com/#person' });
    expect(person?.sameAs).toContain('https://github.com/nicovegasr');
  });
});

describe('buildArticleGraph', () => {
  const article = {
    siteUrl: SITE_URL,
    url: 'https://example.com/blog/a-post/',
    headline: 'A post',
    description: 'What the post is about',
    language: 'en',
    publicationDate: new Date('2026-01-02T10:00:00Z'),
    lastUpdateDate: undefined,
    keywords: ['docker', 'kafka'],
    imageUrl: 'https://example.com/og.png',
  };

  it('uses the publication date as the modification date when the post was never updated', () => {
    const graph = buildArticleGraph(article);

    expect(graph).toMatchObject({ '@type': 'BlogPosting', datePublished: '2026-01-02', dateModified: '2026-01-02' });
    expect(graph.keywords).toBe('docker, kafka');
    expect(graph.author).toEqual({ '@id': 'https://example.com/#person' });
  });

  it('reports the last update when there is one', () => {
    const graph = buildArticleGraph({ ...article, lastUpdateDate: new Date('2026-03-04') });

    expect(graph.dateModified).toBe('2026-03-04');
  });
});

describe('serializeJsonLd', () => {
  it('escapes "<" so a value cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).toBe('{"name":"\\u003c/script>\\u003cb>"}');
  });
});
