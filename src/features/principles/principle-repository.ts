import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import { type Principle } from '@/features/principles/principle';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

type PrincipleEntry = CollectionEntry<'principles'>;

const byCuratedOrder = (a: Principle, b: Principle): number => a.order - b.order;

const toPrinciple = (entry: PrincipleEntry): Principle | null => {
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

export const findAllPrinciples = async (
  locale: Locale,
): Promise<readonly Principle[]> => {
  const entries = await getCollection('principles');

  return entries
    .map(toPrinciple)
    .filter((principle): principle is Principle => principle !== null)
    .filter((principle) => principle.locale === locale)
    .sort(byCuratedOrder);
};
