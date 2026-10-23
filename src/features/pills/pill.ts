import type { Locale } from '@/i18n/locale';

export type Pill = {
  readonly series: string;
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly order: number;
  readonly publicationDate: Date;
  readonly lastUpdateDate: Date | undefined;
};

export type PillSeries = {
  readonly draft: boolean;
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
  readonly icon: string;
  readonly order: number;
  readonly publicationDate: Date;
};

// Pill entry ids are "<locale>/<series>/<leaf>", so the series is the first
// slug segment and the leaf is the rest (the URL-facing pill slug).
export const seriesSlugOf = (pillSlug: string): string =>
  pillSlug.split('/')[0] ?? '';

export const pillLeafSlugOf = (pillSlug: string): string =>
  pillSlug.split('/').slice(1).join('/');

export const isPublished = (
  entry: { publicationDate: Date; draft?: boolean },
  now: Date = new Date(),
): boolean => !entry.draft && entry.publicationDate.getTime() <= now.getTime();

const byOrderAscending = (a: Pill, b: Pill): number => a.order - b.order;

export const seriesOrder = (series: readonly PillSeries[]): PillSeries[] =>
  [...series].sort((a, b) => a.order - b.order);

export const railOrder = (pills: readonly Pill[]): Pill[] =>
  [...pills].sort(byOrderAscending);

// Previous/next pill around the current one within an already-ordered rail, so a
// pill page can offer sequential navigation. Undefined at the ends.
export const neighboringPills = (
  orderedPills: readonly Pill[],
  currentSlug: string,
): { previous: Pill | undefined; next: Pill | undefined } => {
  const index = orderedPills.findIndex((pill) => pill.slug === currentSlug);
  if (index === -1) {
    return { previous: undefined, next: undefined };
  }
  return {
    previous: index > 0 ? orderedPills[index - 1] : undefined,
    next: index < orderedPills.length - 1 ? orderedPills[index + 1] : undefined,
  };
};
