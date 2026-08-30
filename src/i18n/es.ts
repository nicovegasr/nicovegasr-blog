export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog personal de Nicolás Vegas, ingeniero informático con mentalidad DevOps. Hablo sobre desarrollo de software y hago cosas.',

  'navigation.blog': 'Blog',
  'navigation.about': 'Sobre mí',
  'navigation.work': 'Dónde trabajo',
  'navigation.menu': 'Menú',

  'writing.articles': 'Artículos',
  'writing.pills': 'Píldoras',

  'language.switchTo': 'English',
  'language.current': 'Español',

  'theme.toggle': 'Cambiar tema',

  'blog.introTitle': 'Diseño sistemas que se sostienen.',
  'blog.introText':
    'Sistemas confiables ante los fallos y eficientes bajo carga.',
  'blog.introLink': 'Más sobre mí →',
  'blog.readingTime': 'min de lectura',
  'blog.readMore': 'Leer →',
  'blog.empty': 'Aún no hay artículos publicados.',
  'blog.searchPlaceholder': 'Buscar artículos…',
  'blog.searchEmpty': 'Ningún artículo coincide con la búsqueda.',
  'blog.relatedTitle': 'Artículos relacionados',

  'about.metaDescription':
    'Nicolás Vegas, ingeniero informático: a qué me dedico, mis principios, mi stack y mi trayectoria.',
  'about.heroTitle': 'Sobre mí',
  'about.lead':
    'Me gusta entender cómo funcionan las cosas por dentro y aplicarlo con criterio, sin atarme a una parte del stack: voy donde el problema lo pida.',
  'about.approach':
    'Con los años he aprendido que lo que marca la diferencia rara vez es la tecnología, sino entender bien el problema, sopesar las decisiones y construir algo que se sostenga.',
  'about.principlesTitle': 'Principios',
  'about.stackTitle': 'Stack',
  'about.timelineTitle': 'Trayectoria',
  'about.present': 'Actualidad',

  'pills.metaDescription':
    'Píldoras formativas de Nicolás Vegas: conceptos concretos explicados en pequeño. Próximamente.',
  'pills.heading': 'Píldoras formativas',
  'pills.comingSoonText':
    'Conceptos concretos explicados en pequeño, para asentar las bases sin rodeos. Pronto empezarán a aparecer aquí.',
  'pills.railLabel': 'Recorrido de la serie',
  'pills.bonus': 'bonus',
  'pills.summary': 'Resumen',
  'pills.summaryLabel': 'la foto completa',
  'pills.summaryHeading': 'Resumen de la serie',
  'pills.previous': '← Anterior',
  'pills.next': 'Siguiente →',
  'pills.seriesCount': 'píldoras',

  'work.since': 'Desde',
  'work.valuesPrefix': 'Cómo enfoco el trabajo, en mis ',
  'work.valuesLink': 'principios',
  'work.valuesSuffix': '.',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
