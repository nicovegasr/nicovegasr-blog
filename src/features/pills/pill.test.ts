import { describe, expect, it } from 'vitest';
import {
  isPublished,
  neighboringPills,
  pillLeafSlugOf,
  railOrder,
  seriesOrder,
  seriesSlugOf,
  type Pill,
  type PillSeries,
} from '@/features/pills/pill';

const buildPill = (overrides: Partial<Pill> = {}): Pill => ({
  series: 'docker',
  slug: 'docker/intro',
  locale: 'es',
  title: 'Intro',
  subtitle: 'qué es',
  icon: 'container',
  order: 1,
  systemMapStage: undefined,
  publicationDate: new Date('2026-01-01'),
  lastUpdateDate: undefined,
  ...overrides,
});

const buildSeries = (overrides: Partial<PillSeries> = {}): PillSeries => ({
  slug: 'docker',
  locale: 'es',
  title: 'Docker',
  summary: 'Conceptos básicos de Docker.',
  draft: false,
  icon: 'whale',
  order: 2,
  publicationDate: new Date('2026-01-01'),
  ...overrides,
});

describe('seriesOrder', () => {
  it('sorts series by their explicit learning order', () => {
    const series = [
      buildSeries({ slug: 'observabilidad', order: 3 }),
      buildSeries({ slug: 'fundamentos', order: 1 }),
      buildSeries({ slug: 'docker', order: 2 }),
    ];

    expect(seriesOrder(series).map((item) => item.slug)).toEqual([
      'fundamentos',
      'docker',
      'observabilidad',
    ]);
  });
});

describe('railOrder', () => {
  it('sorts pills by order', () => {
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
});

describe('seriesSlugOf / pillLeafSlugOf', () => {
  it('splits the series from the pill leaf', () => {
    expect(seriesSlugOf('docker/dockerfile')).toBe('docker');
    expect(pillLeafSlugOf('docker/dockerfile')).toBe('dockerfile');
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
