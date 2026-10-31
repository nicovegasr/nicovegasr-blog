# Maintenance review and next steps

## Delivery boundary

The responsive home, timeline spacing, series-card typography and shared footer
changes are committed on local `main`. This handoff does not authorize a push,
deployment, or merge of parallel work.

The main working preview is <http://localhost:4321/es/>. During this session,
port 4330 belonged to a separate pills worktree. Always verify the checkout and
build behind a preview before using it as evidence.

Navigation changes are owned by parallel work. Integrate and review that work
with the owner before starting the maintenance tasks below. Do not overwrite
its changes or assume its preview represents local `main`.

## Completed presentation changes

- Circular portraits at every width; responsive identity layout and a name
  without a trailing full stop.
- Project link and repository stars immediately below the name; social links
  after the introduction.
- Mobile spacing between the introduction and contributions, with coverage
  for the 706 × 851 intermediate viewport.
- A shared inset for the mascot, thread, route stations and keyboard travel,
  preventing the character from being clipped near the viewport edge.
- Bilingual career-headline clarification and the shorter resilience heading.
- Compact typography for the pill-series cards.
- The same single-row footer on the home and other pages: copyright on the
  left, social links on the right. Mobile omits the verbose rights sentence.
  Small symbols retain larger hit areas: 44px normally and 36px at widths up
  to 384px. Tests check alignment and hit areas at 320, 360, 440, 706 and 1280px.

The original shared sprite atlases and the labs' simulation rules are unchanged.

## Review assessment

Maintainability: **7.5/10**, with medium-high confidence for the inspected
modules. This is a qualitative review of representative source, architecture,
configuration and tests, rather than an exhaustive audit or automated score.

| Dimension | Score |
| --- | --- |
| Architecture and boundaries | 8.5/10 |
| Clarity and cohesion | 6.5/10 |
| Regression protection | 7.5/10 |
| Consistency | 7.5/10 |

Preserve the existing strengths:

- Features own their functionality; routes remain thin adapters.
- Repositories isolate `astro:content` and Markdown rendering.
- TypeScript is strict, including unchecked-index and optional-property checks.
- Simulation engines remain independent of the DOM and have rule-based tests.
- Shared code has focused responsibilities and does not import feature modules.

A general rewrite is not justified. Each task below should be an independent,
reviewable change, with no unrelated visual or editorial work.

## 1. Make browser-test execution deterministic

Start at [playwright.config.ts](../../playwright.config.ts).

Local `reuseExistingServer` accepts any server on port 4330 and can skip the
build command. This session reproduced that failure mode: tests initially
reached another worktree. CI does not reuse servers.

Next change:

1. Make a fresh build from the current checkout the default.
2. Make external-server reuse explicit rather than implicit.
3. Account for the installed preview command detaching from its launcher.
4. Record which URL and checkout were tested; stop only servers owned by the run.

Acceptance: a pre-existing server from another checkout cannot silently produce
a green result. Local and CI execution both validate the intended build.

## 2. Add a real browser journey for the pills reader

Start at [reader-navigation.ts](../../src/features/pills/reader-navigation.ts),
[reader-actions.ts](../../src/features/pills/reader-actions.ts), and their tests.

The reader customizes Astro panel replacement, selection, focus and history.
Existing unit tests use simulated DOM objects and events. There was no dedicated
pills-reader E2E suite in the reviewed checkout.

Add a small browser journey covering:

- Direct entry and navigation through two published chapters.
- Browser back/forward, selected index entry and reading position.
- Language switching and the resulting URL and translated content.
- Keyboard navigation and the real adjacent-chapter links.
- Reduced motion and a usable no-JavaScript fallback.

Use the existing pure tests for detailed rules. Browser tests should exercise
the real Astro lifecycle rather than reproduce the implementation with mocks.
Recheck this gap after parallel pills work is integrated.

## 3. Reduce controller responsibilities incrementally

Start at [controller.ts](../../src/features/async-chaos-lab/controller.ts)
(1,868 lines at review time) and
[scaling/controller.ts](../../src/features/async-chaos-lab/scaling/controller.ts)
(795 lines).

These controllers coordinate templates, session persistence, playback, guides,
outcomes and achievements. The engines are already separate; preserve that
boundary.

When the relevant lab is next changed, extract one concrete responsibility:
session persistence, then tutorial/outcome rendering. Keep those modules inside
their feature. Avoid introducing generic layers or a shared controller framework.

Acceptance: simulation outcomes, storage compatibility, playback and guided
walkthroughs remain unchanged. Existing engine and browser tests continue to pass.

## 4. Align localization ownership

[The architecture guide](architecture.md) describes typed dictionaries and
`getTranslator`, while lab controllers also contain inline `t(es, en)` calls
alongside existing `content.ts` catalogues.

Choose and document a typed, feature-owned catalogue for lab interface copy.
Move one coherent group at a time, preserving exact ES/EN text and keeping
dynamic names and technical identifiers distinct from translatable copy.
Do not expand the global dictionary into a catalogue for every simulation detail.

Acceptance: equivalent locale keys are checked by types and copy can be reviewed
without editing controller behavior.

## Verification and known limits

Use the repository gates: `git diff --check`, `npm run typecheck`,
`npm run test:run`, `npm run build`, and the relevant browser suites.
Passing tests do not replace visual review.

Before final commits, rerun the full browser suite against a fresh production
build. A temporary ignored configuration can select an isolated preview while
task 1 remains pending; remove that configuration after the run.

The 320px navigation-header overflow is a known pre-existing issue. Hero-only
overflow assertions deliberately do not establish that the entire page fits.
Coordinate its verification with the navigation owner.

Existing diagnostics include two schema deprecation hints and one inline-script
hint. Do not mix their cleanup with a maintenance task unless required by it.

### Presentation-batch verification

Verified on 2026-10-31: clean diff whitespace, typecheck, 173 unit tests,
105-page production build and 82 passing browser tests. The browser run used a
fresh isolated production preview rather than the unrelated server on 4330.
Visual review included mobile, desktop and the intermediate 706 × 851 viewport.

A separate authorized performance batch follows this presentation work:
progressive home sprite loading, initial lab-height reservation and immutable
caching for hashed assets. Record its measurements and verification separately;
do not infer a particular performance score from these implementation changes.
