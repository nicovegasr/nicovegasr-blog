# Technical debt

Known issues and what has already been resolved. Fix an item when its area is next changed, unless it is marked High. A general rewrite is not justified; each item should be an independent change.

## Pending

| Priority | Item | Where | Next step |
| --- | --- | --- | --- |
| 🟠 Medium | Lab controllers hold too many responsibilities (1,819 and 713 lines) | [controller.ts](../../src/features/async-chaos-lab/controller.ts), [scaling/controller.ts](../../src/features/async-chaos-lab/scaling/controller.ts) | Extract tutorial and outcome rendering, inside the feature |
| 🟠 Medium | Lab interface copy is mixed with controller behavior through inline `t(es, en)` calls | Lab controllers | Keep moving one group at a time to functions like `stepControlsCopy` in [scaling/content.ts](../../src/features/async-chaos-lab/scaling/content.ts) |

## Accepted

| Item | Why |
| --- | --- |
| The header needs at least 344px, so it overflows on narrower screens | Those widths do not justify the work |
| `--walk-line-inset` is set by JavaScript, which shifts the home layout slightly on load | Home CLS is well below the 0.1 threshold: at most 0.0225 locally (390×844) and 0.0054 in production (Lighthouse, mobile, 412×823). Deriving it in CSS would have to duplicate the centered gutter and the mascot size |
| Existing source comments mix Spanish and English | New comments are written in English; existing ones change only when their code does |

## Resolved

| | Item |
| --- | --- |
| ✅ | Circular portraits and an ordered home header at every width |
| ✅ | Mobile spacing, and a mascot that is no longer clipped near the screen edge |
| ✅ | Clearer career headings in both languages |
| ✅ | Compact typography on the pill-series cards |
| ✅ | Shared single-row footer with larger tap targets (`edc16c3`) |
| ✅ | Deferred mascot atlas loading, reserved lab height and immutable caching for hashed assets |
| ✅ | Pills index meta description no longer says "coming soon" |
| ✅ | Browser tests build the current checkout; reusing a server is explicit |
| ✅ | Browser journeys for reader history, language switching, reduced motion and no JavaScript |
| ✅ | Lab session persistence and small helpers extracted from the controllers |
| ✅ | `stories.css` split into ordered sections |
| ✅ | Mascot calculations extracted into pure functions with unit tests |
| ✅ | Hero tests no longer depend on the live shields.io badge |
| ✅ | Dead props, keys and declarations removed; one accent underline and one storage key; visible hover on the star badge |
| ✅ | Production measured on mobile (2026-10-31): Lighthouse 86-99, CLS at most 0.060, and immutable caching confirmed on hashed assets |
