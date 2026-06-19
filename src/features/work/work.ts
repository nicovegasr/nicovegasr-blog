import type { Locale } from '@/i18n/locale';

export type Work = {
  readonly locale: Locale;
  readonly company: string;
  readonly headline: string;
  readonly lastUpdateDate: Date;
};
