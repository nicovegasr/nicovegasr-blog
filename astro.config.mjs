// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nicovegas.dev',
  output: 'static',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      // The default locale (es) is served at the root without a prefix
      // (/, /sobre-mi); other locales are prefixed (/en, /en/about). This
      // keeps the site fully static: there is no bare "/" to redirect.
      prefixDefaultLocale: false,
    },
  },
  build: {
    format: 'directory',
  },
});
