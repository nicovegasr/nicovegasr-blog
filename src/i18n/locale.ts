export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  es: 'es_ES',
  en: 'en_US',
};

export const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

/** Reads a locale from untrusted text, such as a `data-locale` attribute. */
export const localeFrom = (value: string | undefined): Locale =>
  value !== undefined && isLocale(value) ? value : DEFAULT_LOCALE;

/** The site has two languages: the translation of a page lives in the other one. */
export const otherLocale = (locale: Locale): Locale => (locale === 'es' ? 'en' : 'es');
