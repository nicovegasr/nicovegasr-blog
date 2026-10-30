import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import {
  isHosted,
  isPublished,
  sharedTagCountWith,
  type Post,
} from '@/features/posts/post';
import { calculateReadingTimeInMinutes } from '@/shared/reading-time/reading-time';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

const toPost = (entry: CollectionEntry<'posts'>): Post | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    slug: identifier.slug,
    locale: identifier.locale,
    title: entry.data.title,
    summary: entry.data.summary,
    publicationDate: entry.data.publicationDate,
    lastUpdateDate: entry.data.lastUpdateDate,
    tags: entry.data.tags,
    readingTimeInMinutes:
      entry.data.external?.readingTimeInMinutes ??
      calculateReadingTimeInMinutes(entry.body ?? ''),
    translationSlug: entry.data.translationSlug,
    external: entry.data.external && {
      url: entry.data.external.url,
      publisher: entry.data.external.publisher,
    },
  };
};

const byNewestFirst = (a: Post, b: Post): number =>
  b.publicationDate.getTime() - a.publicationDate.getTime();

export const findAllPosts = async (locale: Locale): Promise<readonly Post[]> => {
  const entries = await getCollection('posts');

  return entries
    .map(toPost)
    .filter((post): post is Post => post !== null)
    .filter((post) => post.locale === locale)
    .filter((post) => isPublished(post))
    .sort(byNewestFirst);
};

export const findHostedPosts = async (locale: Locale): Promise<readonly Post[]> => {
  const posts = await findAllPosts(locale);
  return posts.filter(isHosted);
};

type RenderablePost = {
  post: Post;
  Content: Awaited<ReturnType<typeof render>>['Content'];
};

// Returns the post entity plus its rendered markdown body. The only place that
// touches astro:content's render(); the detail page consumes both together.
export const findRenderablePost = async (
  locale: Locale,
  slug: string,
): Promise<RenderablePost | null> => {
  const entries = await getCollection('posts');
  const entry = entries.find((candidate) => {
    const identifier = parseLocalizedEntryIdentifier(candidate.id);
    return identifier?.locale === locale && identifier.slug === slug;
  });
  if (entry === undefined) {
    return null;
  }

  const post = toPost(entry);
  if (post === null || !isPublished(post) || !isHosted(post)) {
    return null;
  }

  const { Content } = await render(entry);
  return { post, Content };
};

const RELATED_POSTS_LIMIT = 3;

export const findRelatedPosts = async (
  locale: Locale,
  slug: string,
  limit: number = RELATED_POSTS_LIMIT,
): Promise<readonly Post[]> => {
  const posts = await findAllPosts(locale);
  const target = posts.find((post) => post.slug === slug);
  if (target === undefined) {
    return [];
  }

  return posts
    .filter((post) => post.slug !== target.slug)
    .map((post) => ({ post, score: sharedTagCountWith(post, target) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byNewestFirst(a.post, b.post))
    .slice(0, limit)
    .map(({ post }) => post);
};
