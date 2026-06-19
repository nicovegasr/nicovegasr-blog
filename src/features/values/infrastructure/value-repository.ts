import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/features/shared/domain/locale';
import { sortValuesByOrder, type Value } from '@/features/values/domain/value';
import { parseLocalizedEntryIdentifier } from '@/features/shared/infrastructure/entry-identifier';

type ValueEntry = CollectionEntry<'values'>;

const toValue = (entry: ValueEntry): Value | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }

  return {
    slug: identifier.slug,
    locale: identifier.locale,
    title: entry.data.title,
    order: entry.data.order,
  };
};

export const findAllValues = async (
  locale: Locale,
): Promise<readonly Value[]> => {
  const entries = await getCollection('values');
  const values = entries
    .map(toValue)
    .filter((value): value is Value => value !== null)
    .filter((value) => value.locale === locale);

  return sortValuesByOrder(values);
};
