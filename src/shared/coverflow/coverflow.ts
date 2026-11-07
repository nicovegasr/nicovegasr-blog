export interface CoverflowItem {
  readonly title: string;
  readonly href: string;
  readonly image: string;
  readonly imageAlt: string;
  readonly caption?: string;
  readonly description?: string;
}

export interface CoverflowLabels {
  readonly pause: string;
  readonly resume: string;
  readonly choose: string;
  readonly visit: string;
  readonly carousel: string;
  readonly dragHint: string;
  readonly swipeHint: string;
}

export const wrap = (value: number, count: number): number => (count > 0 ? ((value % count) + count) % count : 0);

/** Signed distance from one position to another around the circle, never more than half a lap. */
export const shortestDelta = (from: number, to: number, count: number): number => {
  const delta = wrap(to - from, count);
  return delta > count / 2 ? delta - count : delta;
};

export const easeOutQuint = (progress: number): number => 1 - (1 - progress) ** 5;

export function positionOf(index: number, offset: number, count: number) {
  if (count < 3) return { transform: 'translateX(-50%)', opacity: 1, zIndex: 3, shade: 0 };
  let position = wrap(index - offset, count);
  if (position > count / 2) position -= count;
  const distance = Math.abs(position);
  const direction = Math.sign(position);
  // Three items must fade out before wrapping at ±1.5; larger sets wrap fully offscreen.
  const edge = Math.min(2, count / 2);
  const opacity = Math.max(0, Math.min(1, (edge - distance) / Math.min(1, edge - 1)));
  // The sine term parts neighbouring cards at the halfway point, so the instant their stacking
  // order swaps they no longer overlap and the swap cannot be seen.
  const spread = distance <= 1 ? 82 * distance + 6 * Math.sin(Math.PI * distance) : 82 + (distance - 1) * 48;
  const horizontal = -50 + direction * spread;
  const depth = distance <= 1 ? distance * -0.36 : -0.36 - (distance - 1) * 0.3;
  const angle = -direction * Math.min(40, distance * 32);
  return {
    transform: `translateX(${horizontal}%) translateZ(calc(var(--coverflow-card-width) * ${depth})) rotateY(${angle}deg)`,
    opacity,
    zIndex: Math.round((3 - distance) * 100),
    shade: Math.min(1, distance),
  };
}
