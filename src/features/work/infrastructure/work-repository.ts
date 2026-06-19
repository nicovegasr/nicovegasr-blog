import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/features/shared/domain/locale';
import type { Work } from '@/features/work/domain/work';
import { parseLocalizedEntryIdentifier } from '@/features/shared/infrastructure/entry-identifier';

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

const findWorkEntry = async (locale: Locale): Promise<WorkEntry | null> => {
  const entries = await getCollection('work');
  return (
    entries.find((entry) => {
      const identifier = parseLocalizedEntryIdentifier(entry.id);
      return identifier?.locale === locale;
    }) ?? null
  );
};

export const findWork = async (locale: Locale): Promise<Work | null> => {
  const entry = await findWorkEntry(locale);
  return entry === null ? null : toWork(entry);
};

export const renderWorkContent = async (locale: Locale) => {
  const entry = await findWorkEntry(locale);
  return entry === null ? null : render(entry);
};
