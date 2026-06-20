import rss from '@astrojs/rss';
import type { Locale } from '@/i18n/locale';
import { getTranslator } from '@/i18n/translator';
import { buildBlogPostPath } from '@/i18n/routes';
import { findAllPosts } from '@/features/posts/post-repository';

// Builds the localized blog RSS feed. The per-locale endpoints under pages/
// only supply their locale and the configured site URL.
export const buildPostsRssFeed = async (
  locale: Locale,
  site: string | URL | undefined,
): Promise<Response> => {
  if (site === undefined) {
    throw new Error('The site URL must be configured to build the RSS feed.');
  }

  const translate = getTranslator(locale);
  const posts = await findAllPosts(locale);

  return rss({
    title: translate('site.title'),
    description: translate('site.description'),
    site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.summary,
      pubDate: post.publicationDate,
      link: buildBlogPostPath(post.locale, post.slug),
    })),
  });
};
