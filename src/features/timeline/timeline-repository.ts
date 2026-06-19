import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import { type TimelineEntry } from '@/features/timeline/timeline-entry';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

type TimelineCollectionEntry = CollectionEntry<'timeline'>;

const byStartDateDescending = (a: TimelineEntry, b: TimelineEntry): number =>
  b.startDate.getTime() - a.startDate.getTime();

const toTimelineEntry = (
  entry: TimelineCollectionEntry,
): TimelineEntry | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    slug: identifier.slug,
    locale: identifier.locale,
    company: entry.data.company,
    role: entry.data.role,
    sector: entry.data.sector,
    startDate: entry.data.startDate,
    endDate: entry.data.endDate,
    summary: entry.data.summary,
  };
};

export const findAllTimelineEntries = async (
  locale: Locale,
): Promise<readonly TimelineEntry[]> => {
  const entries = await getCollection('timeline');

  return entries
    .map(toTimelineEntry)
    .filter((entry): entry is TimelineEntry => entry !== null)
    .filter((entry) => entry.locale === locale)
    .sort(byStartDateDescending);
};
