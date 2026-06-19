// Cloudflare Pages Function: redirects the bare "/" to the best-matching
// locale based on the visitor's Accept-Language header. The site itself only
// serves prefixed routes (/es, /en); this function picks one for the root.
//
// Lives outside src/ on purpose: it is deployed by Cloudflare Pages, not by
// Astro, and is excluded from the project's tsconfig.

const SUPPORTED_LOCALES = ['es', 'en'] as const;
const DEFAULT_LOCALE = 'es';

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const isSupportedLocale = (value: string): value is SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

const pickLocale = (acceptLanguage: string | null): SupportedLocale => {
  if (acceptLanguage === null) {
    return DEFAULT_LOCALE;
  }

  const preferredLocales = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]?.trim().slice(0, 2).toLowerCase())
    .filter((code): code is string => code !== undefined && code.length > 0);

  return preferredLocales.find(isSupportedLocale) ?? DEFAULT_LOCALE;
};

interface PagesFunctionContext {
  request: Request;
}

export const onRequest = (context: PagesFunctionContext): Response => {
  const locale = pickLocale(context.request.headers.get('accept-language'));
  const target = new URL(`/${locale}/`, context.request.url);
  return Response.redirect(target.toString(), 302);
};
