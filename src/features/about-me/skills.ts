import type { Locale } from '@/i18n/locale';

export type SkillArea = {
  readonly title: string;
  readonly summary: string;
  readonly technologies: readonly string[];
  readonly pose: string;
};

const technologies = {
  frontend: ['TypeScript', 'React', 'React Native', 'Redux', 'TanStack Query'],
  databases: ['PostgreSQL', 'Oracle', 'MongoDB', 'S3', 'Object storage'],
  infrastructure: ['Kubernetes', 'OpenShift', 'ArgoCD', 'Docker', 'GitHub Actions', 'Jenkins', 'AWS', 'Graylog'],
  artificialIntelligence: ['Claude Code', 'Codex', 'Copilot', 'Agentes', 'Skills'],
};

const skillAreasByLocale: Record<Locale, readonly SkillArea[]> = {
  es: [
    {
      title: 'Backend',
      summary:
        'Más allá del CRUD: alta concurrencia, sistemas asíncronos, procesamiento de datos con jobs programados, autenticación y autorización, con gestión de fallos desde el diseño.',
      technologies: ['Java', 'Spring', 'Spring Batch', 'Python', 'Node', '.NET', 'C++', 'RabbitMQ'],
      pose: 'standing',
    },
    {
      title: 'Frontend',
      summary:
        'Construyo interfaces de principio a fin: manejo del estado, caché de peticiones, rutas protegidas y paginación.',
      technologies: technologies.frontend,
      pose: 'presenting',
    },
    {
      title: 'Bases de datos',
      summary:
        'Diseño para el volumen cuando el problema lo requiere: índices, particionado e integridad referencial dentro de cada base de datos.',
      technologies: technologies.databases,
      pose: 'thinking',
    },
    {
      title: 'Infraestructura',
      summary:
        'Entiendo cómo llega mi código a producción: pipelines, imágenes, despliegues en Kubernetes y AWS, y diagnóstico de fallos.',
      technologies: technologies.infrastructure,
      pose: 'standing',
    },
    {
      title: 'IA',
      summary:
        'La IA forma parte de mi forma de desarrollar: asistentes de código, skills y agentes especializados.',
      technologies: technologies.artificialIntelligence,
      pose: 'welcoming',
    },
  ],
  en: [
    {
      title: 'Backend',
      summary:
        'Beyond CRUD: high concurrency, asynchronous systems, data processing with scheduled jobs, authentication and authorization, with failure handling designed in.',
      technologies: ['Java', 'Spring', 'Spring Batch', 'Python', 'Node', '.NET', 'C++', 'RabbitMQ'],
      pose: 'standing',
    },
    {
      title: 'Frontend',
      summary:
        'I build interfaces end to end: state management, request caching, protected routes and pagination.',
      technologies: technologies.frontend,
      pose: 'presenting',
    },
    {
      title: 'Databases',
      summary:
        'I design for volume when the problem calls for it: indexes, partitioning and referential integrity within each database.',
      technologies: technologies.databases,
      pose: 'thinking',
    },
    {
      title: 'Infrastructure',
      summary:
        'I understand how my code reaches production: pipelines, images, deployments on Kubernetes and AWS, and failure diagnosis.',
      technologies: technologies.infrastructure,
      pose: 'standing',
    },
    {
      title: 'AI',
      summary:
        'AI is part of how I develop: coding assistants, skills and specialized agents.',
      technologies: technologies.artificialIntelligence,
      pose: 'welcoming',
    },
  ],
};

export const findSkillAreas = (locale: Locale): readonly SkillArea[] => skillAreasByLocale[locale];
