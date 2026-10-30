import type { Locale } from '@/i18n/locale';
import { buildBlogPostPath } from '@/i18n/routes';

export type ExternalPublication = {
  readonly url: string;
  readonly publisher: string;
};

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
  readonly external: ExternalPublication | undefined;
};

export const isPublished = (post: Post, now: Date = new Date()): boolean =>
  post.publicationDate.getTime() <= now.getTime();

export const isHosted = (post: Post): boolean => post.external === undefined;

export const buildPostLink = (post: Post): string =>
  post.external?.url ?? buildBlogPostPath(post.locale, post.slug);

export const sharedTagCountWith = (post: Post, other: Post): number =>
  post.tags.filter((tag) => other.tags.includes(tag)).length;

export const searchableText = (post: Post): string =>
  [post.title, post.summary, ...post.tags].join(' ').toLowerCase();
