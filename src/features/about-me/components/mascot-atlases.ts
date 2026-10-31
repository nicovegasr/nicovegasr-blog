type AtlasPair = { walking: string; reactions: string };

export const createMascotAtlases = (mascot: HTMLElement, signal: AbortSignal) => {
  const atlases: Record<string, AtlasPair> = JSON.parse(mascot.dataset.mascotAtlases!);
  const images = new Map<string, Promise<void>>();
  let requestedAge = mascot.dataset.mascotAge!;

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
    show: (age: string) => {
      if (requestedAge === age) return;
      requestedAge = age;
      void load(age).then(() => {
        if (signal.aborted || requestedAge !== age) return;
        const atlas = pairFor(age);
        mascot.style.setProperty('--walking-atlas', `url(${atlas.walking})`);
        mascot.style.setProperty('--reactions-atlas', `url(${atlas.reactions})`);
        mascot.dataset.mascotAge = age;
      }).catch(() => {
        // Keep the currently decoded character if the next atlas cannot load.
        if (requestedAge === age) requestedAge = mascot.dataset.mascotAge!;
      });
    },
  };
};
