import type { Card, Outcome, Scenario } from './engine';

/** How far ahead (as a share of the logs) an incident is announced, so the player can react. */
export const INCIDENT_WARNING = 0.12;

export type Objective =
  | { readonly kind: 'survive' }
  | { readonly kind: 'seconds'; readonly max: number }
  | { readonly kind: 'megabytes'; readonly max: number }
  | { readonly kind: 'write-trips'; readonly max: number }
  | { readonly kind: 'connection'; readonly max: number };

export interface Challenge {
  readonly id: number;
  readonly scenario: Scenario;
  readonly cards: readonly Card[];
  readonly newCards: readonly Card[];
  readonly objectives: readonly [Objective, Objective, Objective];
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 1,
    scenario: { logs: 20_000, runs: 40, memoryLimitMegabytes: 1_024, querySeconds: 0.005, incidents: [], steps: 90 },
    cards: ['load-all', 'cursor', 'one-by-one'],
    newCards: ['load-all', 'cursor', 'one-by-one'],
    objectives: [{ kind: 'survive' }, { kind: 'seconds', max: 1 }, { kind: 'megabytes', max: 512 }],
  },
  {
    id: 2,
    scenario: {
      logs: 200_000_000,
      runs: 20_000,
      memoryLimitMegabytes: 512,
      querySeconds: 0.005,
      incidents: [],
      steps: 150,
    },
    cards: ['load-all', 'cursor', 'pages', 'one-by-one'],
    newCards: ['pages'],
    objectives: [{ kind: 'survive' }, { kind: 'megabytes', max: 256 }, { kind: 'connection', max: 60 }],
  },
  {
    id: 3,
    scenario: { logs: 5_000_000, runs: 5_000, memoryLimitMegabytes: 512, querySeconds: 30, incidents: [], steps: 150 },
    cards: ['load-all', 'cursor', 'pages', 'one-by-one'],
    newCards: [],
    objectives: [{ kind: 'survive' }, { kind: 'megabytes', max: 256 }, { kind: 'seconds', max: 10 * 60 }],
  },
  {
    id: 4,
    scenario: {
      logs: 50_000_000,
      runs: 2_000_000,
      memoryLimitMegabytes: 512,
      querySeconds: 0.005,
      incidents: [
        { kind: 'restart-loop', from: 0.3, to: 0.6, amount: 4 },
        { kind: 'memory-squeeze', from: 0.72, to: 0.9, amount: 330 },
      ],
      steps: 480,
    },
    cards: ['load-all', 'cursor', 'pages', 'one-by-one', 'batches'],
    newCards: ['batches'],
    objectives: [{ kind: 'survive' }, { kind: 'seconds', max: 5 * 60 }, { kind: 'write-trips', max: 1_000 }],
  },
];

export const isMet = (objective: Objective, outcome: Outcome): boolean => {
  if (outcome.killedBy !== null) return false;
  switch (objective.kind) {
    case 'survive':
      return true;
    case 'seconds':
      return outcome.seconds <= objective.max;
    case 'megabytes':
      return outcome.peakMegabytes <= objective.max;
    case 'write-trips':
      return outcome.writeTrips <= objective.max;
    case 'connection':
      return outcome.longestConnectionSeconds <= objective.max;
  }
};

export const starsFor = (challenge: Challenge, outcome: Outcome): number =>
  challenge.objectives.filter((objective) => isMet(objective, outcome)).length;

export const CHALLENGE_QUERY_PARAMETER = 'reto';

/** The catalogue links straight to a challenge with `?reto=N`; anything else opens challenge 1. */
export const requestedChallengeId = (search: string): number => {
  const requested = Number(new URLSearchParams(search).get(CHALLENGE_QUERY_PARAMETER));
  return CHALLENGES.some(({ id }) => id === requested) ? requested : 1;
};
