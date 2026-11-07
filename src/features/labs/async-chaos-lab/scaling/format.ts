import type { ScalingConfig } from './engine';

export const number = (value: number, digits = 0) => value.toFixed(digits).replace(/\.0+$/, '');
export const stepWithMostWaiting = (waitTicks: number[]) => {
  const longest = Math.max(...waitTicks);
  return longest > 0 ? waitTicks.indexOf(longest) : null;
};
export const teamLabel = ({ workers, concurrencyPerWorker }: ScalingConfig) => `${workers} W × ${concurrencyPerWorker}`;

/** The controller owns playback and presentation. All processing rules live in engine.ts. */
