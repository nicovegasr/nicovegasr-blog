# Blog / Portfolio de Nicolás Vegas

Sitio personal construido con **Astro 6** + **TypeScript** (strict), totalmente estático. La home es el **blog**; el portfolio vive en `/sobre-mi`. Pensado para alojarse en cualquier hosting estático (GitHub Pages, Netlify…): sin servidor, sin funciones, sin backend.

> **Mantenimiento de este documento:** cada vez que cambie la arquitectura, la estructura de carpetas, las convenciones o las decisiones técnicas, hay que reflejarlo aquí en el mismo cambio. El README es la fuente de verdad de "cómo está montado esto".

## Stack

- **Astro 6** en modo estático (`output: static`). Requiere **Node ≥ 22.12**.
- **TypeScript** en modo `strict`.
- **i18n nativo de Astro**: todos los idiomas van prefijados de forma simétrica (`/es/sobre-mi`, `/en/about`) vía `prefixDefaultLocale: true`, de modo que `src/pages/` refleja el árbol de URLs 1:1 (`pages/es` + `pages/en`). El `/` raíz no tiene página propia: un `redirects: { '/': '/es' }` en la config lo manda al idioma por defecto. En build estático Astro emite `/index.html` con un `<meta http-equiv="refresh">` (funciona en cualquier hosting estático; `redirectToDefaultLocale` solo aplica en SSR).
- **Content Collections** (Content Layer API, `loader: glob()`) + **Zod** como fuente de verdad de la forma del contenido.
- **Estilos: CSS a pelo** (sin framework de utilidades) con **custom properties como tokens** (`src/styles/`); cada componente lleva su `<style>` scoped de Astro. **Multi-tema** claro (de fábrica) + oscuro vía `[data-theme]`, fijado antes de pintar por un script inline (sin parpadeo). **Fuentes self-hosted** con `@fontsource` (Space Grotesk, Inter, IBM Plex Mono).

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
├── styles/                  ← CSS global a pelo (se importa una vez en BaseLayout)
│   ├── tokens.css           ← custom properties: color (claro + [data-theme=dark]), tipo, espacio, motion
│   └── base.css             ← reset, tipografía, prosa de artículos y patrones de página
├── i18n/                    ← concern transversal de internacionalización
│   ├── locale.ts            ← tipo Locale, LOCALES, isLocale, DEFAULT_LOCALE
│   ├── es.ts · en.ts        ← diccionarios de strings de UI (en.ts tipado como Dictionary)
│   ├── translator.ts        ← getTranslator(locale) → translate(key) tipado
│   ├── routes.ts            ← PageKey (blog↔'', about↔sobre-mi); "trabajo"/"contacto" son anclas de sobre-mí
│   └── entry-identifier.ts  ← parsea "es/slug.md" → { locale, slug }
├── features/                ← nuestro código, un slice vertical por feature
│   ├── posts/
│   │   ├── post.ts                  ← entidad + funciones puras (testeable sin Astro)
│   │   ├── post-repository.ts       ← astro:content → Post
│   │   ├── post-feed.ts             ← arma el RSS (@astrojs/rss) desde findAllPosts
│   │   └── components/              ← UI propia del feature (se agrupa al crecer)
│   │       └── {PostPreview, PostMeta, TagList, ReadingTime, PostSearch}.astro
│   ├── projects/{project.ts, project-repository.ts}
│   ├── principles/{principle.ts, principle-repository.ts}  ← valores/principios (sección de sobre-mí)
│   ├── timeline/
│   │   ├── {timeline-entry.ts, timeline-repository.ts}
│   │   └── components/TimelineEntry.astro   ← una entrada (fechas mes+año, "Actualidad/Present")
│   └── work/
│       ├── {work.ts, work-repository.ts}
│       └── components/LeanMindMark.astro    ← isotipo de Lean Mind (asset en public/)
├── layouts/                 ← shell transversal de toda página (no es un feature)
│   ├── BaseLayout.astro     ← importa estilos+fuentes; <head> SEO (canonical, hreflang, OG/Twitter); script inline de tema (sin parpadeo) + observer de aparición
│   └── {Navigation, Footer, LanguageSwitcher, ThemeToggle, SocialLinks}.astro
└── pages/                   ← árbol simétrico: una carpeta por idioma (URL = carpeta)
    ├── es/{index, sobre-mi, blog/[slug]}.astro · es/rss.xml.ts
    └── en/{index, about, blog/[slug]}.astro · en/rss.xml.ts
    (el `/` raíz no tiene page: lo redirige `redirects` en astro.config a `/es`)
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
- Las rutas lógicas se resuelven con `PageKey` en `i18n/routes.ts` (`blog` ↔ `''`, `about` ↔ `sobre-mi`). **"Dónde trabajo" y "Contacto" no son páginas**: son secciones de sobre-mí, enlazadas por ancla (`#work`, `#contact`). Nunca se hardcodean segmentos de URL.
- Todos los idiomas van prefijados por igual: `buildPagePath` antepone el locale siempre (`/es/...`, `/en/...`). `buildAlternateLocalePath` quita ese prefijo, busca la `PageKey` por el primer segmento y reconstruye la ruta en el idioma destino. Astro no empareja páginas entre idiomas por su cuenta: ese mapeo es nuestro, en `routes.ts`.

