import { achievements } from './achievements';
import type { AchievementId } from './achievements';
import { cleanLabel } from '../shared/text';
import type { Labels } from './labels';

const achievementsKey = 'queue-story-achievements';
const namesKey = (es: boolean) => `queue-story-names-${es ? 'es' : 'en'}`;

// Browser storage is optional: every function works, without persisting, when it is blocked.
export function restoreLabels(defaults: Labels, level: 1 | 2, es: boolean): Labels {
  const labels = structuredClone(defaults);
  try {
    const saved = JSON.parse(sessionStorage.getItem(namesKey(es)) ?? '{}');
    for (const key of ['api', 'storage', 'worker'] as const)
      if (typeof saved[key] === 'string')
        labels[key] = cleanLabel(saved[key], defaults[key]);
    if (Array.isArray(saved.jobs))
      labels.jobs = defaults.jobs.map((fallback, index) =>
        cleanLabel(saved.jobs[index], fallback),
      );
    if (Array.isArray(saved[`steps${level}`]))
      labels.steps = defaults.steps.map((fallback, index) =>
        cleanLabel(saved[`steps${level}`][index], fallback),
      );
  } catch {
    return labels;
  }
  return labels;
}

export function saveLabel(key: string, labels: Labels, level: 1 | 2, es: boolean) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(namesKey(es)) ?? '{}');
    if (key === 'api' || key === 'storage' || key === 'worker')
      saved[key] = labels[key];
    if (key.startsWith('job-')) saved.jobs = labels.jobs;
    if (key.startsWith('step-')) saved[`steps${level}`] = labels.steps;
    sessionStorage.setItem(namesKey(es), JSON.stringify(saved));
  } catch {
    return;
  }
}

export function restoreAchievements(): Set<AchievementId> {
  const unlocked = new Set<AchievementId>();
  try {
    const saved = JSON.parse(sessionStorage.getItem(achievementsKey) ?? '[]');
    if (Array.isArray(saved))
      for (const { id } of achievements)
        if (saved.includes(id)) unlocked.add(id);
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
