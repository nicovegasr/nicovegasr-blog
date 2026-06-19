import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import {
  calculateReadingTimeInMinutes,
  isPublished,
  type Post,
} from '@/features/posts/post';
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
    readingTimeInMinutes: calculateReadingTimeInMinutes(entry.body ?? ''),
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

export const findPostBySlug = async (
  locale: Locale,
  slug: string,
): Promise<Post | null> => {
  const posts = await findAllPosts(locale);
  return posts.find((post) => post.slug === slug) ?? null;
};
