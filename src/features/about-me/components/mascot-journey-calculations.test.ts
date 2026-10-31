import { describe, expect, it } from 'vitest';
import {
  FEET_RATIO,
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
} from './mascot-journey-calculations';

describe('routeProgress', () => {
  it('stays at the limits before and after the pinned stretch', () => {
    expect(routeProgress(100, 1800, 800)).toBe(0);
    expect(routeProgress(-500, 1800, 800)).toBe(0.5);
    expect(routeProgress(-5000, 1800, 800)).toBe(1);
  });
});

describe('routePosition', () => {
  it('stands still while the scroll is in the reading stretch', () => {
    expect(routePosition(0.25 / 2, 3, 'right').ratio).toBe(0);
  });

  it('walks in the middle of the stretch between two stations', () => {
    expect(routePosition(0.5 / 2, 3, 'right').ratio).toBeCloseTo(0.25);
  });

  it('mirrors the ratio on a route that walks left', () => {
    expect(routePosition(0, 3, 'left').ratio).toBe(1);
    expect(routePosition(1, 3, 'left').ratio).toBe(0);
  });

  it('picks the nearest station as current', () => {
    expect(routePosition(0.2, 3, 'right').currentIndex).toBe(0);
    expect(routePosition(0.3, 3, 'right').currentIndex).toBe(1);
    expect(routePosition(1, 3, 'right').currentIndex).toBe(2);
  });
});

describe('arrow-key walking', () => {
  it('divides the pinned scroll evenly between the stations', () => {
    expect(stationLength(2400, 800, 3)).toBe(800);
  });

  it('round-trips between the line position and the scroll offset', () => {
    const offset = scrollOffsetAt(1.5, 800);
    expect(offset).toBeCloseTo(1200);
    expect(linePositionAt(-offset, 800)).toBeCloseTo(1.5);
  });

  it('lands exactly on a station when there is nothing left to walk', () => {
    expect(scrollOffsetAt(2, 800)).toBe(1600);
  });

  it('advances at the requested pace and stops at both ends of the line', () => {
    const step = { lastIndex: 2, stationPixels: 100, pixelsWalked: 50, walksForward: true };
    expect(nextLinePosition({ ...step, position: 1 })).toBe(1.5);
    expect(nextLinePosition({ ...step, position: 1, walksForward: false })).toBe(0.5);
    expect(nextLinePosition({ ...step, position: 1.8 })).toBe(2);
    expect(nextLinePosition({ ...step, position: 0.2, walksForward: false })).toBe(0);
  });
});

describe('lineInsetFor', () => {
  it('moves the line only when half the mascot does not fit in the gutter', () => {
    expect(lineInsetFor(72, 24)).toBe(12);
    expect(lineInsetFor(72, 200)).toBe(0);
  });
});

describe('thread', () => {
  it('runs from the walking line of the first route to that of the last one', () => {
    expect(threadSpan(2000, 3000, 1000)).toEqual({ top: 1880, height: 2000 });
  });

  it('keeps its progress within the thread', () => {
    expect(threadProgress(-10, 100)).toBe(0);
    expect(threadProgress(50, 100)).toBe(0.5);
    expect(threadProgress(500, 100)).toBe(1);
  });
});

