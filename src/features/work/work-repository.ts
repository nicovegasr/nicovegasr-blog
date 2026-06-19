import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import type { Work } from '@/features/work/work';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

type WorkEntry = CollectionEntry<'work'>;

const toWork = (entry: WorkEntry): Work | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    locale: identifier.locale,
    company: entry.data.company,
    headline: entry.data.headline,
    lastUpdateDate: entry.data.lastUpdateDate,
  };
};

export const findWork = async (locale: Locale): Promise<Work | null> => {
  const entries = await getCollection('work');
  const entry = entries.find((candidate) => {
    const identifier = parseLocalizedEntryIdentifier(candidate.id);
    return identifier?.locale === locale;
  });

  return entry === undefined ? null : toWork(entry);
};
