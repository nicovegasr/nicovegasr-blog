import type { APIContext } from 'astro';
import type { Locale } from '@/i18n/locale';
import { getTranslator } from '@/i18n/translator';
import { buildBlogPostMarkdownPath, buildPillSeriesPath } from '@/i18n/routes';
import { findHostedPosts } from '@/features/posts/post-repository';
import { findAllPillSeries } from '@/features/pills/pill-repository';
import { asyncChaosLabEntry } from '@/features/labs/async-chaos-lab/catalogue-entry';
import { exit137Entry } from '@/features/labs/exit-137/catalogue-entry';
import { renderLlmsText, type LlmsLink } from '@/shared/discovery/llms-text';

export const GET = async (context: APIContext): Promise<Response> => {
  if (context.site === undefined) {
    throw new Error('The site URL must be configured to build llms.txt.');
  }
  const site = context.site;
  const absolute = (path: string): string => new URL(path, site).toString();

  const articleLinks = async (locale: Locale): Promise<LlmsLink[]> =>
    (await findHostedPosts(locale)).map((post) => ({
      title: post.title,
      url: absolute(buildBlogPostMarkdownPath(locale, post.slug)),
      note: post.summary,
    }));

  const pillLinks = async (locale: Locale): Promise<LlmsLink[]> =>
    (await findAllPillSeries(locale)).map((series) => ({
      title: series.title,
      url: absolute(buildPillSeriesPath(locale, series.slug)),
      note: series.summary,
    }));

  const labLinks = (locale: Locale): LlmsLink[] =>
    [asyncChaosLabEntry(locale), exit137Entry(locale)].map((lab) => ({
      title: lab.title,
      url: absolute(lab.levels[0]?.href ?? '/'),
      note: lab.summary,
    }));

  const text = renderLlmsText({
    name: getTranslator('es')('site.title'),
    summary: getTranslator('en')('site.description'),
    details: [
      'The site is published in Spanish (default, at the root) and English (under /en/).',
      'Every article is also available as plain Markdown by adding .md to its URL; those are the links below.',
    ].join(' '),
    sections: [
      { title: 'Artículos (español)', links: await articleLinks('es') },
      { title: 'Articles (English)', links: await articleLinks('en') },
      { title: 'Píldoras / Pills', links: await pillLinks('es') },
      { title: 'Labs', links: labLinks('en') },
    ],
  });

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
