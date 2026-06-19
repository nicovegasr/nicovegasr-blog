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

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
