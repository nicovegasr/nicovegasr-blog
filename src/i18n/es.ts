export const spanish = {
  'site.title': 'Nicolás Vegas',
  'site.description':
    'Blog personal de Nicolás Vegas, ingeniero informático con mentalidad DevOps. Hablo sobre desarrollo de software y hago cosas.',

  'navigation.home': 'Inicio',
  'navigation.menu': 'Menú',
  'navigation.sections': 'Secciones',

  'content.blog': 'Blog',
  'content.pills': 'Píldoras',
  'content.labs': 'Laboratorios',

  'language.current': 'Español',

  'theme.toggle': 'Cambiar tema',

  'repoStar.prompt': '¿Te ha servido?',
  'repoStar.count': 'Estrellas del repositorio en GitHub',

  'footer.rights': 'Todos los derechos reservados',
} as const;

export type TranslationKey = keyof typeof spanish;

export type Dictionary = Record<TranslationKey, string>;
