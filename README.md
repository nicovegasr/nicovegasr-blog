# Blog / Portfolio de Nicolás Vegas

Sitio personal construido con **Astro 6** + **TypeScript** (strict), totalmente estático. La home es el **blog**; el portfolio vive en `/sobre-mi`. Pensado para alojarse en cualquier hosting estático (GitHub Pages, Netlify…): sin servidor, sin funciones, sin backend.

> **Mantenimiento de este documento:** cada vez que cambie la arquitectura, la estructura de carpetas, las convenciones o las decisiones técnicas, hay que reflejarlo aquí en el mismo cambio. El README es la fuente de verdad de "cómo está montado esto".

## Stack

- **Astro 6** en modo estático (`output: static`). Requiere **Node ≥ 22.12**.
- **TypeScript** en modo `strict`.
- **i18n nativo de Astro**: el idioma por defecto (`es`) se sirve en la raíz sin prefijo (`/`, `/sobre-mi`) y el resto con prefijo (`/en`, `/en/about`) vía `prefixDefaultLocale: false`. Así no hay un `/` vacío que redirigir y el sitio es estático puro.
- **Content Collections** (Content Layer API, `loader: glob()`) + **Zod** como fuente de verdad de la forma del contenido.

## Convenciones

- **Alias de imports:** `@/*` → `src/*`. Las features se importan como `@/features/<feature>/...`. No se usa `~/`.
- **Naming sin abreviaturas:** nombres completos y descriptivos (`publicationDate`, no `pubDate`). Solo se aceptan siglas universales (HTTP, URL, ID, JSON...).
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) en inglés, con scope por feature/área (`feat(posts): ...`, `chore: ...`).
- **Sin campo `draft`:** el gate de publicación es git. No se publica un post hasta que se hace push.

## Arquitectura

Estructura **vertical / feature-based**: cada concepto agrupa sus propias capas (`domain`, `infrastructure`) en lugar de repartirse por capas técnicas globales.

```
src/
├── content.config.ts        ← schemas Zod + loaders glob (Content Layer API)
├── content/                 ← markdown, territorio de Astro (NO tocar la ubicación)
│   └── <coleccion>/{es,en}/*.md
├── i18n/                    ← concern transversal de internacionalización
│   ├── locale.ts            ← tipo Locale, LOCALES, isLocale, DEFAULT_LOCALE
│   ├── es.ts · en.ts        ← diccionarios de strings de UI (en.ts tipado como Dictionary)
│   ├── translator.ts        ← getTranslator(locale) → translate(key) tipado
│   ├── routes.ts            ← PageKey (about↔sobre-mi, work↔trabajo, contact↔contacto)
│   └── entry-identifier.ts  ← parsea "es/slug.md" → { locale, slug }
├── features/                ← nuestro código, una carpeta plana por feature
│   ├── posts/
│   │   ├── post.ts                  ← entidad + funciones puras (testeable sin Astro)
│   │   └── post-repository.ts       ← astro:content → Post
│   ├── projects/{project.ts, project-repository.ts}
│   ├── principles/{principle.ts, principle-repository.ts}  ← valores/principios (sección de sobre-mí)
│   ├── timeline/{timeline-entry.ts, timeline-repository.ts}
│   └── work/{work.ts, work-repository.ts}
├── components/
│   └── layout/{Navigation, Footer, LanguageSwitcher}.astro
├── layouts/
│   └── BaseLayout.astro     ← shell HTML + <head> SEO + hreflang alternates
└── pages/
    ├── index.astro          ← blog index en español (raíz, idioma por defecto)
    └── en/index.astro       ← blog index en inglés
```

Los tests viven junto al código que prueban (`post.test.ts` al lado de `post.ts`).

### `content/` vs `features/`

Son dos carpetas padre por una razón concreta: **`content/` es de Astro, `features/` es nuestro.**

