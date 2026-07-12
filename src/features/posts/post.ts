import type { Locale } from '@/i18n/locale';

export type Post = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
  readonly publicationDate: Date;
  readonly lastUpdateDate: Date | undefined;
  readonly tags: readonly string[];
  readonly readingTimeInMinutes: number;
  readonly translationSlug: string | undefined;
};

export const isPublished = (post: Post, now: Date = new Date()): boolean =>
  post.publicationDate.getTime() <= now.getTime();

export const sharedTagCountWith = (post: Post, other: Post): number =>
  post.tags.filter((tag) => other.tags.includes(tag)).length;

export const searchableText = (post: Post): string =>
  [post.title, post.summary, ...post.tags].join(' ').toLowerCase();
