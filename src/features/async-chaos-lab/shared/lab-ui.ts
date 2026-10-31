export const button = (action: string, label: string, attributes = '') =>
  `<button type="button" data-action="${action}"${attributes ? ` ${attributes}` : ''}>${label}</button>`;

export const isSpanishLab = (lab: HTMLElement) => lab.dataset.locale !== 'en';

export const inLanguage = (spanish: boolean, es: string, en: string) => (spanish ? es : en);
