import type { Locale } from '@/features/shared/domain/locale';

export type Work = {
  readonly locale: Locale;
  readonly company: string;
  readonly headline: string;
  readonly lastUpdateDate: Date;
};
