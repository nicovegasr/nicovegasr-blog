export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog de Nicolás Vegas sobre ingeniería de software backend, arquitectura y los compromisos del oficio.',

  'navigation.blog': 'Blog',
  'navigation.about': 'Sobre mí',
  'navigation.work': 'Dónde trabajo',
  'navigation.contact': 'Contacto',

  'language.switchTo': 'English',
  'language.current': 'Español',

  'footer.builtWith': 'Hecho con Astro',
  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
