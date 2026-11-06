import type { Locale } from '@/i18n/locale';
import { copyFor, type LabCopy } from './copy';
import { formatFor, type LabFormat } from './format';

/** Everything a view needs to speak the visitor's language: its words and how it writes numbers. */
export interface LabText {
  readonly copy: LabCopy;
  readonly format: LabFormat;
}

export const labTextFor = (locale: Locale): LabText => {
  const copy = copyFor(locale);
  return { copy, format: formatFor(copy) };
};
