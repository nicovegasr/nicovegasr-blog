export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog personal de Nicolás Vegas, ingeniero informático con mentalidad DevOps. Hablo sobre desarrollo de software y hago cosas.',

  'navigation.blog': 'Blog',
  'navigation.about': 'Sobre mí',
  'navigation.work': 'Dónde trabajo',
  'navigation.contact': 'Contacto',

  'language.switchTo': 'English',
  'language.current': 'Español',

  'blog.introTitle': 'Hola, soy Nicolás',
  'blog.introText':
    'Ingeniero informático. Aquí escribo sobre desarrollo de software y comparto lo que voy aprendiendo por el camino.',
  'blog.readingTime': 'min de lectura',
  'blog.readMore': 'Leer →',
  'blog.empty': 'Aún no hay artículos publicados.',

  'about.metaDescription':
    'Nicolás Vegas, ingeniero informático: a qué me dedico, mis principios, mi stack y mi trayectoria.',
  'about.heroTitle': 'Sobre mí',
  'about.lead':
    'Soy Nicolás, ingeniero informático. Empecé en el backend y nunca me quedé ahí: bases de datos, infraestructura, frontend — voy donde el problema lo pida.',
  'about.approach':
    'Antes de escribir una línea entiendo el problema entero: qué impacto tiene, qué alternativas hay, qué solución encaja de verdad. Y lo construyo con el equipo, porque el buen software no sale de una sola cabeza.',
  'about.principlesTitle': 'Principios',
  'about.stackTitle': 'Stack',
  'about.timelineTitle': 'Trayectoria',
  'about.projectsTitle': 'Proyectos',
  'about.projectsEmpty': 'Aún no hay proyectos publicados.',
  'about.present': 'Actualidad',

  'work.metaDescription':
    'Dónde trabajo ahora: Lean Mind, una consultora de software en Tenerife donde el oficio va primero.',
  'work.since': 'Desde',
  'work.valuesPrefix': 'Es ',
  'work.valuesLink': 'lo que creo',
  'work.valuesSuffix': ': más rápido no es mejor; lo son los conceptos bien aplicados.',

  'contact.metaDescription':
    'Cómo escribirme: correo directo, LinkedIn, GitHub y Medium. Sin formularios.',
  'contact.heroTitle': 'Contacto',
  'contact.lead':
    '¿Tienes algo entre manos o solo quieres saludar? El correo es lo más directo, pero me encontrarás también por aquí.',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
