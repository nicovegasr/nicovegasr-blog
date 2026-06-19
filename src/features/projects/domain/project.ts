import type { Locale } from '@/features/shared/domain/locale';

export type Project = {
  readonly slug: string;
  readonly locale: Locale;
  readonly title: string;
  readonly pitch: string;
  readonly origin: string;
  readonly learnings: readonly string[];
  readonly order: number;
};

export const sortByOrder = (projects: readonly Project[]): readonly Project[] =>
  [...projects].sort((a, b) => a.order - b.order);
