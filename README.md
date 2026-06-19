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
├── features/                ← nuestro código, una carpeta por feature
│   ├── posts/
│   │   ├── domain/post.ts            ← entidad + funciones puras
│   │   └── infrastructure/post-repository.ts
│   ├── projects/{domain,infrastructure}
│   ├── values/{domain,infrastructure}
│   ├── timeline/{domain,infrastructure}
│   ├── work/{domain,infrastructure}
│   ├── contact/domain/contact-message.ts
│   └── shared/
│       ├── domain/locale.ts
│       ├── infrastructure/entry-identifier.ts
│       └── i18n/{es.ts, routes.ts}
├── components/              ← (pendiente) componentes Astro de UI
├── layouts/                ← (pendiente) BaseLayout, ArticleLayout
└── pages/                  ← (pendiente) rutas /es y /en
```

### `content/` vs `features/`

Son dos carpetas padre por una razón concreta: **`content/` es de Astro, `features/` es nuestro.**

- `src/content/` es una ruta **impuesta por el framework**. A partir de `src/content/config.ts` Astro genera el módulo virtual `astro:content` y los tipos `CollectionEntry<'x'>`. No se puede mover dentro de `features/`.
- `src/features/` es donde mandamos nosotros, con la estructura vertical.

> Se llama `features/` y no `lib/` a propósito: `lib` es abreviatura de *library* (rompe la regla de no abreviar) y no describe el contenido —no son utilidades genéricas, son los módulos de negocio.

### Capas

- **`domain/`** — entidades puras: `type`s + funciones puras. No importa nada de Astro/Cloudflare/HTTP. Excepción: `ContactMessageRules` es una clase con constantes `static` y validación, porque encapsula reglas de negocio que Zod no cubre.
- **`infrastructure/`** — adapters. Los repositorios son funciones `async` sueltas (`findAllPosts`, `findPostBySlug`...), no clases.

### Los repositorios hacen de ACL (anti-corruption layer)

El repositorio de cada feature es el **único** punto que toca `astro:content`. Traduce lo que expone el framework (`CollectionEntry`) a entidades de dominio limpias mediante una función `toX(entry)`:

```
astro:content (CollectionEntry) ──toPost()──▶ Post (entidad de dominio)
```

Las páginas y componentes consumen los repositorios, **nunca** `astro:content` directamente.

### Locale e i18n

- El locale vive en el **path del archivo** (`posts/es/slug.md`), no en el frontmatter.
- `shared/infrastructure/entry-identifier.ts` parsea el id de Astro (`"es/mi-post.md"`) → `{ locale, slug }`. Compartido por todos los repos.
- Las strings de UI viven en diccionarios TS (`shared/i18n/es.ts`, y `en.ts` pendiente).
- Las rutas lógicas se resuelven con `PageKey` en `shared/i18n/routes.ts` (`about` ↔ `sobre-mi`, `work` ↔ `trabajo`, `contact` ↔ `contacto`). Nunca se hardcodean URLs.

## Verificación

```bash
npx astro sync && npx tsc --noEmit   # debe quedar limpio
npm run dev                          # servidor de desarrollo
npm run build                        # build estático
```

## Estado

En construcción. La capa de cimientos (dominio, infraestructura, schemas de contenido, i18n base) está hecha; faltan layouts, componentes y páginas. Sin estilos todavía: primero estructura y arquitectura.
