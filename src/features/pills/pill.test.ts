import { describe, expect, it } from 'vitest';
import {
  hasSummaryBody,
  isPublished,
  neighboringPills,
  pillLeafSlugOf,
  railOrder,
  seriesSlugOf,
  type Pill,
} from '@/features/pills/pill';

const buildPill = (overrides: Partial<Pill> = {}): Pill => ({
  series: 'docker',
  slug: 'docker/intro',
  locale: 'es',
  title: 'Intro',
  subtitle: 'qué es',
  icon: 'container',
  order: 1,
  bonus: false,
  publicationDate: new Date('2026-01-01'),
  lastUpdateDate: undefined,
  ...overrides,
});

describe('railOrder', () => {
  it('sorts core pills by order', () => {
    const pills = [
      buildPill({ slug: 'docker/b', order: 2 }),
      buildPill({ slug: 'docker/a', order: 1 }),
      buildPill({ slug: 'docker/c', order: 3 }),
    ];
    expect(railOrder(pills).map((pill) => pill.slug)).toEqual([
      'docker/a',
      'docker/b',
      'docker/c',
    ]);
  });

  it('places bonus pills after every core pill, regardless of order', () => {
    const pills = [
      buildPill({ slug: 'docker/bonus', order: 0, bonus: true }),
      buildPill({ slug: 'docker/core', order: 5, bonus: false }),
    ];
    expect(railOrder(pills).map((pill) => pill.slug)).toEqual([
      'docker/core',
      'docker/bonus',
    ]);
  });

  it('sorts bonus pills among themselves by order', () => {
    const pills = [
      buildPill({ slug: 'docker/core', order: 1 }),
      buildPill({ slug: 'docker/bonus-2', order: 2, bonus: true }),
      buildPill({ slug: 'docker/bonus-1', order: 1, bonus: true }),
    ];
    expect(railOrder(pills).map((pill) => pill.slug)).toEqual([
      'docker/core',
      'docker/bonus-1',
      'docker/bonus-2',
    ]);
  });
});

describe('seriesSlugOf / pillLeafSlugOf', () => {
  it('splits the series from the pill leaf', () => {
    expect(seriesSlugOf('docker/dockerfile')).toBe('docker');
    expect(pillLeafSlugOf('docker/dockerfile')).toBe('dockerfile');
  });
});

describe('hasSummaryBody', () => {
  it('is false for empty, whitespace-only or comment-only bodies', () => {
    expect(hasSummaryBody('')).toBe(false);
    expect(hasSummaryBody('  \n  ')).toBe(false);
    expect(hasSummaryBody('<!-- pendiente de escribir -->')).toBe(false);
  });

  it('is true when there is real content', () => {
    expect(hasSummaryBody('Resumen de la serie')).toBe(true);
  });
});

describe('neighboringPills', () => {
  const ordered = [
    buildPill({ slug: 'docker/a' }),
    buildPill({ slug: 'docker/b' }),
    buildPill({ slug: 'docker/c' }),
  ];

  it('returns both neighbors in the middle', () => {
    const { previous, next } = neighboringPills(ordered, 'docker/b');
    expect(previous?.slug).toBe('docker/a');
    expect(next?.slug).toBe('docker/c');
  });

  it('has no previous at the start and no next at the end', () => {
    expect(neighboringPills(ordered, 'docker/a').previous).toBeUndefined();
    expect(neighboringPills(ordered, 'docker/c').next).toBeUndefined();
  });

  it('returns no neighbors when the slug is not in the sequence', () => {
    expect(neighboringPills(ordered, 'docker/x')).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

describe('isPublished', () => {
  it('hides entries dated in the future', () => {
    const now = new Date('2026-01-10');
    expect(
      isPublished({ publicationDate: new Date('2026-01-20') }, now),
    ).toBe(false);
    expect(
      isPublished({ publicationDate: new Date('2026-01-01') }, now),
    ).toBe(true);
  });
});