describe('mascotPlacement', () => {
  const measures = {
    isOnFirstRoute: true,
    isOnLastRoute: false,
    firstRatio: 0.5,
    lastRatio: 1,
    firstGroundY: 700,
    lastGroundY: 2000,
    walkLine: 700,
    walkwayLeft: 100,
    walkwayWidth: 1000,
    mascotWidth: 100,
    lineInset: 0,
  };

  it('follows the route it is on', () => {
    expect(mascotPlacement(measures).x).toBe(475);
    expect(mascotPlacement({ ...measures, isOnFirstRoute: false, isOnLastRoute: true }).x).toBe(950);
  });

  it('stays at the start of the line on the thread between routes', () => {
    expect(mascotPlacement({ ...measures, isOnFirstRoute: false, lineInset: 12 }).x).toBe(12);
  });

  it('keeps to the walking line until the last route pushes it up', () => {
    expect(mascotPlacement({ ...measures, firstGroundY: 300 }).y).toBe(700);
    expect(mascotPlacement({ ...measures, firstGroundY: 900 }).y).toBe(900);
    expect(mascotPlacement({ ...measures, lastGroundY: 500 }).y).toBe(500);
  });

  it('centers the mascot on the line with its feet on the ground', () => {
    const { translateX, translateY } = mascotPlacement(measures);
    expect(translateX).toBe(525);
    expect(translateY).toBe(700 - 100 * FEET_RATIO);
  });
});

describe('pixelsPerStation', () => {
  it('shares the line between the stations', () => {
    expect(pixelsPerStation(1000, 100, 50, 3)).toBe(300);
  });
});

describe('walkDelta', () => {
  const movement = {
    x: 100,
    previousX: 100,
    threadY: 50,
    previousThreadY: 50,
    isOnFirstRoute: false,
    isOnLastRoute: false,
  };

  it('does not walk on the first frame or without movement', () => {
    expect(walkDelta(movement)).toBeUndefined();
    expect(walkDelta({ ...movement, x: 200, previousX: undefined, threadY: 90, previousThreadY: undefined })).toBeUndefined();
  });

  it('reports the horizontal step and its direction', () => {
    expect(walkDelta({ ...movement, x: 130 })).toEqual({ distance: 30, isForward: true });
    expect(walkDelta({ ...movement, x: 70 })).toEqual({ distance: 30, isForward: false });
  });

  it('prefers the horizontal step over the thread', () => {
    expect(walkDelta({ ...movement, x: 130, threadY: 10 })).toEqual({ distance: 30, isForward: true });
  });

  it('walks along the thread only between routes', () => {
    expect(walkDelta({ ...movement, threadY: 20 })).toEqual({ distance: 30, isForward: false });
    expect(walkDelta({ ...movement, threadY: 20, isOnFirstRoute: true })).toBeUndefined();
    expect(walkDelta({ ...movement, threadY: 20, isOnLastRoute: true })).toBeUndefined();
  });
});

describe('restingPose', () => {
  const route = {
    isOnFirstRoute: false,
    isOnLastRoute: false,
    hasArrived: false,
    firstStationPose: 'pointing',
    lastStationPose: 'thinking',
  } as unknown as Parameters<typeof restingPose>[0];

  it('stands on the thread between routes', () => {
    expect(restingPose(route)).toBe('standing');
  });

  it('uses the pose of the current station', () => {
    expect(restingPose({ ...route, isOnFirstRoute: true })).toBe(route.firstStationPose);
    expect(restingPose({ ...route, isOnLastRoute: true })).toBe(route.lastStationPose);
  });

  it('opens its arms only on arriving at the end of the last route', () => {
    expect(restingPose({ ...route, isOnLastRoute: true, hasArrived: true })).toBe('welcoming');
    expect(restingPose({ ...route, isOnFirstRoute: true, hasArrived: true })).toBe(route.firstStationPose);
  });
});

describe('visibleAge', () => {
  const between = { isOnFirstRoute: false, isOnLastRoute: false };

  it('starts young and ends at the present age', () => {
    expect(visibleAge({ ...between, isOnFirstRoute: true, activeStopYear: '2023' })).toBe('original');
    expect(visibleAge({ ...between, isOnLastRoute: true, activeStopYear: '2023' })).toBe('2026');
  });

  it('follows the active stop along the timeline', () => {
    expect(visibleAge({ ...between, activeStopYear: '2023' })).toBe('2023');
  });

  it('stays young before reaching the first stop', () => {
    expect(visibleAge({ ...between, activeStopYear: undefined })).toBe('original');
  });
});
