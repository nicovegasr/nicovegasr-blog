import type { Post } from '@/features/posts/post';

export type SeriesPosition = {
  readonly name: string;
  readonly chapterTitle: string;
  readonly number: number;
  readonly total: number;
};

const SERIES_SEPARATOR = ' — ';

const splitTitle = (title: string) => {
  const separatorIndex = title.indexOf(SERIES_SEPARATOR);
  return separatorIndex > 0
    ? { name: title.slice(0, separatorIndex), chapterTitle: title.slice(separatorIndex + SERIES_SEPARATOR.length) }
    : undefined;
};

/**
 * A series is a title prefix ("Spring Batch — …") shared by two or more posts;
 * chapters are numbered by publication date. A lone "Gradle — …" is just a title.
 */
export const findSeriesPositions = (posts: readonly Post[]): ReadonlyMap<string, SeriesPosition> => {
  const chaptersBySeries = new Map<string, { post: Post; chapterTitle: string }[]>();
  for (const post of posts) {
    const parts = splitTitle(post.title);
    if (!parts) continue;
    const chapters = chaptersBySeries.get(parts.name) ?? [];
    chapters.push({ post, chapterTitle: parts.chapterTitle });
    chaptersBySeries.set(parts.name, chapters);
  }
  const positions = new Map<string, SeriesPosition>();
  for (const [name, chapters] of chaptersBySeries) {
    if (chapters.length < 2) continue;
    chapters
      .sort((first, second) => first.post.publicationDate.getTime() - second.post.publicationDate.getTime())
      .forEach(({ post, chapterTitle }, index) => {
        positions.set(post.slug, { name, chapterTitle, number: index + 1, total: chapters.length });
      });
  }
  return positions;
};
