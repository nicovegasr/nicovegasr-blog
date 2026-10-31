import {
  createMascotWalker,
  isMascotPoseName,
  type MascotPoseName,
} from '@/features/about-me/components/mascot-walker';

const CINEMATIC_QUERY = '(prefers-reduced-motion: no-preference) and (min-height: 34rem)';
// Altura de la línea por la que anda, respecto a la pantalla. Debe coincidir con el `top` de `.ground`.
const GROUND_RATIO = 0.88;
// Los pies del atlas están al 86% de cada celda.
const FEET_RATIO = 0.86;
// Entre parada y parada solo anda en este tramo; el resto del scroll se queda quieto para leer.
const WALK_STARTS_AT = 0.3;
const WALK_LENGTH = 0.4;
// Ritmo de paseo mientras se mantiene pulsada una flecha, sea cual sea el ancho de la línea.
const WALKING_SPEED_IN_PIXELS_PER_SECOND = 280;

type WalkDirection = 'left' | 'right';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

type RouteState = {
  progress: number;
  ratio: number;
  currentIndex: number;
  groundY: number;
};

const readRoute = (route: HTMLElement, stage: HTMLElement): RouteState => {
  const stations = route.querySelectorAll<HTMLElement>('[data-route-station]');
  const lastIndex = stations.length - 1;
  const { top, height } = route.getBoundingClientRect();
  const stageHeight = stage.offsetHeight;
  const progress = clamp(-top / (height - stageHeight), 0, 1);
  const travelled = progress * lastIndex;
  const stationIndex = Math.min(Math.floor(travelled), lastIndex);
  const walked = clamp((travelled - stationIndex - WALK_STARTS_AT) / WALK_LENGTH, 0, 1);
  const position = (stationIndex + walked) / lastIndex;
  return {
    progress,
    ratio: route.dataset.direction === 'left' ? 1 - position : position,
    currentIndex: Math.round(travelled),
    groundY: stage.getBoundingClientRect().top + stageHeight * GROUND_RATIO,
  };
};

const paintRoute = (route: HTMLElement, state: RouteState) => {
  route.style.setProperty('--route-ratio', String(state.ratio));
  route
    .querySelectorAll<HTMLElement>('[data-route-station]')
    .forEach((station, index) => station.classList.toggle('is-current', index === state.currentIndex));
  route
    .querySelectorAll<HTMLElement>('[data-route-tick]')
    .forEach((tick, index) => tick.classList.toggle('is-reached', index <= state.currentIndex));
};

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const currentStationPose = (route: HTMLElement, state: RouteState): MascotPoseName => {
  const pose = route.querySelectorAll<HTMLElement>('[data-route-station]')[state.currentIndex]?.dataset.pose;
  return isMascotPoseName(pose) ? pose : 'standing';
};

let stopTracking: AbortController | undefined;

