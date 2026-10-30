import type { Locale } from '@/i18n/locale';

export type TimelineEntryKind = 'work' | 'personal';

export type TimelineEntry = {
  readonly slug: string;
  readonly locale: Locale;
  readonly kind: TimelineEntryKind;
  readonly title: string;
  readonly role: string | undefined;
  readonly sector: string | undefined;
  readonly startDate: Date;
  readonly endDate: Date | undefined;
  readonly summary: string;
};

export const isCurrentRole = (entry: TimelineEntry): boolean =>
  entry.kind === 'work' && entry.endDate === undefined;
