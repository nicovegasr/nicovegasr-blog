import type { Locale } from '@/i18n/locale';

export type Value = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly order: number;
};

export const sortValuesByOrder = (values: readonly Value[]): readonly Value[] =>
  [...values].sort((a, b) => a.order - b.order);
