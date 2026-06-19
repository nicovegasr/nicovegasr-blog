import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import { type Project } from '@/features/projects/project';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

type ProjectEntry = CollectionEntry<'projects'>;

const byCuratedOrder = (a: Project, b: Project): number => a.order - b.order;

const toProject = (entry: ProjectEntry): Project | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    slug: identifier.slug,
    locale: identifier.locale,
    title: entry.data.title,
    pitch: entry.data.pitch,
    origin: entry.data.origin,
    learnings: entry.data.learnings,
    order: entry.data.order,
  };
};

export const findAllProjects = async (
  locale: Locale,
): Promise<readonly Project[]> => {
  const entries = await getCollection('projects');

  return entries
    .map(toProject)
    .filter((project): project is Project => project !== null)
    .filter((project) => project.locale === locale)
    .sort(byCuratedOrder);
};
