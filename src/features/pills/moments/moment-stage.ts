// Each system design pill names its stage to show the interactive ending for it.
export const MOMENT_STAGES = [
  'kiss',
  'srp',
  'least-surprise',
  'immutability',
  'cohesion',
  'error-handling',
  'coupling',
  'async-retries',
  'design-for-testing',
] as const;

export type MomentStage = (typeof MOMENT_STAGES)[number];

export const isMomentStage = (value: string): value is MomentStage =>
  (MOMENT_STAGES as readonly string[]).includes(value);
