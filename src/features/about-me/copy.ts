import { defineCopy } from '@/i18n/copy';
const es = {
  metaDescription: 'Nicolás Vegas, ingeniero informático: lo que conozco y mi trayectoria.',
  portraitAlt: 'Foto de Nicolás Vegas',
  heroStatement: 'Nicolás Vegas',
  heroRole: 'Ingeniero de software · Sistemas de alto volumen · Desarrollo con IA',
  heroIntro: 'Me gusta entender cómo funcionan las cosas por dentro y resolver los problemas con pragmatismo.',
  projectsLink: 'Ver proyectos',
  contributionsTitle: 'Lo que aporto',
  skillsTitle: 'Lo que conozco',
  timelineTitle: 'Trayectoria',
  present: 'Actualidad',
  organizationWebsite: 'Visitar la web de',
  agentReview: {
    guardrails: 'Guardarraíles',
    inEveryAgentS: 'en la memoria de cada agente, no solo en un repositorio',
    myRules: 'Mis reglas',
    myReview: 'Mi revisión',
    illustrativeDiagramClaudeCode:
      'Esquema ilustrativo: Claude Code y Codex parten de mis reglas, trabajan a la vez y su trabajo termina en mi revisión.',
  },
  loadWaterfall: {
    firstVisit: 'Primera visita',
    secondVisit: 'Segunda visita',
    thirdVisit: 'Tercera visita',
    to: 'a',
    lessWaitingForPages: 'menos espera al cargar',
    illustrativeDiagramFirstVisit:
      'Esquema ilustrativo: la primera visita a una pantalla espera a que se resuelvan sus peticiones; las siguientes reutilizan las respuestas guardadas y tardan menos.',
  },
  pageLookup: {
    to: 'a',
    postgresqlPagesReadTo: 'páginas de PostgreSQL leídas para encontrar 1 fila entre 10 millones',
    index: 'Índice',
    tablePages: 'Páginas de la tabla',
    noIndex: 'Sin índice',
    withIndex: 'Con índice',
    withoutIndexQueryReads:
      'Sin índice, la consulta lee todas las páginas de la tabla. Con índice, recorre tres niveles del índice hasta la página donde está la fila, lee esa página y toma la fila dentro de ella.',
  },
  batchMetric: {
    recordsIn5Minutes: 'registros en 5 minutos',
    batchesOf: 'Lotes de',
    fileReadingAndSelective:
      'Lectura de archivo y escritura selectiva, en lotes de 1.000 registros. La trama ilustra el procesamiento por lotes.',
  },
  rollingDeployment: {
    whenDeployingNewVersion: 'al desplegar una nueva versión',
    twoReplicaDeploymentMoves:
      'Un Deployment de dos réplicas pasa de la versión 1 a la 2: cada pod nuevo arranca y, solo cuando está sano, se elimina uno antiguo.',
  },
};

const en = {
  metaDescription: 'Nicolás Vegas, software engineer: what I know and my journey.',
  portraitAlt: 'Photo of Nicolás Vegas',
  heroStatement: 'Nicolás Vegas',
  heroRole: 'Software engineer · High-volume systems · AI-assisted development',
  heroIntro: 'I like understanding how things work under the hood and solving problems pragmatically.',
  projectsLink: 'View projects',
  contributionsTitle: 'What I bring',
  skillsTitle: 'What I know',
  timelineTitle: 'Journey',
  present: 'Present',
  organizationWebsite: 'Visit the website of',
  agentReview: {
    guardrails: 'Guardrails',
    inEveryAgentS: "in every agent's memory, not just in one repository",
    myRules: 'My rules',
    myReview: 'My review',
    illustrativeDiagramClaudeCode:
      'Illustrative diagram: Claude Code and Codex start from my rules, work at the same time and their work ends in my review.',
  },
  loadWaterfall: {
    firstVisit: 'First visit',
    secondVisit: 'Second visit',
    thirdVisit: 'Third visit',
    to: 'to',
    lessWaitingForPages: 'less waiting for pages to load',
    illustrativeDiagramFirstVisit:
      'Illustrative diagram: the first visit to a screen waits for its requests; later visits reuse the saved responses and take less time.',
  },
  pageLookup: {
    to: 'to',
    postgresqlPagesReadTo: 'PostgreSQL pages read to find 1 row among 10 million',
    index: 'Index',
    tablePages: 'Table pages',
    noIndex: 'No index',
    withIndex: 'With index',
    withoutIndexQueryReads:
      'Without an index, the query reads every table page. With one, it walks three index levels to the page that holds the row, reads that page and takes the row from it.',
  },
  batchMetric: {
    recordsIn5Minutes: 'records in 5 minutes',
    batchesOf: 'Batches of',
    fileReadingAndSelective:
      'File reading and selective writes, in batches of 1,000 records. The pattern illustrates batch processing.',
  },
  rollingDeployment: {
    whenDeployingNewVersion: 'when deploying a new version',
    twoReplicaDeploymentMoves:
      'A two-replica Deployment moves from version 1 to version 2: each new pod starts and, only once it is healthy, an old one is removed.',
  },
};

export const aboutMeCopy = defineCopy({ es, en });
