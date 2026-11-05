# Technical architecture

## Overview

The blog is an Astro static site. Spanish, the default locale, is served at the root and English under `/en/`, with equivalent routes where translations exist. Spanish used to live under `/es/`; `public/_redirects` answers those links with a Cloudflare Pages 301 to the same path at the root. The locale root is the About page. Content indexes live at `/contenido/blog/` (where `/contenido/` redirects), `/contenido/pildoras/` and `/contenido/laboratorios/`, with English equivalents under `/en/content/`. Published articles, pills and labs keep their paths below the locale, and the former index addresses redirect through `astro.config.mjs`. Content is rendered at build time, so deployment requires static hosting rather than an application server.

Application code is grouped by functionality. A feature owns a coherent part of the site; it does not have to correspond to one page or one content collection. For example, posts support article pages, listings, search, and RSS.

## Structure

```text
src/
├── content.config.ts       # Astro collection loaders and Zod schemas
├── content/                # Localized Markdown and editorial assets
├── features/
│   ├── about-me/           # Personal journey: Home page, model, repository, contributions, skill areas, and the scroll-driven mascot walkway
│   ├── async-chaos-lab/    # Interactive labs on queues, retries and scaling; see its own README
│   ├── friend-blogs/       # Related blog catalogue and its coverflow adapter
│   ├── out-of-memory-lab/  # Exit 137: a card game about keeping a log job inside its memory
│   ├── pills/              # Series, individual pills, and the notebook reader
│   └── posts/              # Articles, listings, search, pagination, related posts, and feeds
├── shared/
│   ├── coverflow/          # Container-sized 3D gallery of website previews
│   ├── mascot/             # Sprite atlases shared by the labs and the home page
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

`about-me` owns the personal journey, told as life chapters where work is a secondary credit, because it is the localized home page. The underlying content collection remains named `timeline`: content storage and feature ownership need not have identical directory names.

`shared/` contains focused pieces used by more than one feature. Reading-time calculation and presentation belong together there because posts and pills both use them. The mascot sprite atlases live there too, because the labs and the home page both animate them. Shared code must not depend on feature modules. Do not use this directory as a catch-all for code with unclear ownership.

Feature-specific page composition stays in the feature. `PillNotebook.astro`, for example, composes the pills experience using the site-wide `BaseLayout.astro`; it is not part of the global shell.

### Content

`src/content/` follows Astro's content conventions. Collection schemas live in `src/content.config.ts`, and the locale is part of each Markdown entry's path. Keep editorial content outside `features/`.

To withhold an entire pill series, set `draft: true` in its localized `overview.md` files. Draft series and all their individual pill routes are excluded from page generation and the sitemap. The home page and pills index use a separate metadata-only catalogue: once their announcement date is reached, draft titles and icons appear as non-clickable Under construction cards. Their overview body, editorial summary, and individual articles are not rendered. Remove the flag or set it to `false` when the series is ready.

The labs index (`async-chaos-lab/LabsPage.astro`) shows one card per lab with a live, decorative preview: an assembly line of payments for Async Chaos Lab (`async-chaos-lab/catalogue-preview/`) and a terminal whose memory climbs to `exit code 137` for Exit 137 (`out-of-memory-lab/catalogue-preview/`). Both pause offscreen and stay still with reduced motion. Exit 137 is Spanish only, so its card only appears on the Spanish index.

Exit 137 (`/laboratorios/exit-137/`) is a pure engine (`engine.ts`, `challenges.ts`, `guide.ts`) driven by `controller.ts`, which only orchestrates focused views: `briefing.ts` (the sheet before each challenge), `hud-view.ts`, `code-view.ts`, `result-view.ts`, `stage-animator.ts` (the mascot) and `coach-overlay.ts` (tutorial and tips). Numbers are deliberately round: the lab teaches orders of magnitude, not a benchmark.

The header menu links directly to the blog, pills and labs indexes. `ContentLayout.astro` gives each index its own title and sentence, and shows section tabs only at the hamburger breakpoint and below.

The active collections are posts, timeline, pills, and `friendBlogs`. `friendBlogs` is a single JSON file (`src/content/friend-blogs.json`) with one entry per colleague: author, blog URL, preview image, display order, an optional `feedUrl`, and a short description per locale. Update entries there; the feature adapter maps them into the shared Coverflow component.

The blog index lays articles out as a card grid (three columns that drop to two and one) and paginates on the client, nine articles per page, with the page kept in `?page=`. Without JavaScript every article stays visible. Search spans every page: while there is a query the pager hides and only the matches show. Titles shaped "Series — Chapter" that share a prefix with another post form a series: the card shows "Series · n/total" and only the chapter title (`post-series.ts`). Articles published on Lean Mind render with that blog's own identity (`LeanMindPostPreview.astro`: black card, Open Sans, its teal keyboard keys and logo) and open in a new tab.

Below the articles, the friends' blogs section renders the shared Coverflow component (`src/shared/coverflow/`, see its README): the blogs drift past continuously and the motion stops on whichever one the visitor chooses. Without JavaScript it is a grid of plain links. The retired Principles and current-work sections have no remaining collections, modules, or editorial files. When retiring another section, check its consumers, schema, Markdown, translations, components, and styles together.

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

Series and individual pill routes render the same notebook component. Individual routes select their article during the build. Reader links point to generated HTML pages, so direct visits, reloads, and navigation without JavaScript remain available. The pill title is the page's `h1`. On screens up to 800px the index starts closed behind one line and closes again after choosing a pill; without JavaScript it stays open.

The notebook opts into Astro's `ClientRouter` through `BaseLayout`. It loads generated pages without a full document reload, updating the URL, history, metadata, and translated links. Within the same locale and series, a custom swap replaces only `.reading-desk` and the translated language link, preserving the shell and index DOM.

Browser behavior stays in the pills feature, separated by responsibility:

- `reader-navigation.ts` coordinates panel replacement, selection, scroll, focus, and animation. Named operations follow Astro's before-swap, after-swap, and page-load events. New chapter visits align the reader below the header; history traversal retains Astro's saved scroll. The index scrolls just enough to reveal the selected pill. Hash-only summary visits also synchronize selection because they do not trigger a document swap.
- `reader-actions.ts` exposes `changePill('previous' | 'next')`. It owns adjacent-pill lookup, the generated next-series continuation, visibility and selection checks, the shared loading lock, and fallback to the real static link. It returns whether navigation started so keyboard handling can prevent only accepted shortcuts. Input methods coexist on hybrid devices; there is no device-type switch or required interface hierarchy. The final pill links directly to the first available pill of the next published series in catalogue order. Draft, future and empty series are skipped. This static link also drives keyboard and swipe continuation; previous stays within the current series and the final available series does not wrap.
- `reader-keyboard-navigation.ts` translates left/right arrow keys into that action. Up/down retain native reading scroll. Editing controls, horizontal code/table navigation, text selection, and browser shortcuts keep their own key behavior.
- `reader-swipe-navigation.ts` translates a left swipe into next and a right swipe into previous, only inside the article marked `data-pill-swipe`. A swipe must travel at least 72 CSS pixels within 700ms and be clearly horizontal. Vertical movement, page scrolling, multiple touches, cancellation, and navigation discard the pending gesture. Touches within 32px of either screen edge, text selection, links, controls, code blocks, tables, and media keep their native behavior. Touch listeners are passive and do not change `touch-action` or prevent native scrolling/zooming.
- `reader-image-zoom.ts` opens article images in a full-screen native dialog. Activating the image toggles between fitting the screen and its natural size, which scrolls.
- `reader-keyboard-tip.ts` controls the hint: a floating arrow-key tip for fine pointers with hover support, and a swipe hint that briefly replaces the reading time on other devices. It counts down three seconds across chapter changes and then closes itself for the session. Dismissal uses session storage with an in-memory fallback.

The reading panel uses a direct Web Animation rather than browser view-transition snapshots. Its duration is controlled by `--motion-duration-reading` in `tokens.css` (400ms by default); reduced-motion preferences disable it. Skipping the native snapshot handles the expected rejected `ready` promise. No server-side session or persisted reading state is required.

Shared controls use event delegation, and viewport reveals initialize on `astro:page-load`, so controls continue working after client-side navigation. Pages outside the notebook do not opt into the router.

## Development and verification

Use the Node.js version and startup commands documented in the root README. For a change:

1. Read the owning feature, its consumers, and the relevant design guidance.
2. Keep ES/EN routes and interface dictionaries aligned.
3. Keep the diff focused and preserve unrelated working-tree changes. Write new source comments in English.
4. Run the standard checks:

   ```bash
   git diff --check
   npm run typecheck
   npm run test:run
   npm run build
   ```

5. After route or page-composition changes, inspect the generated ES/EN HTML and verify links and selected content. After visual changes, inspect desktop and mobile layouts; a passing build does not establish visual quality.

See the [visual guide](../design/styleguide.md). Before creating or editing graphical assets, read the image guide in the private studio repository (`studio/images/images-styles.md`).
