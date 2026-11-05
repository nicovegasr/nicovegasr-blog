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
  readonly title: string;
  /** One sentence. The lesson comes from what the player sees, not from this text. */
  readonly mission: string;
  /** How much history the logs cover, shown under app_logs so the volume reads at a glance. */
  readonly period?: string;
  readonly scenario: Scenario;
  readonly cards: readonly Card[];
  readonly newCards: readonly Card[];
  readonly objectives: readonly [Objective, Objective, Objective];
  /** Shown once the three stars are won. */
  readonly takeaway: string;
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 1,
    title: 'Una semana de logs',
    mission: 'Solo una semana: son pocos datos y la memoria no es un problema. Monta el script y ejecútalo.',
    period: 'una semana',
    scenario: { logs: 20_000, runs: 40, memoryLimitMegabytes: 1_024, querySeconds: 0.005, incidents: [], steps: 90 },
    cards: ['load-all', 'cursor', 'one-by-one'],
    newCards: ['load-all', 'cursor', 'one-by-one'],
    objectives: [{ kind: 'survive' }, { kind: 'seconds', max: 1 }, { kind: 'megabytes', max: 512 }],
    takeaway: 'Con pocos datos, traerlo todo a una lista es perfectamente razonable.',
  },
  {
    id: 2,
    title: 'Meses de histórico',
    mission: 'Ahora va el histórico entero: 200 millones de logs que no caben en una mochila de 512 MB.',
    period: 'meses de histórico',
    scenario: { logs: 200_000_000, runs: 20_000, memoryLimitMegabytes: 512, querySeconds: 0.005, incidents: [], steps: 150 },
    cards: ['load-all', 'cursor', 'pages', 'one-by-one'],
    newCards: ['pages'],
    objectives: [{ kind: 'survive' }, { kind: 'megabytes', max: 256 }, { kind: 'connection', max: 60 }],
    takeaway: 'Con un recorrido tan largo, el cursor retiene la conexión todo el rato; las páginas la sueltan entre consulta y consulta.',
  },
  {
    id: 3,
    title: 'La consulta pesada',
    mission: '5 millones de logs y una consulta que cruza tres tablas: tarda 30 s en devolver la primera fila.',
    scenario: { logs: 5_000_000, runs: 5_000, memoryLimitMegabytes: 512, querySeconds: 30, incidents: [], steps: 150 },
    cards: ['load-all', 'cursor', 'pages', 'one-by-one'],
    newCards: [],
    objectives: [{ kind: 'survive' }, { kind: 'megabytes', max: 256 }, { kind: 'seconds', max: 10 * 60 }],
    takeaway: 'El cursor paga la consulta una vez, a cambio de tener la conexión ocupada todo el recorrido.',
  },
  {
    id: 4,
    title: 'Se reinicia sin parar',
    mission: '50 millones de logs, reinicios en bucle y otro job que te quita memoria. Elige el lote antes.',
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
    takeaway: 'El mejor lote es el más grande que cabe en el peor momento, no en el normal.',
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
