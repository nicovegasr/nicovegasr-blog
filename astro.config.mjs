// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

const siteUrl = 'https://nicovegasr.com';

export default defineConfig({
  site: siteUrl,
  output: 'static',

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  redirects: {
    '/sobre-mi': '/',
    '/en/about': '/en/',
    '/contenido': '/contenido/blog/',
    '/en/content': '/en/content/blog/',
    '/pildoras': '/contenido/pildoras/',
    '/en/pills': '/en/content/pills/',
    '/articulos': '/contenido/blog/',
    '/en/articles': '/en/content/blog/',
    '/laboratorios': '/contenido/laboratorios/',
    '/en/labs': '/en/content/labs/',
  },

  build: {
    format: 'directory',
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', en: 'en-US' },
      },
    }),
  ],
});
