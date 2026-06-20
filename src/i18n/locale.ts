export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
};

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);
