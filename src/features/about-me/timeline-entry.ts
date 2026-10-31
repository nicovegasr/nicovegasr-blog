import type { Locale } from '@/i18n/locale';

export type TimelineEntry = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly place: string;
  readonly organization: string | undefined;
  readonly role: string | undefined;
  readonly sector: string | undefined;
  readonly startDate: Date;
  readonly endDate: Date | undefined;
  readonly summary: string | undefined;
  readonly documentLabel: string | undefined;
  readonly documentUrl: string | undefined;
};
