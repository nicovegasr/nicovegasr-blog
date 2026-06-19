import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/features/shared/domain/locale';
import { sortByOrder, type Project } from '@/features/projects/domain/project';
import { parseLocalizedEntryIdentifier } from '@/features/shared/infrastructure/entry-identifier';

type ProjectEntry = CollectionEntry<'projects'>;

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
  const projects = entries
    .map(toProject)
    .filter((project): project is Project => project !== null)
    .filter((project) => project.locale === locale);

  return sortByOrder(projects);
};
