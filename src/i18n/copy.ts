import type { Locale } from './locale';

/**
 * A feature's interface text in every locale. Spanish sets the shape; the other
 * locales must match it, so a missing text fails the build.
 */
export const defineCopy =
  <Copy>(copyByLocale: { es: Copy } & Record<Exclude<Locale, 'es'>, NoInfer<Copy>>) =>
  (locale: Locale): Copy =>
    copyByLocale[locale];
