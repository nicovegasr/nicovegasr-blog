// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

const siteUrl = 'https://nicovegasr.com';
import cloudflare from '@astrojs/cloudflare';


export default defineConfig({
  site: siteUrl,
  adapter: cloudflare(),
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