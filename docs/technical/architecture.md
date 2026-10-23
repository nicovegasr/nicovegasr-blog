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

To withhold an entire pill series, set `draft: true` in its localized `overview.md` files. Draft series and all their individual pill routes are excluded from page generation and the sitemap. The home page and pills index use a separate metadata-only catalogue: once their announcement date is reached, draft titles and icons appear as non-clickable Under construction cards. Their overview body, editorial summary, and individual articles are not rendered. Remove the flag or set it to `false` when the series is ready.

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

Series and individual pill routes render the same notebook component. Individual routes select their article during the build. Reader links point to generated HTML pages, so direct visits, reloads, and navigation without JavaScript remain available.

The notebook opts into Astro's `ClientRouter` through `BaseLayout`. It loads generated pages without a full document reload, updating the URL, history, metadata, and translated links. Within the same locale and series, a custom swap replaces only `.reading-desk` and the translated language link, preserving the shell and index DOM.

Browser behavior stays in the pills feature, separated by responsibility:

- `reader-navigation.ts` coordinates panel replacement, selection, scroll, focus, and animation. Named operations follow Astro's before-swap, after-swap, and page-load events. New chapter visits align the reader below the header; history traversal retains Astro's saved scroll. The index scrolls just enough to reveal the selected pill. Hash-only summary visits also synchronize selection because they do not trigger a document swap.
- `reader-actions.ts` exposes `changePill('previous' | 'next')`. It owns adjacent-pill lookup, the generated next-series continuation, visibility and selection checks, the shared loading lock, and fallback to the real static link. It returns whether navigation started so keyboard handling can prevent only accepted shortcuts. Input methods coexist on hybrid devices; there is no device-type switch or required interface hierarchy. The final pill links directly to the first available pill of the next published series in catalogue order. Draft, future and empty series are skipped. This static link also drives keyboard and swipe continuation; previous stays within the current series and the final available series does not wrap.
- `reader-keyboard-navigation.ts` translates left/right arrow keys into that action. Up/down retain native reading scroll. Editing controls, horizontal code/table navigation, text selection, and browser shortcuts keep their own key behavior.
- `reader-swipe-navigation.ts` translates a left swipe into next and a right swipe into previous, only inside the article marked `data-pill-swipe`. A swipe must travel at least 72 CSS pixels within 700ms and be clearly horizontal. Vertical movement, page scrolling, multiple touches, cancellation, and navigation discard the pending gesture. Touches within 32px of either screen edge, text selection, links, controls, code blocks, tables, and media keep their native behavior. Touch listeners are passive and do not change `touch-action` or prevent native scrolling/zooming.
- `reader-keyboard-tip.ts` controls the dismissible hint for fine pointers with hover support. Dismissal uses session storage with an in-memory fallback.

The reading panel uses a direct Web Animation rather than browser view-transition snapshots. Its duration is controlled by `--motion-duration-reading` in `tokens.css` (400ms by default); reduced-motion preferences disable it. Skipping the native snapshot handles the expected rejected `ready` promise. No server-side session or persisted reading state is required.

Shared controls use event delegation, and viewport reveals initialize on `astro:page-load`, so controls continue working after client-side navigation. Pages outside the notebook do not opt into the router.

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

See the [visual guide](../design/styleguide.md). Before creating or editing graphical assets, read the image guide in the private studio repository (`studio/images/images-styles.md`).
