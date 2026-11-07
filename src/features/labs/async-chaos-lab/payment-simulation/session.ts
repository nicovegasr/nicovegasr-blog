import type { Locale } from '@/i18n/locale';
import { achievementIds } from './achievements';
import type { AchievementId } from './achievements';
import { cleanLabel } from '../shared/text';
import type { Labels } from './labels';

const achievementsKey = 'queue-story-achievements';
const namesKey = (locale: Locale) => `queue-story-names-${locale}`;

// Browser storage is optional: every function works, without persisting, when it is blocked.
export function restoreLabels(defaults: Labels, stepNamesKey: string, locale: Locale): Labels {
  const labels = structuredClone(defaults);
  try {
    const saved = JSON.parse(sessionStorage.getItem(namesKey(locale)) ?? '{}');
    for (const key of ['api', 'storage', 'worker'] as const)
      if (typeof saved[key] === 'string') labels[key] = cleanLabel(saved[key], defaults[key]);
    if (Array.isArray(saved.jobs))
      labels.jobs = defaults.jobs.map((fallback, index) => cleanLabel(saved.jobs[index], fallback));
    if (Array.isArray(saved[stepNamesKey]))
      labels.steps = defaults.steps.map((fallback, index) => cleanLabel(saved[stepNamesKey][index], fallback));
  } catch {
    return labels;
  }
  return labels;
}

export function saveLabel(key: string, labels: Labels, stepNamesKey: string, locale: Locale) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(namesKey(locale)) ?? '{}');
    if (key === 'api' || key === 'storage' || key === 'worker') saved[key] = labels[key];
    if (key.startsWith('job-')) saved.jobs = labels.jobs;
    if (key.startsWith('step-')) saved[stepNamesKey] = labels.steps;
    sessionStorage.setItem(namesKey(locale), JSON.stringify(saved));
  } catch {
    return;
  }
}

export function restoreAchievements(): Set<AchievementId> {
  const unlocked = new Set<AchievementId>();
  try {
    const saved = JSON.parse(sessionStorage.getItem(achievementsKey) ?? '[]');
    if (Array.isArray(saved)) for (const id of achievementIds) if (saved.includes(id)) unlocked.add(id);
  } catch {
    return unlocked;
  }
  return unlocked;
}

export function saveAchievements(unlocked: Set<AchievementId>) {
  try {
    sessionStorage.setItem(achievementsKey, JSON.stringify([...unlocked]));
  } catch {
    return;
  }
}
