/** Per-viewer progress: a convenience, so the lab works the same if storage is unavailable. */
export interface Progress {
  readonly stars: Readonly<Record<number, number>>;
  readonly survived: Readonly<Record<number, boolean>>;
}

const KEY = 'oom-lab-progress';
const EMPTY: Progress = { stars: {}, survived: {} };

export const loadProgress = (): Progress => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === null ? EMPTY : { ...EMPTY, ...(JSON.parse(stored) as Partial<Progress>) };
  } catch {
    return EMPTY;
  }
};

export const recordRun = (progress: Progress, challengeId: number, stars: number, survived: boolean): Progress => {
  const next: Progress = {
    stars: { ...progress.stars, [challengeId]: Math.max(stars, progress.stars[challengeId] ?? 0) },
    survived: { ...progress.survived, [challengeId]: survived || (progress.survived[challengeId] ?? false) },
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Without storage the progress lasts until the page is closed.
  }
  return next;
};

const TIPS_KEY = 'oom-lab-tips';

/** Tutorial steps and one-off tips already shown to this viewer. */
export const loadSeenTips = (): Set<string> => {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(TIPS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
};

export const saveSeenTips = (seen: Set<string>): void => {
  try {
    window.localStorage.setItem(TIPS_KEY, JSON.stringify([...seen]));
  } catch {
    // Without storage the tips show again on the next visit.
  }
};
