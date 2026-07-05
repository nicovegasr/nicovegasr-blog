import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import {
  hasSummaryBody,
  isPublished,
  pillLeafSlugOf,
  railOrder,
  seriesSlugOf,
  type Pill,
  type PillSeries,
} from '@/features/pills/pill';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';

type PillEntry = CollectionEntry<'pills'>;
type SeriesEntry = PillEntry & { data: { kind: 'series' } };
type PillItemEntry = PillEntry & { data: { kind: 'pill' } };

const isSeriesEntry = (entry: PillEntry): entry is SeriesEntry =>
  entry.data.kind === 'series';
const isPillEntry = (entry: PillEntry): entry is PillItemEntry =>
  entry.data.kind === 'pill';

const toPillSeries = (entry: SeriesEntry): PillSeries | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }
  return {
    slug: seriesSlugOf(identifier.slug),
    locale: identifier.locale,
    title: entry.data.title,
    summary: entry.data.summary,
    icon: entry.data.icon,
    publicationDate: entry.data.publicationDate,
  };
};

const toPill = (entry: PillItemEntry): Pill | null => {
  const identifier = parseLocalizedEntryIdentifier(entry.id);
  if (identifier === null) {
    return null;
  }
  return {
    series: seriesSlugOf(identifier.slug),
    slug: identifier.slug,
    locale: identifier.locale,
    title: entry.data.title,
    subtitle: entry.data.subtitle,
    icon: entry.data.icon,
    order: entry.data.order,
    bonus: entry.data.bonus,
    publicationDate: entry.data.publicationDate,
    lastUpdateDate: entry.data.lastUpdateDate,
  };
};

const byNewestFirst = (a: PillSeries, b: PillSeries): number =>
  b.publicationDate.getTime() - a.publicationDate.getTime();

const publishedPillsOf = async (
  locale: Locale,
  series: string,
): Promise<Pill[]> => {
  const entries = await getCollection('pills');
  const pills = entries
    .filter(isPillEntry)
    .map(toPill)
    .filter((pill): pill is Pill => pill !== null)
    .filter((pill) => pill.locale === locale && pill.series === series)
    .filter((pill) => isPublished(pill));
  return railOrder(pills);
};

export const findAllPillSeries = async (
  locale: Locale,
): Promise<readonly PillSeries[]> => {
  const entries = await getCollection('pills');
  return entries
    .filter(isSeriesEntry)
    .map(toPillSeries)
    .filter((series): series is PillSeries => series !== null)
    .filter((series) => series.locale === locale)
    .filter((series) => isPublished(series))
    .sort(byNewestFirst);
};

export const findAllPublishedPills = async (
  locale: Locale,
): Promise<readonly { series: string; pill: string }[]> => {
  const entries = await getCollection('pills');
  return entries
    .filter(isPillEntry)
    .map(toPill)
    .filter((pill): pill is Pill => pill !== null)
    .filter((pill) => pill.locale === locale)
    .filter((pill) => isPublished(pill))
    .map((pill) => ({ series: pill.series, pill: pillLeafSlugOf(pill.slug) }));
};

type RenderableSeries = {
  series: PillSeries;
  pills: readonly Pill[];
  hasSummary: boolean;
  SummaryContent: Awaited<ReturnType<typeof render>>['Content'];
};

// Returns the series plus its rendered markdown body (the summary). The only
// place that renders the series body; the page consumes both together.
export const findRenderablePillSeries = async (
  locale: Locale,
  series: string,
): Promise<RenderableSeries | null> => {
  const entries = await getCollection('pills');
  const entry = entries.filter(isSeriesEntry).find((candidate) => {
    const identifier = parseLocalizedEntryIdentifier(candidate.id);
    return (
      identifier?.locale === locale && seriesSlugOf(identifier.slug) === series
    );
  });
  if (entry === undefined) {
    return null;
  }

  const pillSeries = toPillSeries(entry);
  if (pillSeries === null || !isPublished(pillSeries)) {
    return null;
  }

  const { Content } = await render(entry);
  return {
    series: pillSeries,
    pills: await publishedPillsOf(locale, series),
    hasSummary: hasSummaryBody(entry.body ?? ''),
    SummaryContent: Content,
  };
};

type RenderablePill = {
  pill: Pill;
  Content: Awaited<ReturnType<typeof render>>['Content'];
  seriesTitle: string;
  stops: readonly Pill[];
};

export const findRenderablePill = async (
  locale: Locale,
  series: string,
  pillLeaf: string,
): Promise<RenderablePill | null> => {
  const entries = await getCollection('pills');
  const entry = entries.filter(isPillEntry).find((candidate) => {
    const identifier = parseLocalizedEntryIdentifier(candidate.id);
    return (
      identifier?.locale === locale &&
      seriesSlugOf(identifier.slug) === series &&
      pillLeafSlugOf(identifier.slug) === pillLeaf
    );
  });
  if (entry === undefined) {
    return null;
  }

  const pill = toPill(entry);
  if (pill === null || !isPublished(pill)) {
    return null;
  }

  const pillSeries = (await findAllPillSeries(locale)).find(
    (candidate) => candidate.slug === series,
  );

  const { Content } = await render(entry);
  return {
    pill,
    Content,
    seriesTitle: pillSeries?.title ?? series,
    stops: await publishedPillsOf(locale, series),
  };
};
