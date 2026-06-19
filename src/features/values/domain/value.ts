import type { Locale } from '@/features/shared/domain/locale';

export type Value = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly order: number;
};

export const sortValuesByOrder = (values: readonly Value[]): readonly Value[] =>
  [...values].sort((a, b) => a.order - b.order);
