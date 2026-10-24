import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/i18n/locale';
import {
  isPublished,
  pillLeafSlugOf,
  railOrder,
  seriesOrder,
  seriesSlugOf,
  type Pill,
  type PillSeries,
} from '@/features/pills/pill';
import { parseLocalizedEntryIdentifier } from '@/i18n/entry-identifier';
import { calculateReadingTimeInMinutes } from '@/shared/reading-time/reading-time';

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
    draft: entry.data.draft,
    icon: entry.data.icon,
    order: entry.data.order,
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
    momentStage: entry.data.momentStage,
    publicationDate: entry.data.publicationDate,
    lastUpdateDate: entry.data.lastUpdateDate,
  };
};

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

// The catalogue exposes metadata only. Draft series can be announced here
// without rendering their overview or publishing any individual pill route.
export const findPillSeriesCatalog = async (
  locale: Locale,
): Promise<readonly PillSeries[]> => {
  const entries = await getCollection('pills');
  const series = entries
    .filter(isSeriesEntry)
    .map(toPillSeries)
    .filter((series): series is PillSeries => series !== null)
    .filter((series) => series.locale === locale)
    .filter((series) => isPublished({ publicationDate: series.publicationDate }));
  return seriesOrder(series);
};

export const findAllPillSeries = async (
  locale: Locale,
): Promise<readonly PillSeries[]> =>
  (await findPillSeriesCatalog(locale)).filter((series) => isPublished(series));

export const findNextPillSeries = async (
  locale: Locale,
  currentSeries: string,
): Promise<{ series: PillSeries; pill: Pill } | null> => {
  const series = await findAllPillSeries(locale);
  const currentIndex = series.findIndex((item) => item.slug === currentSeries);
  if (currentIndex < 0) return null;
  for (const candidate of series.slice(currentIndex + 1)) {
    const [pill] = await publishedPillsOf(locale, candidate.slug);
    if (pill) return { series: candidate, pill };
  }
  return null;
};

export const findAllPublishedPills = async (
  locale: Locale,
): Promise<readonly { series: string; pill: string }[]> => {
  const entries = await getCollection('pills');
  const publishedSeries = new Set(
    (await findAllPillSeries(locale)).map((series) => series.slug),
  );
  return entries
    .filter(isPillEntry)
    .map(toPill)
    .filter((pill): pill is Pill => pill !== null)
    .filter((pill) => pill.locale === locale && publishedSeries.has(pill.series))
    .filter((pill) => isPublished(pill))
    .map((pill) => ({ series: pill.series, pill: pillLeafSlugOf(pill.slug) }));
};

type RenderableSeries = {
  series: PillSeries;
  pills: readonly Pill[];
};

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

  return {
    series: pillSeries,
    pills: await publishedPillsOf(locale, series),
  };
};

type RenderablePill = {
  pill: Pill;
  Content: Awaited<ReturnType<typeof render>>['Content'];
  seriesTitle: string;
  stops: readonly Pill[];
  readingTimeInMinutes: number;
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

  if (pillSeries === undefined) {
    return null;
  }

  const { Content } = await render(entry);
  return {
    pill,
    Content,
    seriesTitle: pillSeries.title,
    stops: await publishedPillsOf(locale, series),
    readingTimeInMinutes: calculateReadingTimeInMinutes(entry.body ?? ''),
  };
};
