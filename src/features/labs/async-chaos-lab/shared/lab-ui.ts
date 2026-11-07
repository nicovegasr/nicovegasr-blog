import type { Locale } from '@/i18n/locale';

export const button = (action: string, label: string, attributes = '') =>
  `<button type="button" data-action="${action}"${attributes ? ` ${attributes}` : ''}>${label}</button>`;

export const labLocale = (lab: HTMLElement): Locale => (lab.dataset.locale === 'en' ? 'en' : 'es');

export const isSpanishLab = (lab: HTMLElement) => labLocale(lab) === 'es';

export const inLanguage = (spanish: boolean, es: string, en: string) => (spanish ? es : en);
