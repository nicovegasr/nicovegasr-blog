// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nicovegas.dev',
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
});
