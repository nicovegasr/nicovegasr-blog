import type { Locale } from '@/features/shared/domain/locale';

export type TimelineEntry = {
  readonly slug: string;
  readonly locale: Locale;
  readonly company: string;
  readonly role: string;
  readonly sector: string | undefined;
  readonly startDate: Date;
  readonly endDate: Date | undefined;
  readonly summary: string;
};

export const isCurrentRole = (entry: TimelineEntry): boolean =>
  entry.endDate === undefined;

export const sortByStartDateDescending = (
  entries: readonly TimelineEntry[],
): readonly TimelineEntry[] =>
  [...entries].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
