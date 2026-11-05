import { describe, expect, it } from 'vitest';
import type { Post } from '@/features/posts/post';
import { findSeriesPositions } from '@/features/posts/post-series';

const post = (slug: string, title: string, date: string): Post => ({
  slug,
  locale: 'es',
  title,
  summary: 'Resumen de prueba suficientemente largo.',
  publicationDate: new Date(date),
  lastUpdateDate: undefined,
  tags: [],
  readingTimeInMinutes: 5,
  translationSlug: undefined,
  external: undefined,
});

describe('post series', () => {
  const posts = [
    post('advice', 'Spring Batch — Consejos prácticos', '2025-06-06'),
    post('gradle', 'Gradle — Velocidad y control', '2025-05-21'),
    post('intro', 'Spring Batch — Introducción', '2025-05-28'),
    post('atomicity', 'Garantizar la atomicidad', '2026-10-09'),
  ];
  const positions = findSeriesPositions(posts);

  it('numbers chapters of a shared prefix by publication date', () => {
    expect(positions.get('intro')).toEqual({ name: 'Spring Batch', chapterTitle: 'Introducción', number: 1, total: 2 });
    expect(positions.get('advice')).toEqual({ name: 'Spring Batch', chapterTitle: 'Consejos prácticos', number: 2, total: 2 });
  });

  it('leaves a lone prefixed title and plain titles outside any series', () => {
    expect(positions.has('gradle')).toBe(false);
    expect(positions.has('atomicity')).toBe(false);
  });
});
