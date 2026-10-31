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
// Ritmo de paseo al moverlo con las flechas del teclado, sea cual sea el ancho de la línea.
const WALKING_SPEED_IN_PIXELS_PER_SECOND = 280;
const MINIMUM_WALK_IN_MILLISECONDS = 700;
const MAXIMUM_WALK_IN_MILLISECONDS = 1600;
const SCROLL_TAKEOVER_TOLERANCE_IN_PIXELS = 2;

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
  let threadTop = 0;
  let threadHeight = 0;
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
    const lineLength = width - size / 2;
    const isOnFirstRoute = first.progress < 1;
    const isOnLastRoute = last.progress > 0;
    const ratio = isOnFirstRoute ? first.ratio : isOnLastRoute ? last.ratio : 0;
    const x = ratio * lineLength;

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
    mascot.classList.toggle('is-arrived', last.ratio >= 1);
  };
  const requestPaint = () => {
    frame ||= requestAnimationFrame(paint);
  };
  const requestMeasure = () => {
    measureThread();
    requestPaint();
  };

  let guidedWalk: { route: HTMLElement; targetIndex: number } | undefined;
  let guidedWalkFrame = 0;

  const stopGuidedWalk = () => {
    cancelAnimationFrame(guidedWalkFrame);
    guidedWalk = undefined;
  };

  let guidedTop = 0;
  const scrollInstantly = (top: number) => {
    guidedTop = top;
    window.scrollTo({ top, behavior: 'instant' });
  };
  // Cualquier otro scroll (teclas, barra, enlaces) significa que la persona ha tomado el control.
  const wasScrolledByPerson = (): boolean => Math.abs(window.scrollY - guidedTop) > SCROLL_TAKEOVER_TOLERANCE_IN_PIXELS;

  // Solo se anima el tramo en que anda: el resto del scroll entre paradas no cambia nada en pantalla.
  const walkOneStation = (route: HTMLElement, fromIndex: number, toIndex: number) => {
    const stage = route === firstRoute ? firstStage : lastStage;
    const lastIndex = route.querySelectorAll('[data-route-station]').length - 1;
    const { top, height } = route.getBoundingClientRect();
    const routeTop = window.scrollY + top;
    const stationLength = (height - stage.offsetHeight) / lastIndex;
    const segmentStart = routeTop + Math.min(fromIndex, toIndex) * stationLength;
    const walkStart = segmentStart + stationLength * WALK_STARTS_AT;
    const walkEnd = segmentStart + stationLength * (WALK_STARTS_AT + WALK_LENGTH);
    const [startTop, endTop] = toIndex > fromIndex ? [walkStart, walkEnd] : [walkEnd, walkStart];
    const distance = (walkway.offsetWidth - mascot.offsetWidth / 2) / lastIndex;
    const duration = clamp(
      (distance / WALKING_SPEED_IN_PIXELS_PER_SECOND) * 1000,
      MINIMUM_WALK_IN_MILLISECONDS,
      MAXIMUM_WALK_IN_MILLISECONDS,
    );

    scrollInstantly(startTop);
    const startedAt = performance.now();
    const advance = (now: number) => {
      if (wasScrolledByPerson()) {
        guidedWalk = undefined;
        return;
      }
      const elapsed = clamp((now - startedAt) / duration, 0, 1);
      if (elapsed < 1) {
        scrollInstantly(startTop + (endTop - startTop) * elapsed);
        guidedWalkFrame = requestAnimationFrame(advance);
        return;
      }
      scrollInstantly(routeTop + toIndex * stationLength);
      const target = guidedWalk?.targetIndex ?? toIndex;
      if (target === toIndex) {
        guidedWalk = undefined;
        return;
      }
      walkOneStation(route, toIndex, toIndex + Math.sign(target - toIndex));
    };
    guidedWalkFrame = requestAnimationFrame(advance);
  };

  // Las flechas del teclado mueven al muñequito hacia donde apuntan, también en la línea que va hacia la izquierda.
  const walkToNextStation = (route: HTMLElement, direction: WalkDirection) => {
    const stage = route === firstRoute ? firstStage : lastStage;
    const lastIndex = route.querySelectorAll('[data-route-station]').length - 1;
    const step = direction === route.dataset.direction ? 1 : -1;
    if (guidedWalk?.route === route) {
      guidedWalk.targetIndex = clamp(guidedWalk.targetIndex + step, 0, lastIndex);
      return;
    }
    stopGuidedWalk();
    const currentIndex = readRoute(route, stage).currentIndex;
    const targetIndex = clamp(currentIndex + step, 0, lastIndex);
    if (targetIndex === currentIndex) {
      return;
    }
    guidedWalk = { route, targetIndex };
    walkOneStation(route, currentIndex, targetIndex);
  };

  const pinnedRoute = (): HTMLElement | undefined =>
    [firstRoute, lastRoute].find((candidate) => {
      const { top, bottom } = candidate.getBoundingClientRect();
      return top <= 1 && bottom >= firstStage.offsetHeight - 1;
    });

  const moveWithArrowKeys = (event: KeyboardEvent) => {
    const isArrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (!isArrow || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTypingTarget(event.target)) {
      return;
    }
    const route = pinnedRoute();
    if (route === undefined) {
      return;
    }
    event.preventDefault();
    walkToNextStation(route, event.key === 'ArrowRight' ? 'right' : 'left');
  };


  stopTracking = new AbortController();
  const { signal } = stopTracking;
  window.addEventListener('keydown', moveWithArrowKeys, { signal });
  // Con la rueda o el dedo se detiene antes de llegar a pelear con el scroll.
  window.addEventListener('wheel', stopGuidedWalk, { passive: true, signal });
  window.addEventListener('touchmove', stopGuidedWalk, { passive: true, signal });
  signal.addEventListener('abort', stopGuidedWalk);
  window.addEventListener('scroll', requestPaint, { passive: true, signal });
  window.addEventListener('resize', requestMeasure, { passive: true, signal });
  const layoutObserver = new ResizeObserver(requestMeasure);
  layoutObserver.observe(walkway);
  signal.addEventListener('abort', () => layoutObserver.disconnect());
  requestMeasure();
};

document.addEventListener('astro:page-load', trackMascotJourney);
trackMascotJourney();
