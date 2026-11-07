import type { Locale } from '@/i18n/locale';
import type { LabEntry } from '@/features/labs/catalogue/lab-entry';
import { labPath } from './shared/links';
import { labPagesCopy } from './shared/lab-pages-copy';

export function asyncChaosLabEntry(locale: Locale): LabEntry {
  const text = labPagesCopy(locale);
  return {
    id: 'async-chaos-lab',
    title: 'Async Chaos Lab',
    label: text.catalogueLabel,
    summary: text.catalogueSummary,
    caption: text.catalogueCaption,
    levelCount: text.catalogueLevelCount,
    levels: [
      { title: text.queueTitle, href: labPath(locale, 1) },
      { title: text.workerStepsTitle, href: labPath(locale, 2) },
      { title: text.scalingTitle, href: labPath(locale, 3) },
    ],
  };
}
