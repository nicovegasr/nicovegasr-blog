import type { Locale } from '@/i18n/locale';

const es = {
  title: 'Blogs relacionados',
  lead: 'Más gente con la que seguir aprendiendo.',
  pause: 'Pausar',
  play: 'Reanudar',
  choose: 'Elegir blog',
  preview: 'Portada de la web',
  carousel: 'carrusel',
  visit: 'Visitar blog',
  dragHint: 'Arrastra para explorar',
  swipeHint: 'Desliza para explorar',
};

const en: typeof es = {
  title: 'Related blogs',
  lead: 'More people to keep learning from.',
  pause: 'Pause',
  play: 'Resume',
  choose: 'Choose a blog',
  preview: 'Website homepage',
  carousel: 'carousel',
  visit: 'Visit blog',
  dragHint: 'Drag to explore',
  swipeHint: 'Swipe to explore',
};

export const friendBlogsCopy = (locale: Locale) => (locale === 'es' ? es : en);
