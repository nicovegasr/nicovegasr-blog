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
      prefixDefaultLocale: true,
    },
  },

  redirects: {
    '/': '/es',
    '/es/sobre-mi': '/es/',
    '/en/about': '/en/',
    '/es/contenido': '/es/contenido/blog/',
    '/en/content': '/en/content/blog/',
    '/es/pildoras': '/es/contenido/pildoras/',
    '/en/pills': '/en/content/pills/',
    '/es/articulos': '/es/contenido/blog/',
    '/en/articles': '/en/content/blog/',
    '/es/laboratorios': '/es/contenido/laboratorios/',
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
      filter: (page) => page !== `${siteUrl}/`,
    }),
  ],
});