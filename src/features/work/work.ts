import type { Locale } from '@/i18n/locale';

export type Work = {
  readonly locale: Locale;
  readonly company: string;
  readonly companyUrl: string;
  readonly role: string;
  readonly location: string;
  readonly startDate: Date;
  readonly lastUpdateDate: Date;
};