- `src/content.config.ts` (ubicación **impuesta por el framework** en Astro 6) define las colecciones; a partir de ahí Astro genera el módulo virtual `astro:content` y los tipos `CollectionEntry<'x'>`. El markdown vive en `src/content/<coleccion>/`. No se puede mover dentro de `features/`.
- `src/features/` es donde mandamos nosotros, con la estructura vertical.

> Se llama `features/` y no `lib/` a propósito: `lib` es abreviatura de *library* (rompe la regla de no abreviar) y no describe el contenido —no son utilidades genéricas, son los módulos de negocio.

### Dos ficheros por feature: núcleo puro vs acceso a Astro

Cada feature mantiene separados dos roles (dos ficheros, sin subcarpetas):

- **`<feature>.ts`** — entidad pura: `type`s + funciones puras. No importa nada de Astro/Cloudflare/HTTP. Por eso es **testeable sin arrancar Astro** (los tests de dominio corren en milisegundos). Excepción: `ContactMessageRules` es una clase con constantes `static` y validación, porque encapsula reglas de negocio que Zod no cubre.
- **`<feature>-repository.ts`** — adapter. Funciones `async` sueltas (`findAllPosts`, `findPostBySlug`...), no clases.

> No usamos subcarpetas `domain/`/`infrastructure/`: para un blog estático eran dos carpetas para dos ficheros. La frontera que importa (puro ↔ framework) se mantiene con la separación en dos ficheros.

### Los repositorios hacen de ACL (anti-corruption layer)

El repositorio de cada feature es el **único** punto que toca `astro:content`. Traduce lo que expone el framework (`CollectionEntry`) a entidades de dominio limpias mediante una función `toX(entry)`:

```
astro:content (CollectionEntry) ──toPost()──▶ Post (entidad de dominio)
```

Las páginas y componentes consumen los repositorios, **nunca** `astro:content` directamente.

### Locale e i18n

i18n es un concern transversal de primera clase, por eso vive en `src/i18n/` (no en un cajón "shared").

- El locale vive en el **path del archivo** (`posts/es/slug.md`), no en el frontmatter.
- `i18n/entry-identifier.ts` parsea el id de Astro (`"es/mi-post.md"`) → `{ locale, slug }`. Lo usan todos los repos; vive en `i18n/` porque su trabajo es extraer el locale del path.
- Las strings de UI viven en diccionarios TS (`i18n/es.ts`, `i18n/en.ts`).
- Las rutas lógicas se resuelven con `PageKey` en `i18n/routes.ts` (`about` ↔ `sobre-mi`, `work` ↔ `trabajo`, `contact` ↔ `contacto`). Nunca se hardcodean URLs.
- El idioma por defecto no lleva prefijo en la URL: `routes.ts` lo omite (`localePathSegment`) para que el español viva en `/` y el inglés en `/en`. El switcher (`buildAlternateLocalePath`) tiene esto en cuenta al mapear la ruta equivalente.

## Verificación

```bash
npx astro sync && npx tsc --noEmit   # tipos: debe quedar limpio
npm run test:run                     # tests unitarios (Vitest) del dominio puro
npm run dev                          # servidor de desarrollo
npm run build                        # build estático
```

### Tests

[Vitest](https://vitest.dev/) para el **dominio puro** (cálculo de tiempo de lectura, parser de identificadores, publicación de posts). No se testean los repositorios (ACL fino sobre `astro:content`) ni la UI. Los tests se co-localizan como `*.test.ts` junto al fichero que prueban.

## Estado

En construcción. **Fase 1 completa**: cimientos (entidades de dominio, repositorios, schemas de contenido, tests de dominio), i18n completo (diccionarios + translator), layout con nav/footer/switcher y hreflang, y páginas índice por idioma (español en la raíz, inglés en `/en`). Falta el contenido real y las pantallas (blog, artículo, portfolio, trabajo, contacto). Sin estilos todavía: primero estructura y arquitectura.

> **Contacto sin backend:** se descartó el formulario con envío de email (necesitaría servidor). La página de contacto será estática: enlaces directos (`mailto:`, redes). Por eso ya no existe el dominio `ContactMessage`/validación.
