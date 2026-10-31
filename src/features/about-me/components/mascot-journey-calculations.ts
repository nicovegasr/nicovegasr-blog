import type { MascotPoseName } from './mascot-walker';

// Height of the walking line relative to the screen. Must match the `top` of `.ground`.
export const GROUND_RATIO = 0.88;
// The feet sit at 86% of each atlas cell.
export const FEET_RATIO = 0.86;
// Between two stations the mascot only walks in this stretch; the rest of the scroll is for reading.
const WALK_STARTS_AT = 0.3;
const WALK_LENGTH = 0.4;

export type WalkDirection = 'left' | 'right';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const walkedWithinStation = (travelled: number, stationIndex: number): number =>
  clamp((travelled - stationIndex - WALK_STARTS_AT) / WALK_LENGTH, 0, 1);

export const routeProgress = (routeTop: number, routeHeight: number, stageHeight: number): number =>
  clamp(-routeTop / (routeHeight - stageHeight), 0, 1);

export const routePosition = (progress: number, stationCount: number, direction: string | undefined) => {
  const lastIndex = stationCount - 1;
  const travelled = progress * lastIndex;
  const stationIndex = Math.min(Math.floor(travelled), lastIndex);
  const position = (stationIndex + walkedWithinStation(travelled, stationIndex)) / lastIndex;
  return {
    ratio: direction === 'left' ? 1 - position : position,
    currentIndex: Math.round(travelled),
  };
};

export const stationLength = (routeHeight: number, stageHeight: number, stationCount: number): number =>
  (routeHeight - stageHeight) / (stationCount - 1);

export const linePositionAt = (routeTop: number, lengthOfStation: number): number => {
  const travelled = -routeTop / lengthOfStation;
  const stationIndex = Math.floor(travelled);
  return stationIndex + walkedWithinStation(travelled, stationIndex);
};

// Skips the reading stretch of the scroll, so every arrow-key frame shows on the line.
export const scrollOffsetAt = (linePosition: number, lengthOfStation: number): number => {
  const stationIndex = Math.floor(linePosition);
  const walked = linePosition - stationIndex;
  const stationOffset = walked === 0 ? 0 : WALK_STARTS_AT + WALK_LENGTH * walked;
  return (stationIndex + stationOffset) * lengthOfStation;
};

type HeldWalkStep = {
  position: number;
  lastIndex: number;
  stationPixels: number;
  pixelsWalked: number;
  walksForward: boolean;
};

export const nextLinePosition = ({ position, lastIndex, stationPixels, pixelsWalked, walksForward }: HeldWalkStep): number => {
  const distance = pixelsWalked / stationPixels;
  return clamp(position + (walksForward ? distance : -distance), 0, lastIndex);
};

// With open arms the drawing reaches its cell edge, so the line moves away from the screen edge just enough.
export const lineInsetFor = (mascotWidth: number, walkwayLeft: number): number =>
  Math.max(0, mascotWidth / 2 - walkwayLeft);

// The thread joins the end of one line to the start of the next just as they release the screen.
export const threadSpan = (firstRouteBottom: number, lastRouteTop: number, stageHeight: number) => {
  const top = firstRouteBottom - stageHeight + stageHeight * GROUND_RATIO;
  return { top, height: lastRouteTop + stageHeight * GROUND_RATIO - top };
};

export const threadProgress = (threadY: number, threadHeight: number): number =>
  clamp(threadY / threadHeight, 0, 1);

const lineLength = (walkwayWidth: number, mascotWidth: number, lineInset: number): number =>
  walkwayWidth - mascotWidth / 2 - lineInset;

export const pixelsPerStation = (walkwayWidth: number, mascotWidth: number, lineInset: number, lastIndex: number): number =>
  lineLength(walkwayWidth, mascotWidth, lineInset) / lastIndex;

type RouteProgress = {
  isOnFirstRoute: boolean;
  isOnLastRoute: boolean;
};

type MascotMeasures = RouteProgress & {
  firstRatio: number;
  lastRatio: number;
  firstGroundY: number;
  lastGroundY: number;
  walkLine: number;
  walkwayLeft: number;
  walkwayWidth: number;
  mascotWidth: number;
  lineInset: number;
};

export const mascotPlacement = (measures: MascotMeasures) => {
  const { isOnFirstRoute, isOnLastRoute, firstRatio, lastRatio, walkwayLeft, mascotWidth, lineInset } = measures;
  const ratio = isOnFirstRoute ? firstRatio : isOnLastRoute ? lastRatio : 0;
  const x = lineInset + ratio * lineLength(measures.walkwayWidth, mascotWidth, lineInset);
  const y = Math.min(Math.max(measures.firstGroundY, measures.walkLine), measures.lastGroundY);
  return {
    x,
    y,
    translateX: walkwayLeft + x - mascotWidth / 2,
    translateY: y - mascotWidth * FEET_RATIO,
  };
};

type WalkMovement = RouteProgress & {
  x: number;
  previousX: number | undefined;
  threadY: number;
  previousThreadY: number | undefined;
};

// Along a line the horizontal movement rules; on the thread between lines only the vertical one counts.
export const walkDelta = ({ x, previousX, threadY, previousThreadY, isOnFirstRoute, isOnLastRoute }: WalkMovement) => {
  const horizontal = previousX === undefined ? 0 : x - previousX;
  const vertical = previousThreadY === undefined || isOnFirstRoute || isOnLastRoute ? 0 : threadY - previousThreadY;
  const delta = horizontal !== 0 ? horizontal : vertical;
  return delta === 0 ? undefined : { distance: Math.abs(delta), isForward: delta > 0 };
};

type RestingPoseInput = RouteProgress & {
  hasArrived: boolean;
  firstStationPose: MascotPoseName;
  lastStationPose: MascotPoseName;
};

export const restingPose = ({ isOnFirstRoute, isOnLastRoute, hasArrived, firstStationPose, lastStationPose }: RestingPoseInput): MascotPoseName => {
  if (isOnLastRoute) return hasArrived ? 'welcoming' : lastStationPose;
  return isOnFirstRoute ? firstStationPose : 'standing';
};

export const visibleAge = ({ isOnFirstRoute, isOnLastRoute, activeStopYear }: RouteProgress & { activeStopYear: string | undefined }): string => {
  if (isOnFirstRoute) return 'original';
  return isOnLastRoute ? '2026' : activeStopYear ?? 'original';
};
