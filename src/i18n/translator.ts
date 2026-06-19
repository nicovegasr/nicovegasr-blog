import type { Locale } from '@/i18n/locale';
import { spanish, type Dictionary, type TranslationKey } from '@/i18n/es';
import { english } from '@/i18n/en';

const DICTIONARY_BY_LOCALE: Record<Locale, Dictionary> = {
  es: spanish,
  en: english,
};

export type Translate = (key: TranslationKey) => string;

// Keys are checked at compile time: a missing key fails the build instead of
// silently rendering an empty string at runtime.
export const getTranslator = (locale: Locale): Translate => {
  const dictionary = DICTIONARY_BY_LOCALE[locale];
  return (key) => dictionary[key];
};