const trackMascotJourney = () => {
  stopTracking?.abort();
  const walkway = document.querySelector<HTMLElement>('[data-walkway]');
  const mascot = walkway?.querySelector<HTMLElement>('[data-page-walker]');
  const thread = walkway?.querySelector<HTMLElement>('[data-walkway-thread]');
  const routes = walkway?.querySelectorAll<HTMLElement>('[data-route]');
  const firstRoute = routes?.[0];
  const lastRoute = routes?.[routes.length - 1];
  const firstStage = firstRoute?.querySelector<HTMLElement>('[data-route-stage]');
  const lastStage = lastRoute?.querySelector<HTMLElement>('[data-route-stage]');
  const journey = walkway?.querySelector<HTMLElement>('[data-journey]');
  if (!walkway || !mascot || !thread || !firstRoute || !lastRoute || !firstStage || !lastStage || !journey) {
    return;
  }

  const stops = journey.querySelectorAll<HTMLElement>('[data-journey-stop]');
  if (!window.matchMedia(CINEMATIC_QUERY).matches) {
    stops.forEach((stop) => stop.classList.add('is-reached'));
    stops[stops.length - 1]?.classList.add('is-active');
    return;
  }

  const walker = createMascotWalker(mascot);
  const atlases: Record<string, { walking: string; reactions: string }> = JSON.parse(mascot.dataset.mascotAtlases!);
  const showAge = (age: string) => {
    if (mascot.dataset.mascotAge === age) {
      return;
    }
    const atlas = atlases[age] ?? atlases.original!;
    mascot.style.setProperty('--walking-atlas', `url(${atlas.walking})`);
    mascot.style.setProperty('--reactions-atlas', `url(${atlas.reactions})`);
    mascot.dataset.mascotAge = age;
  };
  let threadTop = 0;
  let threadHeight = 0;
  let lineInset = 0;
  let previousX: number | undefined;
  let previousThreadY: number | undefined;

  // El hilo une el final de una línea con el principio de la siguiente justo cuando sueltan la pantalla.
  const measureThread = () => {
    const stageHeight = firstStage.offsetHeight;
    const walkwayTop = walkway.getBoundingClientRect().top;
    const firstRouteBottom = firstRoute.getBoundingClientRect().bottom - walkwayTop;
    const lastRouteTop = lastRoute.getBoundingClientRect().top - walkwayTop;
    threadTop = firstRouteBottom - stageHeight + stageHeight * GROUND_RATIO;
    threadHeight = lastRouteTop + stageHeight * GROUND_RATIO - threadTop;
    thread.style.top = `${threadTop}px`;
    thread.style.height = `${threadHeight}px`;
  };

  // Con los brazos abiertos el dibujo llega al borde de su celda: el hilo se aparta del borde de la pantalla
  // lo justo para que la mascota quepa entera. Hilo, líneas, paradas y mascota se desplazan juntos.
  const measureLineInset = () => {
    lineInset = Math.max(0, mascot.offsetWidth / 2 - walkway.getBoundingClientRect().left);
    walkway.style.setProperty('--walk-line-inset', `${lineInset}px`);
  };

  let frame = 0;
  const paint = () => {
    frame = 0;
    const first = readRoute(firstRoute, firstStage);
    const last = readRoute(lastRoute, lastStage);
    paintRoute(firstRoute, first);
    paintRoute(lastRoute, last);

    const walkLine = firstStage.offsetHeight * GROUND_RATIO;
    const y = Math.min(Math.max(first.groundY, walkLine), last.groundY);
    const { left, width } = walkway.getBoundingClientRect();
    const size = mascot.offsetWidth;
    const lineLength = width - size / 2 - lineInset;
    const isOnFirstRoute = first.progress < 1;
    const isOnLastRoute = last.progress > 0;
    const ratio = isOnFirstRoute ? first.ratio : isOnLastRoute ? last.ratio : 0;
    const x = lineInset + ratio * lineLength;

    mascot.style.transform = `translate(${left + x - size / 2}px, ${y - size * FEET_RATIO}px)`;

    const threadY = y - walkway.getBoundingClientRect().top - threadTop;
    thread.style.setProperty('--thread-progress', String(clamp(threadY / threadHeight, 0, 1)));

    const horizontalDelta = previousX === undefined ? 0 : x - previousX;
    const threadDelta = previousThreadY === undefined || isOnFirstRoute || isOnLastRoute ? 0 : threadY - previousThreadY;
    if (horizontalDelta !== 0) {
      walker.walk(Math.abs(horizontalDelta), horizontalDelta > 0);
    } else if (threadDelta !== 0) {
      walker.walk(Math.abs(threadDelta), threadDelta > 0);
    }
    previousX = x;
    previousThreadY = threadY;

    walker.rest(
      isOnLastRoute && last.ratio >= 1
        ? 'welcoming'
        : isOnLastRoute
          ? currentStationPose(lastRoute, last)
          : isOnFirstRoute
            ? currentStationPose(firstRoute, first)
            : 'standing',
    );

    let activeStop: HTMLElement | undefined;
    stops.forEach((stop) => {
      const isReached = stop.getBoundingClientRect().top <= walkLine;
      stop.classList.toggle('is-reached', isReached);
      if (isReached) {
        activeStop = stop;
      }
    });
    stops.forEach((stop) => stop.classList.toggle('is-active', stop === activeStop));
    showAge(isOnFirstRoute ? 'original' : isOnLastRoute ? '2026' : activeStop?.dataset.startYear ?? 'original');
    mascot.classList.toggle('is-arrived', last.ratio >= 1);
  };
  const requestPaint = () => {
    frame ||= requestAnimationFrame(paint);
  };
  const requestMeasure = () => {
    measureLineInset();
    measureThread();
    requestPaint();
  };

  const pinnedRoute = (): HTMLElement | undefined =>
    [firstRoute, lastRoute].find((candidate) => {
      const { top, bottom } = candidate.getBoundingClientRect();
      return top <= 1 && bottom >= firstStage.offsetHeight - 1;
    });

  // Mientras la flecha esté pulsada anda hacia donde apunta; al soltarla se para donde esté.
  let heldWalk:
    | { route: HTMLElement; stage: HTMLElement; key: string; direction: WalkDirection; position: number; previousFrameAt: number }
    | undefined;
  let heldWalkFrame = 0;

  const stopHeldWalk = () => {
    cancelAnimationFrame(heldWalkFrame);
    heldWalk = undefined;
  };

  const stationLengthOf = (route: HTMLElement, stage: HTMLElement): number =>
    (route.offsetHeight - stage.offsetHeight) / (route.querySelectorAll('[data-route-station]').length - 1);

  const currentLinePosition = (route: HTMLElement, stage: HTMLElement): number => {
    const travelled = -route.getBoundingClientRect().top / stationLengthOf(route, stage);
    const stationIndex = Math.floor(travelled);
    return stationIndex + clamp((travelled - stationIndex - WALK_STARTS_AT) / WALK_LENGTH, 0, 1);
  };

  // El tramo del scroll en que está quieto para leer se salta: cada frame de flecha se nota en la línea.
  const scrollToLinePosition = (route: HTMLElement, stage: HTMLElement, position: number) => {
    const stationIndex = Math.floor(position);
    const walked = position - stationIndex;
    const stationOffset = walked === 0 ? 0 : WALK_STARTS_AT + WALK_LENGTH * walked;
    const routeTop = window.scrollY + route.getBoundingClientRect().top;
    window.scrollTo({ top: routeTop + (stationIndex + stationOffset) * stationLengthOf(route, stage), behavior: 'instant' });
  };

  const advanceHeldWalk = (now: number) => {
    if (heldWalk === undefined) {
      return;
    }
    const { route, stage, direction, position, previousFrameAt } = heldWalk;
    const lastIndex = route.querySelectorAll('[data-route-station]').length - 1;
    const stationPixels = (walkway.offsetWidth - mascot.offsetWidth / 2 - lineInset) / lastIndex;
    const distance = (WALKING_SPEED_IN_PIXELS_PER_SECOND * (now - previousFrameAt)) / 1000 / stationPixels;
    const nextPosition = clamp(position + (direction === route.dataset.direction ? distance : -distance), 0, lastIndex);
    heldWalk.position = nextPosition;
    heldWalk.previousFrameAt = now;
    if (nextPosition !== position) {
      scrollToLinePosition(route, stage, nextPosition);
    }
    heldWalkFrame = requestAnimationFrame(advanceHeldWalk);
  };

  const startWalkingWithArrowKey = (event: KeyboardEvent) => {
    const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (!isArrow || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTypingTarget(event.target)) {
      return;
    }
    const route = pinnedRoute();
    if (route === undefined) {
      return;
    }
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    stopHeldWalk();
    const stage = route === firstRoute ? firstStage : lastStage;
    heldWalk = {
      route,
      stage,
      key: event.key,
      direction: event.key === 'ArrowRight' ? 'right' : 'left',
      position: currentLinePosition(route, stage),
      previousFrameAt: performance.now(),
    };
    heldWalkFrame = requestAnimationFrame(advanceHeldWalk);
  };

  const stopWalkingWithArrowKey = (event: KeyboardEvent) => {
    if (event.key === heldWalk?.key) {
      stopHeldWalk();
    }
  };


  stopTracking = new AbortController();
  const { signal } = stopTracking;
  window.addEventListener('keydown', startWalkingWithArrowKey, { signal });
  window.addEventListener('keyup', stopWalkingWithArrowKey, { signal });
  window.addEventListener('blur', stopHeldWalk, { signal });
  window.addEventListener('wheel', stopHeldWalk, { passive: true, signal });
  signal.addEventListener('abort', stopHeldWalk);
  window.addEventListener('scroll', requestPaint, { passive: true, signal });
  window.addEventListener('resize', requestMeasure, { passive: true, signal });
  const layoutObserver = new ResizeObserver(requestMeasure);
  layoutObserver.observe(walkway);
  signal.addEventListener('abort', () => layoutObserver.disconnect());
  requestMeasure();
};

document.addEventListener('astro:page-load', trackMascotJourney);
trackMascotJourney();
