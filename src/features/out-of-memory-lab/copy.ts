import type { Card, IncidentKind } from './engine';
import type { Side } from './bubble-placement';

export interface CardCopy {
  readonly label: string;
  /** The name of the choice in the table that compares attempts. */
  readonly shortLabel: string;
  readonly description: string;
  /** The Java on the back of the card: the same lines it drops into the method. */
  readonly code: string;
}

export const cardCopy: Record<Card, CardCopy> = {
  'load-all': {
    label: 'Traerlos todos de golpe',
    shortLabel: 'Todos de golpe',
    description: 'Pides el histórico entero y luego lo revisas.',
    code: 'List<LogEntry> logs =\n  repo\n  .findAllOrdered(\n    id);',
  },
  cursor: {
    label: 'Que te los vayan pasando',
    shortLabel: 'Poco a poco',
    description: 'Una consulta, y la base de datos te los entrega poco a poco.',
    code: 'try (Stream<LogEntry>\n  logs = repo\n  .streamAllOrdered(\n    id)) {',
  },
  pages: {
    label: 'Pedirlos de mil en mil',
    shortLabel: 'De mil en mil',
    description: 'Pides mil, los revisas y pides los siguientes.',
    code: 'while (!(page = repo\n  .findPageAfter(id,\n    last, 1_000))\n  .isEmpty()) {',
  },
  'one-by-one': {
    label: 'Guardar cada nota al momento',
    shortLabel: 'Nota a nota',
    description: 'Un viaje a la base de datos por cada una.',
    code: 'summaryRepository\n  .save(summary);',
  },
  batches: {
    label: 'Juntarlas en lotes',
    shortLabel: 'Lotes',
    description: 'Las vas juntando y guardas el lote entero de una vez.',
    code: 'batch.add(summary);\nif (batch.size()\n    == batchSize) {\n  write(batch);\n  batch.clear(); }',
  },
};

export const incidentCopy: Record<
  IncidentKind,
  { readonly warning: string; readonly title: string; readonly text: string; readonly tip: string }
> = {
  'restart-loop': {
    warning: 'Se acerca: la aplicación va a entrar en bucle de reinicios.',
    title: '¡Bucle de reinicios!',
    text: 'Aparecen cuatro veces más ejecuciones que anotar.',
    tip: 'Va a haber cuatro veces más notas que guardar: con lotes pequeños, muchos más viajes.',
  },
  'memory-squeeze': {
    warning: 'Se acerca: va a arrancar otro job pesado en la misma aplicación.',
    title: '¡Arranca otro job!',
    text: 'Otro job de la aplicación se queda con 330 MB del heap.',
    tip: 'Va a arrancar otro job en la misma aplicación y se quedará con 330 MB del heap. Tu lote tiene que caber en lo que quede.',
  },
};

export const hints = {
  list: 'La lista necesita todo el histórico en la mochila antes de revisar el primer log.',
  batch: 'El lote también viaja en la mochila: uno demasiado grande la vuelve a llenar.',
  squeeze: 'Arrancó otro job y tu lote ya no cabía en lo que quedaba de heap. El lote se elige pensando en el peor momento.',
  repeatedQuery: 'Cada página vuelve a lanzar la consulta, y aquí cada lanzamiento cuesta 30 s.',
  manyPages: 'Cada página es una consulta más. Con tantas, el tiempo se acumula.',
  oneByOne: 'Cada nota es un viaje a la base de datos. Júntalas.',
  smallBatch: 'Con tantas notas, lotes tan pequeños siguen siendo demasiados viajes.',
  memory: 'Aguanta, pero va más cargado de lo necesario.',
  longConnection: 'El cursor tiene la conexión abierta todo el recorrido: minutos bloqueando el pool y una transacción larga. Pide páginas y suéltala entre una y otra.',
  smallStream: 'Con una semana de logs, abrir un cursor cuesta más que traerlos todos. Con pocos datos, lo simple gana.',
} as const;

export const objectiveCopy = {
  survive: 'Sin OOM Killed',
  seconds: (limit: string) => `Menos de ${limit}`,
  megabytes: (limit: string) => `Menos de ${limit}`,
  'write-trips': (limit: string) => `Menos de ${limit} viajes`,
  connection: (limit: string) => `Conexión < ${limit} seguido`,
} as const;

export const resultCopy = {
  killed: 'OOM Killed',
  perfect: '¡Tres estrellas!',
  partial: 'Funciona, pero se puede mejorar',
} as const;

export const waitingCopy = {
  read: 'Esperando a que coloques una carta ①…',
  write: 'Esperando a que coloques una carta ②…',
  run: 'Pulsa Ejecutar para seguir…',
} as const;

export interface TutorialStep {
  readonly id: string;
  readonly target: string;
  readonly title: string;
  readonly text: string;
  /** Where the bubble goes if there is room: it should not cover what the step talks about. */
  readonly side: Side;
  /** What the player has to touch, when it is not the target itself. */
  readonly alsoHighlight?: string;
  /** Without `until`, the bubble shows a button to continue. */
  readonly until?: 'read' | 'write' | 'run';
}

export const tutorial: readonly TutorialStep[] = [
  {
    id: 'stage',
    target: '[data-stage]',
    side: 'left',
    title: 'Tu aplicación se queda sin memoria de vez en cuando.',
    text: 'Este script revisa sus logs para contar cuántas veces ha pasado. Tú decides cómo está escrito.',
  },
  {
    id: 'memory',
    target: '[data-memory]',
    side: 'below',
    title: 'Esta barra es la mochila del script: su memoria.',
    text: 'Todo lo que retiene va dentro. Si se llena, el sistema lo mata: OOM Killed.',
  },
  {
    id: 'stars',
    target: '[data-objectives]',
    side: 'below',
    title: 'Cada reto tiene tres estrellas.',
    text: 'Aquí ves qué tienes que conseguir, y mientras corre, cómo vas en cada una.',
  },
  {
    id: 'read',
    target: '[data-hole="read"]',
    side: 'right',
    alsoHighlight: '[data-group="read"]',
    title: 'El código tiene huecos. Este decide cómo coge los logs.',
    text: 'Toca una carta del grupo ① de abajo, o arrástrala aquí. Con </> ves su código.',
    until: 'read',
  },
  {
    id: 'write',
    target: '[data-hole="write"]',
    side: 'right',
    alsoHighlight: '[data-group="write"]',
    title: 'Este hueco decide cómo guarda lo que anota.',
    text: 'Toca la carta del grupo ② para seguir.',
    until: 'write',
  },
  {
    id: 'run',
    target: '[data-run]',
    side: 'left',
    title: '¡Listo! Ejecuta y vigila la mochila.',
    text: 'Puedes repetir cada reto las veces que quieras, con otras cartas.',
    until: 'run',
  },
];

export const tips = {
  newCard: (label: string) => ({ title: `Carta nueva: ${label}`, text: 'Pruébala.' }),
  dial: {
    title: 'Elige el tamaño del lote antes de ejecutar.',
    text: 'Mientras corre ya no se puede tocar, igual que en producción: lo cambiarías desplegando otra vez.',
  },
  incident: (text: string) => ({
    title: 'Viene un incidente. He pausado para que lo veas venir.',
    text: `${text} Veamos si aguanta el lote que elegiste.`,
  }),
} as const;
