import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import type { Work } from '@/features/work/work';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

const toWork = (entry: CollectionEntry<'work'>): Work | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    locale: identifier.locale,
    company: entry.data.company,
    companyUrl: entry.data.companyUrl,
    role: entry.data.role,
    location: entry.data.location,
    startDate: entry.data.startDate,
    lastUpdateDate: entry.data.lastUpdateDate,
  };
};

type RenderableWork = {
  work: Work;
  Content: Awaited<ReturnType<typeof render>>['Content'];
};

// Returns the current-work entity plus its rendered markdown body. The only
// place that touches astro:content's render(); the work page consumes both.
export const findRenderableWork = async (
  locale: Locale,
): Promise<RenderableWork | null> => {
  const entries = await getCollection('work');
  const entry = entries.find((candidate) => {
    const identifier = parseLocalizedEntryIdentifier(candidate.id);
    return identifier?.locale === locale;
  });
  if (entry === undefined) {
    return null;
  }

  const work = toWork(entry);
  if (work === null) {
    return null;
  }

  const { Content } = await render(entry);
  return { work, Content };
};
