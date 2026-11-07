import { localeFrom, type Locale } from '@/i18n/locale';

export const button = (action: string, label: string, attributes = '') =>
  `<button type="button" data-action="${action}"${attributes ? ` ${attributes}` : ''}>${label}</button>`;

export const labLocale = (lab: HTMLElement): Locale => localeFrom(lab.dataset.locale);
