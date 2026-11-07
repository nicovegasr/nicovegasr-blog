import type { Locale } from '@/i18n/locale';

const es = {
  minutesOfReading: 'min de lectura',
};

const en: typeof es = {
  minutesOfReading: 'min read',
};

export const readingTimeCopy = (locale: Locale) => (locale === 'es' ? es : en);
