import { describe, expect, it } from 'vitest';
import { placeBubble } from './bubble-placement';

const game = { width: 1200, height: 700 };
const bubble = { width: 340, height: 200 };

const isInsideGame = ({ left, top }: { left: number; top: number }) =>
  left >= 0 && top >= 0 && left + bubble.width <= game.width && top + bubble.height <= game.height;

describe('placeBubble', () => {
  it('uses the preferred side when there is room', () => {
    const target = { left: 100, top: 100, width: 200, height: 40 };
    expect(placeBubble(target, bubble, game, 'right').left).toBe(318);
  });

  it('leaves the preferred side when the bubble would be cut off', () => {
    const target = { left: 600, top: 70, width: 590, height: 480 };
    const position = placeBubble(target, bubble, game, 'below');
    expect(isInsideGame(position)).toBe(true);
    expect(position.left + bubble.width).toBeLessThanOrEqual(target.left);
  });

  it('stays inside the game when the target leaves no room on any side', () => {
    const target = { left: 0, top: 0, width: 1200, height: 700 };
    expect(isInsideGame(placeBubble(target, bubble, game))).toBe(true);
  });
});
