import { defineCopy } from '@/i18n/copy';
const es = {
  readMore: 'Leer →',
  readOn: 'Leer en',
  empty: 'Aún no hay artículos publicados.',
  searchPlaceholder: 'Buscar artículos…',
  searchEmpty: 'Ningún artículo coincide con la búsqueda.',
  relatedTitle: 'Artículos relacionados',
  paginationLabel: 'Páginas de artículos',
  page: 'Página',
  previousPage: '← Anterior',
  nextPage: 'Siguiente →',
  lead: 'Notas sobre arquitectura, rendimiento y sistemas distribuidos.',
};

const en = {
  readMore: 'Read →',
  readOn: 'Read on',
  empty: 'No articles published yet.',
  searchPlaceholder: 'Search articles…',
  searchEmpty: 'No articles match your search.',
  relatedTitle: 'Related articles',
  paginationLabel: 'Article pages',
  page: 'Page',
  previousPage: '← Previous',
  nextPage: 'Next →',
  lead: 'Notes on architecture, performance and distributed systems.',
};

export const postsCopy = defineCopy({ es, en });
