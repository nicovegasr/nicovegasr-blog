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
├── features/                ← nuestro código, un slice vertical por feature
│   ├── posts/
│   │   ├── post.ts                  ← entidad + funciones puras (testeable sin Astro)
│   │   ├── post-repository.ts       ← astro:content → Post
│   │   └── components/              ← UI propia del feature (se agrupa al crecer)
│   │       └── {PostPreview, PostMeta, TagList, ReadingTime}.astro
│   ├── projects/{project.ts, project-repository.ts}
│   ├── principles/{principle.ts, principle-repository.ts}  ← valores/principios (sección de sobre-mí)
│   ├── timeline/
│   │   ├── {timeline-entry.ts, timeline-repository.ts}
│   │   └── components/TimelineEntry.astro   ← una entrada (fechas mes+año, "Actualidad/Present")
│   └── work/{work.ts, work-repository.ts}
├── layouts/                 ← shell transversal de toda página (no es un feature)
│   ├── BaseLayout.astro     ← <head> SEO + hreflang alternates
│   └── {Navigation, Footer, LanguageSwitcher}.astro
└── pages/
    ├── index.astro          ← blog index en español (raíz, idioma por defecto)
    ├── sobre-mi.astro       ← portfolio en español
    ├── trabajo.astro        ← "dónde trabajo" en español
    ├── contacto.astro       ← contacto (enlaces estáticos) en español
    └── en/{index, about, work, contact}.astro   ← versiones en inglés
```

Los tests viven junto al código que prueban (`post.test.ts` al lado de `post.ts`).

### `content/` vs `features/`

Son dos carpetas padre por una razón concreta: **`content/` es de Astro, `features/` es nuestro.**

- `src/content.config.ts` (ubicación **impuesta por el framework** en Astro 6) define las colecciones; a partir de ahí Astro genera el módulo virtual `astro:content` y los tipos `CollectionEntry<'x'>`. El markdown vive en `src/content/<coleccion>/`. No se puede mover dentro de `features/`.
- `src/features/` es donde mandamos nosotros, con la estructura vertical.

> Se llama `features/` y no `lib/` a propósito: `lib` es abreviatura de *library* (rompe la regla de no abreviar) y no describe el contenido —no son utilidades genéricas, son los módulos de negocio.

### Slice vertical: un feature agrupa dominio, datos y su UI

Cada feature reúne todo lo suyo. Los roles se distinguen por **fichero**, no por subcarpetas de capa:

- **`<feature>.ts`** — entidad pura: `type`s + funciones puras. No importa nada de Astro/HTTP. Por eso es **testeable sin arrancar Astro** (los tests de dominio corren en milisegundos).
- **`<feature>-repository.ts`** — adapter. Funciones `async` sueltas (`findAllPosts`, `findPostBySlug`...), no clases.
- **`components/`** — los `.astro` propios del feature. **Solo se crea cuando hay volumen** (posts tiene 4 componentes; el resto aún no tiene UI).

> No usamos subcarpetas `domain/`/`infrastructure/`: el dominio y el acceso a datos son **un fichero cada uno**, así que serían carpetas para un fichero. La frontera que importa (puro ↔ framework) ya la marca el sufijo `-repository`. Regla general: **se segmenta solo lo que crece** (hoy, la UI). El día que el dominio sean varios ficheros, se abrirá `domain/` —no antes.

### Componentes: en el feature o en `layouts/`

- Los componentes **propios de un feature** viven en `features/<x>/components/` (vertical slice: no hay un `components/` global por capa técnica).
- El **chrome transversal** (`Navigation`, `Footer`, `LanguageSwitcher`) vive en `layouts/` junto a `BaseLayout`: es el shell de toda página, no pertenece a ningún feature.
- Markup trivial de una página (p. ej. la intro del blog: un `h1`+`p` desde el diccionario) va **inline** en la propia page; no merece componente.

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

En construcción. Hecho hasta ahora: cimientos (entidades de dominio, repositorios, schemas de contenido, tests de dominio), i18n completo (diccionarios + translator), layout con nav/footer/switcher y hreflang, **índice de blog**, **detalle de artículo** (`/blog/[slug]`), **portfolio** (`/sobre-mi` · `/en/about`: hero, principios, stack inline, trayectoria y proyectos con estado vacío) **"dónde trabajo"** (`/trabajo` · `/en/work`: empresa actual con cuerpo markdown renderizado vía `findRenderableWork`, enlace a la web y cierre que enlaza a los principios) y **contacto** (`/contacto` · `/en/contact`: página estática con enlaces a pelo —`mailto:`, LinkedIn, GitHub, Medium— sin backend ni formulario). Falta el pulido (sitemap/RSS/SEO). Sin estilos todavía: primero estructura y arquitectura.

> **Stack en el portfolio:** la lista de tecnologías va *a pelo* (array inline en cada page), sin colección ni feature: son nombres, no contenido editorial. Categorías en inglés en ambos idiomas; los nombres de tech no se traducen.

> **Contacto sin backend:** se descartó el formulario con envío de email (necesitaría servidor). La página de contacto será estática: enlaces directos (`mailto:`, redes). Por eso ya no existe el dominio `ContactMessage`/validación.
