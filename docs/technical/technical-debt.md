# Technical debt

Known issues and what has already been resolved. Fix an item when its area is next changed, unless it is marked High. A general rewrite is not justified; each item should be an independent change.

## Pending

| Priority  | Item                                                                                                                       | Where                                                                                                                                       | Next step                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 🟠 Medium | Dependency direction is only documented: nothing stops `shared/` importing a feature or one feature importing another      | [eslint.config.js](../../eslint.config.js)                                                                                                  | Enforce it with `no-restricted-imports`, listing each allowed exception               |
| 🟠 Medium | The article pages duplicate their composition and loading logic per locale, unlike the thin pill pages                     | [blog/[slug].astro](../../src/pages/blog/[slug].astro), [en/blog/[slug].astro](../../src/pages/en/blog/[slug].astro)                        | Move it to a `PostPage.astro` in the posts feature                                    |
| 🟠 Medium | Async Chaos Lab views receive the whole `PaymentLab` element, so any of them can read or change any field                  | `payment-simulation/` and each lab's `diagram.ts`, `narration.ts`, `guide.ts`                                                               | Pass views only the state they paint, as Exit 137 does                                |
| ⚪ Low    | Interface text has two homes: posts and pills use the global dictionary, labs use a catalogue per feature                  | [i18n/es.ts](../../src/i18n/es.ts), each lab's `copy.ts`                                                                                    | Give each feature its own catalogue and keep the global dictionary for site-wide text |
| ⚪ Low    | Browser tests sometimes time out on `page.goto` under full parallelism, cause unconfirmed; CI retries once and can hide it | [pill-reader.e2e.ts](../../src/features/pills/pill-reader.e2e.ts), [content-navigation.e2e.ts](../../src/layouts/content-navigation.e2e.ts) | Repeat the suite to find the cause if a run blocks CI                                 |
| ⚪ Low    | At about 701px the Spanish "Disponible" and "0/4 en uso" labels of lab 3 sit almost touching                               | [scaling-admission.css](../../src/features/async-chaos-lab/scaling/scaling-admission.css)                                                   | Let the row wrap in that range                                                        |
| ⚪ Low    | The video capture scripts in the private studio repository use the renamed lab selectors but have not run since the rename | `studio/videos/tools/capture`                                                                                                               | Run one real capture, then commit them in that repository                             |
| ⚪ Low    | `minimatch` is forced to 11.0.4 because ESLint still asks for an affected version (GHSA-g3hv-75wg-m249)                    | `overrides` in [package.json](../../package.json)                                                                                           | Remove the override when ESLint accepts a fixed version and `npm audit` stays clean   |
| ⚪ Low    | Labs 1 and 2 share one stylesheet, with `data-level` selectors for lab 1                                                   | [shared/stories](../../src/features/async-chaos-lab/shared/stories)                                                                         | Move each lab's rules to its folder, checking the cascade page by page                |

## Accepted

| Item                                                                                    | Why                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The header needs at least 344px, so it overflows on narrower screens                    | Those widths do not justify the work                                                                                                                                                                                  |
| `--walk-line-inset` is set by JavaScript, which shifts the home layout slightly on load | Home CLS is well below the 0.1 threshold: at most 0.0225 locally (390×844) and 0.0054 in production (Lighthouse, mobile, 412×823). Deriving it in CSS would have to duplicate the centered gutter and the mascot size |
| State-dependent lab text uses `inLocale` in `narration.ts` and `guide.ts`               | Those files are the catalogue for text that depends on the simulation state                                                                                                                                           |
| Existing source comments mix Spanish and English                                        | New comments are written in English; existing ones change only when their code does                                                                                                                                   |

## Resolved

|     | Item                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅  | Circular portraits and an ordered home header at every width                                                                                                           |
| ✅  | Mobile spacing, and a mascot that is no longer clipped near the screen edge                                                                                            |
| ✅  | Clearer career headings in both languages                                                                                                                              |
| ✅  | Compact typography on the pill-series cards                                                                                                                            |
| ✅  | Shared single-row footer with larger tap targets (`edc16c3`)                                                                                                           |
| ✅  | Deferred mascot atlas loading, reserved lab height and immutable caching for hashed assets                                                                             |
| ✅  | Pills index meta description no longer says "coming soon"                                                                                                              |
| ✅  | Browser tests build the current checkout; reusing a server is explicit                                                                                                 |
| ✅  | Browser journeys for reader history, language switching, reduced motion and no JavaScript                                                                              |
| ✅  | Lab session persistence and small helpers extracted from the controllers                                                                                               |
| ✅  | Each lab has its own folder, with shared code in `payment-simulation/` and `shared/`                                                                                   |
| ✅  | Tutorial, incident and result rendering extracted from the controllers                                                                                                 |
| ✅  | The engine no longer knows about levels: each lab declares its own rules, configuration and names                                                                      |
| ✅  | Controller copy moved to typed catalogues                                                                                                                              |
| ✅  | The lab 3 diagram and dialogs extracted, and abbreviated identifiers replaced across the labs                                                                          |
| ✅  | `stories.css` split into ordered sections                                                                                                                              |
| ✅  | Mascot calculations extracted into pure functions with unit tests                                                                                                      |
| ✅  | Hero tests no longer depend on the live shields.io badge                                                                                                               |
| ✅  | Dead props, keys and declarations removed; one accent underline and one storage key; visible hover on the star badge                                                   |
| ✅  | Production measured on mobile (2026-10-31): Lighthouse 86-99, CLS at most 0.060, and immutable caching confirmed on hashed assets                                      |
| ✅  | The labs catalogue is its own `labs` feature; each lab supplies its entry and preview                                                                                  |
| ✅  | Interactive Markdown demos form the `content-demos` feature, with each demo in its own subfolder, so `shared/` no longer imports a feature                             |
| ✅  | No file exceeds 500 lines: lab controllers delegate markup and painting, `PillReaderIndex.astro` owns the index, and both large stylesheets are split in cascade order |
| ✅  | Prettier formats the repository and `npm run lint` checks it                                                                                                           |
