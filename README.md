# Blog / Portfolio de Nicolás Vegas

Sitio personal construido con **Astro 5** + **TypeScript** (strict), totalmente estático. La home es el **blog**; el portfolio vive en `/sobre-mi`.

> **Mantenimiento de este documento:** cada vez que cambie la arquitectura, la estructura de carpetas, las convenciones o las decisiones técnicas, hay que reflejarlo aquí en el mismo cambio. El README es la fuente de verdad de "cómo está montado esto".

## Stack

- **Astro 5** en modo estático (`output: static`).
- **TypeScript** en modo `strict`.
- **i18n nativo de Astro** con prefijos simétricos `/es` (idioma por defecto) y `/en` (`prefixDefaultLocale: true`).
- **Content Collections** + **Zod** como fuente de verdad de la forma del contenido.

## Convenciones

- **Alias de imports:** `@/*` → `src/*`. Las features se importan como `@/features/<feature>/...`. No se usa `~/`.
- **Naming sin abreviaturas:** nombres completos y descriptivos (`publicationDate`, no `pubDate`). Solo se aceptan siglas universales (HTTP, URL, ID, JSON...).
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) en inglés, con scope por feature/área (`feat(posts): ...`, `chore: ...`).
- **Sin campo `draft`:** el gate de publicación es git. No se publica un post hasta que se hace push.

## Arquitectura

Estructura **vertical / feature-based**: cada concepto agrupa sus propias capas (`domain`, `infrastructure`) en lugar de repartirse por capas técnicas globales.

```
src/
├── content/                 ← territorio de Astro (NO tocar la ubicación)
│   ├── config.ts            ← schemas Zod de cada colección
│   └── <coleccion>/{es,en}/*.md
├── i18n/                    ← concern transversal de internacionalización
│   ├── locale.ts            ← tipo Locale, LOCALES, isLocale, DEFAULT_LOCALE
│   ├── es.ts                ← diccionario de strings de UI (en.ts pendiente)
│   ├── routes.ts            ← PageKey (about↔sobre-mi, work↔trabajo, contact↔contacto)
│   └── entry-identifier.ts  ← parsea "es/slug.md" → { locale, slug }
├── features/                ← nuestro código, una carpeta plana por feature
│   ├── posts/
│   │   ├── post.ts                  ← entidad + funciones puras (testeable sin Astro)
│   │   └── post-repository.ts       ← astro:content → Post
│   ├── projects/{project.ts, project-repository.ts}
│   ├── values/{value.ts, value-repository.ts}
│   ├── timeline/{timeline-entry.ts, timeline-repository.ts}
│   ├── work/{work.ts, work-repository.ts}
│   └── contact/contact-message.ts   ← solo dominio (aún sin repo)
├── components/              ← (pendiente) componentes Astro de UI
├── layouts/                ← (pendiente) BaseLayout, ArticleLayout
└── pages/                  ← (pendiente) rutas /es y /en
```

Los tests viven junto al código que prueban (`post.test.ts` al lado de `post.ts`).

### `content/` vs `features/`

Son dos carpetas padre por una razón concreta: **`content/` es de Astro, `features/` es nuestro.**

- `src/content/` es una ruta **impuesta por el framework**. A partir de `src/content/config.ts` Astro genera el módulo virtual `astro:content` y los tipos `CollectionEntry<'x'>`. No se puede mover dentro de `features/`.
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
- Las strings de UI viven en diccionarios TS (`i18n/es.ts`, y `en.ts` pendiente).
- Las rutas lógicas se resuelven con `PageKey` en `i18n/routes.ts` (`about` ↔ `sobre-mi`, `work` ↔ `trabajo`, `contact` ↔ `contacto`). Nunca se hardcodean URLs.

## Verificación

```bash
npx astro sync && npx tsc --noEmit   # tipos: debe quedar limpio
npm run test:run                     # tests unitarios (Vitest) del dominio puro
npm run dev                          # servidor de desarrollo
npm run build                        # build estático
```

### Tests

[Vitest](https://vitest.dev/) para el **dominio puro** (cálculo de tiempo de lectura, parser de identificadores, orden y publicación de posts, validación de contacto). No se testean los repositorios (ACL fino sobre `astro:content`) ni la UI. Los tests se co-localizan como `*.test.ts` junto al fichero que prueban.

## Estado

En construcción. La capa de cimientos (entidades de dominio, repositorios, schemas de contenido, i18n base, tests de dominio) está hecha; faltan layouts, componentes y páginas. Sin estilos todavía: primero estructura y arquitectura.
