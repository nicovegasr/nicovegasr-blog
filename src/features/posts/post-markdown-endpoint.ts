import type { Locale } from '@/i18n/locale';
import { buildBlogPostPath } from '@/i18n/routes';
import { AUTHOR } from '@/shared/discovery/author';
import { postsCopy } from './copy';
import { renderPostMarkdown } from './post-markdown';
import { findHostedPosts, findPostSource } from './post-repository';

// Serves /blog/<slug>.md. The per-locale endpoints under pages/ only supply their locale.
export const buildPostMarkdownPaths = async (locale: Locale) =>
  (await findHostedPosts(locale)).map((post) => ({ params: { slug: post.slug } }));

export const buildPostMarkdownResponse = async (
  locale: Locale,
  slug: string | undefined,
  site: URL | undefined,
): Promise<Response> => {
  if (site === undefined) {
    throw new Error('The site URL must be configured to build the Markdown copies.');
  }
  const source = slug === undefined ? null : await findPostSource(locale, slug);
  if (source === null) {
    throw new Error(`Post not found: ${locale}/${slug}`);
  }

  const markdown = renderPostMarkdown({
    post: source.post,
    body: source.markdown,
    url: new URL(buildBlogPostPath(locale, source.post.slug), site).toString(),
    author: AUTHOR.name,
    imageLabel: postsCopy(locale).image,
  });
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
