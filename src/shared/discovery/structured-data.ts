import { AUTHOR } from './author';

// schema.org graphs for search engines and agents. Every node points at the same
// Person and WebSite through their @id, so Google ties each article to its author.

type JsonLdNode = Readonly<Record<string, unknown>>;

const SCHEMA_CONTEXT = 'https://schema.org';

const absoluteUrl = (path: string, siteUrl: string): string => new URL(path, siteUrl).toString();
const personId = (siteUrl: string): string => absoluteUrl('/#person', siteUrl);
const websiteId = (siteUrl: string): string => absoluteUrl('/#website', siteUrl);
const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export type SiteDescription = {
  siteUrl: string;
  name: string;
  description: string;
  language: string;
};

export const buildSiteGraph = (site: SiteDescription): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': websiteId(site.siteUrl),
      url: absoluteUrl('/', site.siteUrl),
      name: site.name,
      description: site.description,
      inLanguage: site.language,
      publisher: { '@id': personId(site.siteUrl) },
    },
    {
      '@type': 'Person',
      '@id': personId(site.siteUrl),
      name: AUTHOR.name,
      url: absoluteUrl('/', site.siteUrl),
      image: absoluteUrl(AUTHOR.portraitPath, site.siteUrl),
      sameAs: Object.values(AUTHOR.profiles),
    },
  ],
});

export type ArticleDescription = {
  siteUrl: string;
  url: string;
  headline: string;
  description: string;
  language: string;
  publicationDate: Date;
  lastUpdateDate: Date | undefined;
  keywords: readonly string[];
  imageUrl: string;
};

export const buildArticleGraph = (article: ArticleDescription): JsonLdNode => ({
  '@context': SCHEMA_CONTEXT,
  '@type': 'BlogPosting',
  '@id': `${article.url}#article`,
  mainEntityOfPage: article.url,
  url: article.url,
  headline: article.headline,
  description: article.description,
  inLanguage: article.language,
  datePublished: isoDate(article.publicationDate),
  dateModified: isoDate(article.lastUpdateDate ?? article.publicationDate),
  keywords: article.keywords.join(', '),
  image: article.imageUrl,
  author: { '@id': personId(article.siteUrl) },
  publisher: { '@id': personId(article.siteUrl) },
  isPartOf: { '@id': websiteId(article.siteUrl) },
});

// Inline JSON inside <script> must not be able to close the tag.
export const serializeJsonLd = (node: JsonLdNode): string => JSON.stringify(node).replaceAll('<', '\\u003c');
