# Technical architecture

## Overview

The blog is an Astro static site. The root redirects to `/es`; Spanish and English both use locale prefixes and equivalent routes where translations exist. Content is rendered at build time, so deployment requires static hosting rather than an application server.

Application code is grouped by functionality. A feature owns a coherent part of the site; it does not have to correspond to one page or one content collection. For example, posts support article pages, listings, search, and RSS.

## Structure

```text
src/
├── content.config.ts       # Astro collection loaders and Zod schemas
├── content/                # Localized Markdown and editorial assets
├── features/
│   ├── about-me/           # Career history: model, repository, and timeline UI
│   ├── pills/              # Series, individual pills, and the notebook reader
│   └── posts/              # Articles, listings, search, related posts, and feeds
├── shared/
│   └── reading-time/       # Calculation, tests, and UI used by posts and pills
├── i18n/                   # Locales, UI dictionaries, and route builders
├── layouts/                # Site-wide shell, navigation, footer, and controls
├── pages/                  # Astro routes, separated by locale
└── styles/                 # Design tokens and global styles
```

### Responsibilities within a feature

Keep small features flat, separating responsibilities with files:

- Model files contain types and pure logic.
- `*-repository.ts` files adapt `astro:content` entries to application types and expose rendered content when needed.
- `components/` contains feature-specific UI and page composition.
- Tests live beside the logic they verify.

There are no mandatory `domain/`, `application/`, or `infrastructure/` directories. Add subdirectories when the amount of code makes navigation easier, rather than creating empty layers in advance.

Pages and components consume repositories instead of importing `astro:content` directly. This keeps collection identifiers, validation, and Markdown rendering behind one boundary. Pure logic remains testable without Astro.

### Feature ownership and shared code

`about-me` owns career history because its consumers are the localized About pages. The underlying content collection remains named `timeline`: content storage and feature ownership need not have identical directory names.

`shared/` contains focused pieces used by more than one feature. Reading-time calculation and presentation belong together there because posts and pills both use them. Shared code must not depend on feature modules. Do not use this directory as a catch-all for code with unclear ownership.

Feature-specific page composition stays in the feature. `PillNotebook.astro`, for example, composes the pills experience using the site-wide `BaseLayout.astro`; it is not part of the global shell.

### Content

`src/content/` follows Astro's content conventions. Collection schemas live in `src/content.config.ts`, and the locale is part of each Markdown entry's path. Keep editorial content outside `features/`.

To withhold an entire pill series, set `draft: true` in its localized `overview.md` files. Draft series and all their individual pill routes are excluded from generation, listings, and the sitemap regardless of publication date. Remove the flag or set it to `false` when the series is ready.

The active collections are posts, timeline, and pills. The retired Principles and current-work sections have no remaining collections, modules, or editorial files. When retiring another section, check its consumers, schema, Markdown, translations, components, and styles together.

## Internationalization

`src/i18n/` is cross-cutting:

- `locale.ts` defines supported locales and the default language.
- `es.ts` and `en.ts` contain interface text; the English dictionary must implement the Spanish dictionary's keys.
- `translator.ts` provides typed dictionary access.
- `routes.ts` builds and translates logical routes.
- `entry-identifier.ts` extracts locale and slug from content entry identifiers.

Use `getTranslator(locale)` in components. Do not embed parallel language dictionaries or localized route segments in feature UI. Technical identifiers, proper nouns, and authored Markdown remain separate from interface translations.

## Presentation and static navigation

`BaseLayout.astro` owns the document shell, global styles, self-hosted fonts, SEO metadata, alternate-language links, and theme initialization. Reusable site controls live alongside it in `layouts/`; feature-specific UI stays with its feature.

Design tokens live in `src/styles/tokens.css`. `base.css` contains the reset, typography, and genuinely global patterns. Components use scoped styles and theme-independent color tokens. See the visual guide for the palette, typography, depth, and motion rules.

Series and individual pill routes render the same notebook component. Individual routes select their article during the build. Reader links point to generated HTML pages, so direct visits, reloads, browser history, and navigation without JavaScript do not require a client-side router or persisted selection. Native cross-document view transitions enhance navigation where supported and are disabled for reduced-motion preferences.

## Development and verification

Use the Node.js version and startup commands documented in the root README. For a change:

1. Read the owning feature, its consumers, and the relevant design guidance.
2. Keep ES/EN routes and interface dictionaries aligned.
3. Keep the diff focused and preserve unrelated working-tree changes.
4. Run the standard checks:

   ```bash
   git diff --check
   npm run typecheck
   npm run test:run
   npm run build
   ```

5. After route or page-composition changes, inspect the generated ES/EN HTML and verify links and selected content. After visual changes, inspect desktop and mobile layouts; a passing build does not establish visual quality.

See the [visual guide](../design/styleguide.md) and read the [image guide](../design/images-styles.md) before creating or editing graphical assets.
