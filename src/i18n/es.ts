export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog personal de Nicolás Vegas, ingeniero informático con mentalidad DevOps. Hablo sobre desarrollo de software y hago cosas.',

  'navigation.home': 'Inicio',
  'navigation.menu': 'Menú',
  'navigation.sections': 'Secciones',

  'content.blogLead': 'Lo que escribo y lo que me gusta.',
  'content.pillsLead': 'Conceptos reducidos al mínimo para ver cómo funcionan, sin perder rigor.',
  'content.blog': 'Blog',
  'content.pills': 'Píldoras',
  'content.labs': 'Laboratorios',

  'language.current': 'Español',

  'theme.toggle': 'Cambiar tema',

  'blog.starPrompt': '¿Te ha servido?',
  'blog.starCount': 'Estrellas del repositorio en GitHub',
  'blog.readingTime': 'min de lectura',
  'blog.readMore': 'Leer →',
  'blog.readOn': 'Leer en',
  'blog.empty': 'Aún no hay artículos publicados.',
  'blog.searchPlaceholder': 'Buscar artículos…',
  'blog.searchEmpty': 'Ningún artículo coincide con la búsqueda.',
  'blog.relatedTitle': 'Artículos relacionados',
  'blog.paginationLabel': 'Páginas de artículos',
  'blog.page': 'Página',
  'blog.previousPage': '← Anterior',
  'blog.nextPage': 'Siguiente →',

  'friendBlogs.title': 'Blogs relacionados',
  'friendBlogs.lead': 'Más gente con la que seguir aprendiendo.',
  'friendBlogs.pause': 'Pausar',
  'friendBlogs.play': 'Reanudar',
  'friendBlogs.choose': 'Elegir blog',
  'friendBlogs.preview': 'Portada de la web',
  'friendBlogs.carousel': 'carrusel',
  'friendBlogs.visit': 'Visitar blog',
  'friendBlogs.dragHint': 'Arrastra para explorar',
  'friendBlogs.swipeHint': 'Desliza para explorar',

  'about.metaDescription':
    'Nicolás Vegas, ingeniero informático: lo que conozco y mi trayectoria.',
  'about.portraitAlt': 'Foto de Nicolás Vegas',
  'about.heroStatement': 'Nicolás Vegas',
  'about.heroRole': 'Ingeniero de software · Sistemas de alto volumen · Desarrollo con IA',
  'about.heroIntro': 'Me gusta entender cómo funcionan las cosas por dentro y resolver los problemas con pragmatismo.',
  'about.projectsLink': 'Ver proyectos',
  'about.contributionsTitle': 'Lo que aporto',
  'about.skillsTitle': 'Lo que conozco',
  'about.timelineTitle': 'Trayectoria',
  'about.present': 'Actualidad',
  'about.organizationWebsite': 'Visitar la web de',

  'pills.metaDescription':
    'Píldoras de Nicolás Vegas sobre Docker, APIs y diseño de sistemas: conceptos concretos explicados en pequeño.',
  'pills.upcoming': 'En obras 🚧',
  'pills.heading': 'Píldoras formativas',
  'pills.comingSoonText':
    'Conceptos concretos explicados en pequeño, para asentar las bases sin rodeos. Pronto empezarán a aparecer aquí.',
  'pills.reader.keyboardTipLabel': 'Consejo de navegación',
  'pills.reader.keyboardTip': 'Usa las flechas ← y → para cambiar de píldora.',
  'pills.reader.swipeTip': '← desliza para cambiar →',
  'pills.reader.enlargeImage': 'Ampliar imagen',
  'pills.reader.closeImage': 'Cerrar imagen',
  'pills.reader.nextSeries': 'Siguiente serie',
  'pills.reader.allSeries': 'Ver todas las series',
  'pills.reader.heading': 'El recorrido',
  'pills.reader.chapter': 'Píldora',
  'pills.reader.next': 'Siguiente',
  'pills.reader.previous': 'Anterior',
  'pills.reader.toggleIndex': 'Mostrar u ocultar el recorrido',
  'pills.reader.paginationLabel': 'Entre píldoras',
  'pills.seriesCount': 'píldoras',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