### Estilos y tema

CSS a pelo, sin framework de utilidades. `src/styles/tokens.css` define los **tokens** como custom properties (color, tipografía, espacio, radios, motion) y se importa —junto a `base.css` y las fuentes `@fontsource`— una sola vez en `BaseLayout`. Cada componente lleva su `<style>` scoped; los patrones compartidos entre las páginas ES/EN (de markup idéntico) viven como clases globales en `base.css` para no duplicar.

Multi-tema: el claro es el de fábrica; el oscuro solo redefine los tokens de color en `[data-theme="dark"]`, así los componentes no conocen el tema, solo consumen `var(--color-*)`. Un script inline en `<head>` fija `data-theme` (y una clase `.js`) **antes del primer pintado** → sin parpadeo; las animaciones de aparición se gatean tras `.js` para que sin JS el contenido se vea igual.

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

En construcción. **Hecho:** cimientos (entidades de dominio, repositorios, schemas, tests de dominio), i18n completo (diccionarios + translator), shell (nav/footer/switcher/toggle de tema) con hreflang.

- **Blog:** índice con **buscador** (filtro en cliente sobre un índice serializado desde el repositorio en build-time, no scrapeando el DOM) y **detalle de artículo** (`/blog/[slug]`).
- **Portfolio** (`/sobre-mi` · `/en/about`): hero, principios, stack inline, trayectoria y proyectos (estado vacío). **"Dónde trabajo"** (Lean Mind, con isotipo y cuerpo markdown vía `findRenderableWork`) y **Contacto** (iconos a las plataformas vía `SocialLinks`) son ahora **secciones de sobre-mí** (anclas `#work`/`#contact`), ya no páginas propias.
- **SEO/feeds (fase 7):** Open Graph + Twitter Card, sitemap i18n, RSS por idioma, `robots.txt`.
- **Estilos (fase 8):** CSS a pelo con tokens (`src/styles/`), multi-tema claro/oscuro con toggle y sin parpadeo, fuentes self-hosted, tarjetas de post que invierten al hover, aparición al hacer scroll.

**Fase 8 cerrada.** Siguiente: **Projects** como fase propia (página dedicada, cada proyecto interactivo, con contenido real). Backlog: `og:image`, logo, 404 custom, posts relacionados por tags. Fase final: "Apuntes" y "Píldoras formativas" como subpáginas del blog.

> **Stack en el portfolio:** la lista de tecnologías va *a pelo* (array inline en cada page), sin colección ni feature: son nombres, no contenido editorial. Categorías en inglés en ambos idiomas; los nombres de tech no se traducen.

> **Contacto sin backend:** sin formulario ni envío de email (necesitaría servidor). Es una **sección de sobre-mí** (`#contact`) con enlaces directos a las plataformas (`mailto:`, redes) vía el componente `SocialLinks`. Por eso no existe el dominio `ContactMessage`/validación.
