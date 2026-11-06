import { describe, expect, it } from 'vitest';
import { requestedChallengeId } from './challenges';

describe('requestedChallengeId', () => {
  it('opens the challenge named in the link', () => {
    expect(requestedChallengeId('?reto=3')).toBe(3);
  });

  it('falls back to the first challenge without a valid one', () => {
    expect(requestedChallengeId('')).toBe(1);
    expect(requestedChallengeId('?reto=99')).toBe(1);
    expect(requestedChallengeId('?reto=dos')).toBe(1);
  });
});
