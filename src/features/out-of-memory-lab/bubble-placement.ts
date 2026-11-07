export type Side = 'below' | 'above' | 'left' | 'right';

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

const GAP = 18;
const MARGIN = 12;
const ALL_SIDES: readonly Side[] = ['below', 'above', 'right', 'left'];

const clamp = (value: number, max: number) => Math.max(MARGIN, Math.min(value, max - MARGIN));

/**
 * Where the bubble goes: on the preferred side of the target if there is room, otherwise on the
 * first side that has it. A target too big for any side gets the bubble in the corner of the game.
 */
export const placeBubble = (target: Box, bubble: Size, game: Size, preferred: Side = 'below') => {
  const centredLeft = clamp(target.left + target.width / 2 - bubble.width / 2, game.width - bubble.width);
  const centredTop = clamp(target.top + target.height / 2 - bubble.height / 2, game.height - bubble.height);
  const positions: Record<Side, { left: number; top: number }> = {
    below: { left: centredLeft, top: target.top + target.height + GAP },
    above: { left: centredLeft, top: target.top - GAP - bubble.height },
    right: { left: target.left + target.width + GAP, top: centredTop },
    left: { left: target.left - GAP - bubble.width, top: centredTop },
  };
  const fits = ({ left, top }: { left: number; top: number }) =>
    left >= MARGIN &&
    top >= MARGIN &&
    left + bubble.width <= game.width - MARGIN &&
    top + bubble.height <= game.height - MARGIN;
  const side = [preferred, ...ALL_SIDES].find((candidate) => fits(positions[candidate]));
  return side === undefined
    ? { left: game.width - MARGIN - bubble.width, top: game.height - MARGIN - bubble.height }
    : positions[side];
};
