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
};

const WORDS_PER_MINUTE_AVERAGE = 220;

export const calculateReadingTimeInMinutes = (rawText: string): number => {
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE_AVERAGE));
};

export const isPublished = (post: Post, now: Date = new Date()): boolean =>
  post.publicationDate.getTime() <= now.getTime();
