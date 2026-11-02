type AtlasPair = { walking: string; reactions: string; layout?: '3x3' };
export type MascotRole = 'skills' | 'backend' | 'frontend' | 'database' | 'infrastructure' | 'artificial-intelligence';

export const createMascotAtlases = (mascot: HTMLElement, signal: AbortSignal) => {
  const atlases: Record<string, AtlasPair> = JSON.parse(mascot.dataset.mascotAtlases!);
  const images = new Map<string, Promise<void>>();
  let requestedKey = mascot.dataset.mascotAge!;

  const loadImage = (url: string): Promise<void> => {
    const existing = images.get(url);
    if (existing) return existing;
    const image = new Image();
    image.src = url;
    const ready = image.decode();
    images.set(url, ready);
    return ready;
  };

  const pairFor = (age: string): AtlasPair => atlases[age] ?? atlases.original!;
  const load = (age: string) => {
    const { walking, reactions } = pairFor(age);
    return Promise.all([loadImage(walking), loadImage(reactions)]);
  };

  return {
    preload: (age: string) => {
      void load(age).catch(() => undefined);
    },
    show: (age: string, role?: MascotRole) => {
      const key = role ?? age;
      if (requestedKey === key) return;
      requestedKey = key;
      void load(key).then(() => {
        if (signal.aborted || requestedKey !== key) return;
        const atlas = pairFor(key);
        mascot.style.setProperty('--walking-atlas', `url(${atlas.walking})`);
        mascot.style.setProperty('--reactions-atlas', `url(${atlas.reactions})`);
        mascot.dataset.mascotAge = age;
        mascot.dataset.mascotRole = role ?? '';
        mascot.dataset.mascotLayout = atlas.layout ?? '3x2';
      }).catch(() => {
        // Keep the currently decoded character if the next atlas cannot load.
        if (requestedKey === key) requestedKey = mascot.dataset.mascotRole || mascot.dataset.mascotAge!;
      });
    },
  };
};
