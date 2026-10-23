export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog personal de Nicolás Vegas, ingeniero informático con mentalidad DevOps. Hablo sobre desarrollo de software y hago cosas.',

  'navigation.home': 'Inicio',
  'navigation.about': 'Sobre mí',
  'navigation.menu': 'Menú',
  'navigation.sections': 'Secciones',

  'writing.articles': 'Artículos',
  'writing.pills': 'Píldoras',
  'writing.labs': 'Laboratorios',

  'language.switchTo': 'English',
  'language.current': 'Español',

  'theme.toggle': 'Cambiar tema',

  'blog.introTitle': 'Ingeniero de software',
  'blog.introText':
    'Me gusta investigar y entender cómo funcionan las herramientas que usamos en el día a día.',
  'blog.introLink': 'Más sobre mí →',
  'blog.starPrompt': '¿Te ha servido?',
  'blog.starCount': 'Estrellas del repositorio en GitHub',
  'blog.readingTime': 'min de lectura',
  'blog.readMore': 'Leer →',
  'blog.empty': 'Aún no hay artículos publicados.',
  'blog.searchPlaceholder': 'Buscar artículos…',
  'blog.searchEmpty': 'Ningún artículo coincide con la búsqueda.',
  'blog.relatedTitle': 'Artículos relacionados',

  'about.metaDescription':
    'Nicolás Vegas, ingeniero informático: a qué me dedico, mi stack y mi trayectoria.',
  'about.heroTitle': 'Sobre mí',
  'about.lead':
    'Disfruto investigando cómo funcionan las cosas por dentro para aprovechar todo lo que las tecnologías nos ofrecen, construyendo software predecible, escalable y mantenible.',
  'about.approach':
    'Me interesa el mundo de la arquitectura de software y de soluciones, explorar las mejores tecnologías para resolver problemas y plantear una arquitectura que evolucione con el tiempo de forma sostenible.',
  'about.stackTitle': 'Stack',
  'about.timelineTitle': 'Trayectoria',
  'about.present': 'Actualidad',

  'pills.metaDescription':
    'Píldoras formativas de Nicolás Vegas: conceptos concretos explicados en pequeño. Próximamente.',
  'pills.upcoming': 'En obras 🚧',
  'pills.heading': 'Píldoras formativas',
  'pills.comingSoonText':
    'Conceptos concretos explicados en pequeño, para asentar las bases sin rodeos. Pronto empezarán a aparecer aquí.',
  'pills.summary': 'Resumen',
  'pills.reader.keyboardTipLabel': 'Consejo de navegación',
  'pills.reader.keyboardTip': 'Usa las flechas ← y → para cambiar de píldora.',
  'pills.reader.dismissKeyboardTip': 'Cerrar consejo de navegación',
  'pills.reader.nextSeries': 'Siguiente serie',
  'pills.reader.allSeries': 'Ver todas las series',
  'pills.reader.heading': 'El recorrido',
  'pills.reader.chapter': 'Capítulo',
  'pills.reader.bonus': 'Extra',
  'pills.reader.next': 'Siguiente',
  'pills.reader.previous': 'Anterior',
  'pills.reader.back': 'Volver al recorrido',
  'pills.reader.toggleIndex': 'Mostrar u ocultar el recorrido',
  'pills.reader.paginationLabel': 'Entre píldoras',
  'pills.seriesCount': 'píldoras',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
