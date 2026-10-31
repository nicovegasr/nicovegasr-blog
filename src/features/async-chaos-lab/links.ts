import type { Locale } from '@/i18n/locale';
import { buildLabPath, buildPagePath } from '@/i18n/routes';

export const labsPath = (locale: Locale) => buildPagePath('labs', locale);
export const labPath = (locale: Locale, level: 1 | 2 | 3 = 1) =>
  buildLabPath(locale, ({ 1: 'async-chaos-lab', 2: 'worker-steps', 3: 'scaling' } as const)[level]);
