import { createMascotAtlases } from './mascot-atlases';
import {
  createMascotWalker,
  isMascotPoseName,
  type MascotPoseName,
} from '@/features/about-me/components/mascot-walker';
import {
  GROUND_RATIO,
  lineInsetFor,
  linePositionAt,
  mascotPlacement,
  nextLinePosition,
  pixelsPerStation,
  restingPose,
  routePosition,
  routeProgress,
  scrollOffsetAt,
  stationLength,
  threadProgress,
  threadSpan,
  visibleAge,
  walkDelta,
  type WalkDirection,
} from '@/features/about-me/components/mascot-journey-calculations';

const CINEMATIC_QUERY = '(prefers-reduced-motion: no-preference) and (min-height: 34rem)';
// Ritmo de paseo mientras se mantiene pulsada una flecha, sea cual sea el ancho de la línea.
const WALKING_SPEED_IN_PIXELS_PER_SECOND = 280;

type RouteState = {
  progress: number;
  ratio: number;
  currentIndex: number;
  groundY: number;
};

const readRoute = (route: HTMLElement, stage: HTMLElement): RouteState => {
  const stationCount = route.querySelectorAll('[data-route-station]').length;
  const { top, height } = route.getBoundingClientRect();
  const stageHeight = stage.offsetHeight;
  const progress = routeProgress(top, height, stageHeight);
  return {
    progress,
    ...routePosition(progress, stationCount, route.dataset.direction),
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

  stopTracking = new AbortController();
  const { signal } = stopTracking;
  const walker = createMascotWalker(mascot);
  const atlases = createMascotAtlases(mascot, signal);
  const atlasObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const age = entry.target === lastRoute ? '2026' : (entry.target as HTMLElement).dataset.startYear;
      if (age) atlases.preload(age);
      atlasObserver.unobserve(entry.target);
    }
  }, { rootMargin: '100% 0px' });
  stops.forEach((stop) => atlasObserver.observe(stop));
  atlasObserver.observe(lastRoute);
  signal.addEventListener('abort', () => atlasObserver.disconnect());
  let threadTop = 0;
  let threadHeight = 0;
  let lineInset = 0;
  let previousX: number | undefined;
  let previousThreadY: number | undefined;

  const measureThread = () => {
    const stageHeight = firstStage.offsetHeight;
    const walkwayTop = walkway.getBoundingClientRect().top;
    const firstRouteBottom = firstRoute.getBoundingClientRect().bottom - walkwayTop;
    const lastRouteTop = lastRoute.getBoundingClientRect().top - walkwayTop;
    ({ top: threadTop, height: threadHeight } = threadSpan(firstRouteBottom, lastRouteTop, stageHeight));
    thread.style.top = `${threadTop}px`;
    thread.style.height = `${threadHeight}px`;
  };

  // Thread, lines, stations and mascot all move together with the inset.
  const measureLineInset = () => {
    lineInset = lineInsetFor(mascot.offsetWidth, walkway.getBoundingClientRect().left);
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
    const { left, width } = walkway.getBoundingClientRect();
    const isOnFirstRoute = first.progress < 1;
    const isOnLastRoute = last.progress > 0;
    const { x, y, translateX, translateY } = mascotPlacement({
      isOnFirstRoute,
      isOnLastRoute,
      firstRatio: first.ratio,
      lastRatio: last.ratio,
      firstGroundY: first.groundY,
      lastGroundY: last.groundY,
      walkLine,
      walkwayLeft: left,
      walkwayWidth: width,
      mascotWidth: mascot.offsetWidth,
      lineInset,
    });

    mascot.style.transform = `translate(${translateX}px, ${translateY}px)`;

    const threadY = y - walkway.getBoundingClientRect().top - threadTop;
    thread.style.setProperty('--thread-progress', String(threadProgress(threadY, threadHeight)));

    const step = walkDelta({ x, previousX, threadY, previousThreadY, isOnFirstRoute, isOnLastRoute });
    if (step) {
      walker.walk(step.distance, step.isForward);
    }
    previousX = x;
    previousThreadY = threadY;

    walker.rest(
      restingPose({
        isOnFirstRoute,
        isOnLastRoute,
        hasArrived: last.ratio >= 1,
        firstStationPose: currentStationPose(firstRoute, first),
        lastStationPose: currentStationPose(lastRoute, last),
      }),
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
    atlases.show(visibleAge({ isOnFirstRoute, isOnLastRoute, activeStopYear: activeStop?.dataset.startYear }));
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
    stationLength(route.offsetHeight, stage.offsetHeight, route.querySelectorAll('[data-route-station]').length);

  const currentLinePosition = (route: HTMLElement, stage: HTMLElement): number =>
    linePositionAt(route.getBoundingClientRect().top, stationLengthOf(route, stage));

  const scrollToLinePosition = (route: HTMLElement, stage: HTMLElement, position: number) => {
    const routeTop = window.scrollY + route.getBoundingClientRect().top;
    window.scrollTo({ top: routeTop + scrollOffsetAt(position, stationLengthOf(route, stage)), behavior: 'instant' });
  };

  const advanceHeldWalk = (now: number) => {
    if (heldWalk === undefined) {
      return;
    }
    const { route, stage, direction, position, previousFrameAt } = heldWalk;
    const lastIndex = route.querySelectorAll('[data-route-station]').length - 1;
    const stationPixels = pixelsPerStation(walkway.offsetWidth, mascot.offsetWidth, lineInset, lastIndex);
    const nextPosition = nextLinePosition({
      position,
      lastIndex,
      stationPixels,
      pixelsWalked: (WALKING_SPEED_IN_PIXELS_PER_SECOND * (now - previousFrameAt)) / 1000,
      walksForward: direction === route.dataset.direction,
    });
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
