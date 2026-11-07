import type { Locale } from '@/i18n/locale';
import type { LabEntry } from '@/features/labs/catalogue/lab-entry';
import { buildLabPath } from '@/i18n/routes';
import { CHALLENGES, CHALLENGE_QUERY_PARAMETER } from './challenges';
import { exit137Copy } from './copy';

export function exit137Entry(locale: Locale): LabEntry {
  const es = locale === 'es';
  const copy = exit137Copy(locale);
  return {
    id: 'exit-137',
    title: 'Exit 137',
    label: es ? 'Sin quedarte sin memoria' : 'Without running out of memory',
    summary: copy.page.description,
    caption: es ? 'la memoria sube' : 'memory climbs',
    levelCount: es ? `${CHALLENGES.length} retos` : `${CHALLENGES.length} challenges`,
    levels: CHALLENGES.map((challenge) => ({
      title: copy.challenges[challenge.id]?.title ?? '',
      href: `${buildLabPath(locale, 'exit-137')}?${CHALLENGE_QUERY_PARAMETER}=${challenge.id}`,
    })),
  };
}
