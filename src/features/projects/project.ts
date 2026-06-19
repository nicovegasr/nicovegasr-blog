import type { Locale } from '@/i18n/locale';

export type Project = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly pitch: string;
  readonly origin: string;
  readonly learnings: readonly string[];
  readonly order: number;
};
