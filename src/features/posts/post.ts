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

// Posts que comparten más etiquetas con el dado, excluyéndolo. Ordena por
// número de etiquetas compartidas (desc) y, a igualdad, por más reciente.
// Solo cuenta candidatos con al menos una etiqueta en común.
export const selectRelatedPostsByTags = (
  target: Post,
  candidates: readonly Post[],
  limit: number,
): readonly Post[] => {
  const targetTags = new Set(target.tags);

  return candidates
    .filter((candidate) => candidate.slug !== target.slug)
    .map((candidate) => ({
      post: candidate,
      sharedTagCount: candidate.tags.filter((tag) => targetTags.has(tag)).length,
    }))
    .filter((scored) => scored.sharedTagCount > 0)
    .sort(
      (a, b) =>
        b.sharedTagCount - a.sharedTagCount ||
        b.post.publicationDate.getTime() - a.post.publicationDate.getTime(),
    )
    .slice(0, limit)
    .map((scored) => scored.post);
};
