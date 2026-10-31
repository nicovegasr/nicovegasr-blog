# Technical debt

Known issues and what has already been resolved. Fix an item when its area is next changed, unless it is marked High. A general rewrite is not justified; each item should be an independent change.

## Pending

| Priority | Item | Where | Next step |
| --- | --- | --- | --- |
| 🔴 High | The published pills index says "Próximamente" / "Coming soon" in its meta description | `pills.metaDescription` in [es.ts](../../src/i18n/es.ts) and [en.ts](../../src/i18n/en.ts) | Update the copy in both languages |
| 🟠 Medium | Browser tests can reuse a server from another checkout and give a false green | [playwright.config.ts](../../playwright.config.ts) | Build the current checkout by default and make server reuse explicit |
| 🟠 Medium | No real browser journey for reader history, language switching, reduced motion or the no-JavaScript fallback | [pill-reader.e2e.ts](../../src/features/pills/pill-reader.e2e.ts) | Extend the suite, which already covers the index, images and hints |
| 🟠 Medium | Lab controllers hold too many responsibilities (1,868 and 795 lines) | [controller.ts](../../src/features/async-chaos-lab/controller.ts), [scaling/controller.ts](../../src/features/async-chaos-lab/scaling/controller.ts) | Extract session persistence first, then tutorial and outcome rendering, inside the feature |
| 🟠 Medium | Lab interface copy is mixed with controller behavior through inline `t(es, en)` calls | Lab controllers and `content.ts` | Choose a typed, feature-owned catalogue and move one group at a time |
| 🟠 Medium | About 2,170 lines of CSS in one file | [stories.css](../../src/features/async-chaos-lab/stories.css) | Split it by screen or component |
| 🟠 Medium | Geometry and DOM code are mixed and covered only by browser tests | [mascot-journey.ts](../../src/features/about-me/components/mascot-journey.ts) | Extract the calculations into pure functions with unit tests |
| 🟠 Medium | Layout assertions depend on the live shields.io badge | [hero.e2e.ts](../../src/features/about-me/hero.e2e.ts) | Stub the badge with `page.route` |
| 🟠 Medium | `--walk-line-inset` starts at `0px` and is corrected by JavaScript, which may shift the layout on load (not measured) | [AboutPage.astro](../../src/features/about-me/AboutPage.astro) | Measure it, and derive the value in CSS if the shift is real |
| 🟠 Medium | No production CLS, Lighthouse score or asset cache header has been measured | Production | After the next deployment, measure them and inspect an asset response |
| ⚪ Low | `showFooterSocialLinks` and `showSocialLinks` are always true | [BaseLayout.astro](../../src/layouts/BaseLayout.astro), [Footer.astro](../../src/layouts/Footer.astro) | Remove both props and the conditional |
| ⚪ Low | `language.switchTo` and `pills.reader.back` are unused | [es.ts](../../src/i18n/es.ts), [en.ts](../../src/i18n/en.ts) | Delete both keys |
| ⚪ Low | With `showPrompt={false}`, hover and focus have no visible effect | [RepoStar.astro](../../src/layouts/RepoStar.astro) | Style the link itself |
| ⚪ Low | `--thread-indent` is overridden before every read, and some mobile hero declarations repeat the base rule | [WalkRoute.astro](../../src/features/about-me/components/WalkRoute.astro), [AboutPage.astro](../../src/features/about-me/AboutPage.astro) | Delete the dead declarations |
| ⚪ Low | The accent underline is defined separately in `.projects-link`, `.repo-star span` and `.prose a` | Several | Share one definition in [base.css](../../src/styles/base.css) |
| ⚪ Low | The `pills.index.collapsed` storage key is written twice | [PillReader.astro](../../src/features/pills/components/PillReader.astro), [reader-index-toggle.ts](../../src/features/pills/reader-index-toggle.ts) | Define it once |
| ⚪ Low | Small helpers (`t`, `es`, `button`) are repeated in both lab controllers | Lab controllers | Share only these helpers, without a controller framework |
| ⚪ Low | Source comments mix Spanish and English | Several | Choose one language for new comments |

## Accepted

| Item | Why |
| --- | --- |
| The header needs at least 344px, so it overflows on narrower screens | Those widths do not justify the work |

## Resolved

| | Item |
| --- | --- |
| ✅ | Circular portraits and an ordered home header at every width |
| ✅ | Mobile spacing, and a mascot that is no longer clipped near the screen edge |
| ✅ | Clearer career headings in both languages |
| ✅ | Compact typography on the pill-series cards |
| ✅ | Shared single-row footer with larger tap targets (`edc16c3`) |
| ✅ | Deferred mascot atlas loading, reserved lab height and immutable caching for hashed assets |
