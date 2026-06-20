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
    'Soy Nicolás, ingeniero informático. Vengo del backend, pero me cuesta quedarme en una sola etiqueta: me muevo con comodidad por datos, infraestructura y front cuando hace falta.',
  'about.approach':
    'Intento entender los problemas por completo antes de tocar nada —medir el impacto, mirar las alternativas, plantear soluciones— y avanzar siempre en equipo, porque el buen software se hace en equipo.',
  'about.principlesTitle': 'Principios',
  'about.stackTitle': 'Stack',
  'about.timelineTitle': 'Trayectoria',
  'about.projectsTitle': 'Proyectos',
  'about.projectsEmpty': 'Aún no hay proyectos publicados.',
  'about.present': 'Actualidad',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
