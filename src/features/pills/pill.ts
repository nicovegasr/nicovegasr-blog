import type { Locale } from '@/i18n/locale';

export type Pill = {
  readonly series: string;
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly order: number;
  readonly bonus: boolean;
  readonly publicationDate: Date;
  readonly lastUpdateDate: Date | undefined;
};

export type PillSeries = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
  readonly icon: string;
  readonly publicationDate: Date;
};

// Pill entry ids are "<locale>/<series>/<leaf>", so the series is the first
// slug segment and the leaf is the rest (the URL-facing pill slug).
export const seriesSlugOf = (pillSlug: string): string =>
  pillSlug.split('/')[0] ?? '';

export const pillLeafSlugOf = (pillSlug: string): string =>
  pillSlug.split('/').slice(1).join('/');

export const isPublished = (
  entry: { publicationDate: Date },
  now: Date = new Date(),
): boolean => entry.publicationDate.getTime() <= now.getTime();

const byOrderAscending = (a: Pill, b: Pill): number => a.order - b.order;

// The rail reads as a guided path: core pills first (by order), then bonus
// pills (by order). The summary stop is appended by the component, not here.
export const railOrder = (pills: readonly Pill[]): Pill[] => {
  const core = pills.filter((pill) => !pill.bonus).sort(byOrderAscending);
  const bonus = pills.filter((pill) => pill.bonus).sort(byOrderAscending);
  return [...core, ...bonus];
};

// The series summary only exists once its markdown body has real content; a body
// that is empty or only HTML comments (author notes) yields no summary stop.
export const hasSummaryBody = (body: string): boolean =>
  body.replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;

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
