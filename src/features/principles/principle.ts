import type { Locale } from '@/i18n/locale';

export type Principle = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly order: number;
};
