# Async Chaos Lab: publication review

Scope: the two current payment labs and their ES/EN catalogue. The review includes
all previously untracked feature files, not only files already imported by routes.

## Findings resolved

| Priority | Finding                                                                                                                                | Resolution and evidence                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Unmounted engines, controllers, styles, tests and translations for discarded versions remained beside the active implementation.       | Keep one feature at `src/features/async-chaos-lab/`; remove the old implementations and page-wrapper indirection. Route/import/output audits verify the publication surface. |
| High     | Every worker action entered a save phase even with Remember disabled; the UI incorrectly described a checkpoint write.                 | Only remembered actions enter the save phase. A regression test verifies no save events or checkpoints when remembering is disabled.                                         |
| Medium   | The duplicate achievement implied a second customer charge in the first lab, where only a local record duplicates.                     | Use outcome-neutral award copy. Incident copy still distinguishes local records from actual simulated charges.                                                               |
| Medium   | Enabling ID protection while still using RAM could select guidance claiming a database existed.                                        | Derive the guide stage from both storage and record protection. Browser regression keeps the RAM configuration and checks the explanation.                                   |
| Medium   | Guidance could describe an observed duplicate immediately after resetting to a new trial.                                              | Separate ready-state risk from an observed duplicate; unit tests cover both.                                                                                                 |
| Medium   | Stored default naming could show Database while a reload restored the default RAM configuration.                                       | Normalize built-in storage names against the actual configuration on connection. Custom names remain intact.                                                                 |
| Medium   | Changing an action type rebuilt all step controls, closed their disclosures and lost keyboard focus.                                   | Preserve expanded disclosures and focus the changed field after rebuilding. Browser regression checks both.                                                                  |
| Medium   | With all step options expanded, automatic scrolling could leave a checkbox beneath the sticky transport.                               | Apply scroll clearance to the controls themselves, including native inputs. The real-click browser checks reject covered controls.                                           |
| Medium   | An old feature README and design documents described discarded products as current.                                                    | Remove superseded discovery/research/capacity deliverables from this branch. The current feature README documents the actual model, reading order and deployment.            |
| Low      | Hidden summary nodes, unreachable outcome branches, unused selectors/animation and overridden CSS declarations survived UI iterations. | Remove inert DOM/rendering code, dead CSS and 52 superseded declarations without moving the remaining cascade. Recheck both labs in the browser.                             |
| Low      | The browser-review helper used a fixed debug port/profile.                                                                             | Use a unique disposable profile and dynamically assigned port; clean up on completion and report launch errors.                                                              |

Source is formatted for reading, including HTML templates. Engine state types and
receiver-capability flags have descriptive names. Scripted fault branches explain
which payment fails and whether the failure is before or after the relevant effect.
No general plugin system or new application framework was introduced.

## Boundaries kept explicit

- Three payments, one active worker and a fixed fault schedule per lab; no general
  infrastructure designer or arbitrary concurrency model.
- Simulated durable work survives specified simulated process crashes, not reload,
  storage loss, partition or a region outage. Diagnostic history is an observer.
- A stable ID plus an atomic local result can suppress a repeated local mutation.
  A local checkpoint alone cannot guarantee one external effect across a crash.
- Provider deduplication is a simulated receiver capability, not guaranteed email
  or payment-provider behavior. The last-payment scenario shows the post-effect,
  pre-checkpoint crash; the separate charge crash-window remains engine-tested.
- No global navigation, new articles or Pill links are added. No inactive Pill
  reference registry remains to suggest an integration that does not render.

## Checks

Standard checks: `git diff --check`, untracked-file whitespace checks,
`npm run test:run`, `npm run typecheck`, and `npm run build`.

The browser script is run against `astro preview` serving the generated `dist/`,
covering actual dialogs, replay outcomes, walkthrough preservation, control focus,
custom names/XSS, blocked browser storage, desktop/mobile, dark mode and reduced
motion. Network observations must contain only same-origin static GET requests.
The generated ES/EN pages, their local links, canonical/alternate URLs and sitemap
are inspected separately. Source imports are traced from the six route entries;
production modules must be reachable, with tests and the browser helper excluded.

See [the feature README](../../../src/features/async-chaos-lab/README.md) for exact
commands and the simulation contract. Passing these checks does not establish
production infrastructure guarantees or educational effectiveness.

## Static hosting

The Astro configuration, package manifest and lockfile are unchanged. Build output
is static files only: no server adapter, `_worker.js`, `functions/`, runtime bindings
or external service calls are added. Publish `dist/` with the existing Pages build.

Cloudflare documents [free, unlimited static asset requests](https://developers.cloudflare.com/pages/functions/pricing/#static-asset-requests).
The Free plan's [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
include 500 builds per month, 20,000 files per site and 25 MiB per asset. These are
hosting limits; the inspected build contains 204 files, with a largest asset of
636,306 bytes. Existing account plans, domain renewals and unrelated services are
outside this repository review.

Validation: 112 passing unit tests (30 for the labs and 82 existing site tests),
type checking with no errors or warnings, and 87 generated static pages. The
pre-existing PostSearch inline-script hint remains outside this change. The full
browser flow passes against the generated static site, with no uncaught errors or
runtime API/service requests.
