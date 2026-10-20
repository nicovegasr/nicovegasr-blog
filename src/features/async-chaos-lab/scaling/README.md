# Lab 3: scaling workers and their services

Routes: `/es/laboratorios/scaling/` and `/en/labs/scaling/`.

This remains a static Astro page with a native custom element. Processing happens
in a deterministic browser simulation: no backend, real service calls, Cloudflare
Functions or new dependencies.

## Files

- `engine.ts`: payments, worker ownership, physical capacities, overloads and cost.
- `achievements.ts` / `achievements.test.ts`: actual-run rewards and minimum-team proof.
- `engine.test.ts`: repeatability, capacity, overloads, effects and mission rules.
- `controller.ts`: playback, diagram, introductions and session comparison.
- `content.ts`: bilingual names and introductory call.
- `scaling.css`: feature-scoped layout and signals.
- `verify-browser.mjs`: browser interactions and screenshots.
- `../outcome-shell.ts`: the same outcome scene used by all three levels.

## Simulation rules

24 payments traverse validation, charging, account activation and confirmation.
The phases take 1, 3, 1 and 1 simulated seconds. Each worker owns one payment
throughout that sequence. Workers claim the next pending payment when free.
The workload is a pipeline, not fixed-size batches.

`capacities` is the actual capacity of each resource. Defaults are 4 CPU units,
3 simultaneous payment-service calls, 2 database writes and 5 email requests.
There is no second per-phase admission setting, waiting policy, separate queue
control, random incident or manual failure button.

When CPU is full, computation waits for a core. External calls are sent as soon
as their workers reach the phase. In this scenario, a receiving service collapses
when offered more concurrent work than its capacity. Exactly filling it is safe.
A collapse stops the experiment, marks work at that phase as interrupted, retains
all payments/effects and shows the broken chain with the shared Game Loss scene.

Overload collapse is a deliberate scenario rule, not a claim that every real
service crashes on one excess request. A real receiver may reject, queue, shed
load or degrade instead. This level concentrates on sizing services for the work
sent to them; reliability and ambiguous effects are covered by lab 2.

With four workers:

1. Original capacity: four calls reach Stripe's three slots; step 2 fails at 1 s.
2. Expand Stripe to four: calls finish, but four activations exceed the database's
   two slots; step 3 fails at 4 s.
3. Expand the database to four: the same team completes all payments in 36 s.
4. Reducing email capacity below that incoming burst exposes a failure at step 4.

The simulation uses fixed 0.5-second ticks. FPS and playback speed do not change
results. The same configuration produces identical events and initial payments.
There are no hidden worker-count failures or infinite retries.

## Interaction and presentation

All three levels open with an on-call introduction; closing it leaves the system
editable without starting playback. Lab 3's resource capacity is adjusted directly
on each node using minus/plus controls, from 1 to 8 units. Each change prepares a
fresh attempt. Pause before changing workers or resources.

Worker chips show their payment and phase. Payment chips show their owning
worker while in flight. Busy, waiting and failed states use labels as well as
color. There are no arrows or floating resource inspectors between phases.
Small packet motion respects reduced motion; hidden tabs pause automatically.

The first completed attempt shows only its own result. Later completions compare
with the last completed attempt in history, never a computed one-worker reference.
Names and the last eight attempts live in optional version-4 `sessionStorage`.
Blocked storage does not prevent playback. Names are escaped and length-limited.

## Mission and resource cost

Complete all 24 payments in at most 37 simulated seconds, without an overload,
within 400 teaching units and with at most eight workers. A correctly prepared
four-worker team wins. Different larger teams/capacities can also succeed.

`cost = seconds * (workers + sum(max(0, capacity - includedCapacity)))`

The included capacities are `[4, 3, 2, 5]`. Every extra unit costs one teaching
unit per simulated second. Reserved workers cost the same while idle or waiting.
Reducing included capacity does not generate a negative bill. These are explicit
teaching units, not real prices or CPU/RAM measurements.

Examples from the engine:

| Workers | CPU / Stripe / DB / Email | Result |
| ------- | ------------------------- | ------ |
| 1 | 4 / 3 / 2 / 5 | Complete in 144 s; slow |
| 4 | 4 / 3 / 2 / 5 | Stripe collapses at 1 s |
| 4 | 4 / 4 / 2 / 5 | Database collapses at 4 s |
| 4 | 4 / 4 / 4 / 5 | Win in 36 s, 252 units |
| 6 | 6 / 6 / 6 / 6 | Win in 24 s, 384 units |

## Achievements

Three optional achievements cover worker-only scaling, timely completion and
winning with the minimum team. Eligibility comes from terminal engine state,
not button clicks. New awards appear in the existing result scene once.
The catalogue uses the same expandable session-achievements section as labs 1
and 2. Player descriptions do not reveal the winning worker count or a resource
configuration.

The minimum team is four: each of 24 payments holds a worker for six seconds,
so three workers require at least 48 seconds. A feasible four-worker configuration
finishes in 36 seconds. The minimum-team reward requires the full mission verdict,
including the budget. Timely completion alone has its own reward.

Unlocks persist in a locale-independent session-storage
key. Resetting a trial retains them; storage denial leaves in-memory play intact.
No extra result dialogs or external requests are introduced.

The shared loss scene has a serrated bottom edge, like an incident ticket, in all
three levels. Its content remains scrollable on small screens.

## Verification and limits

```sh
npm run test:run
npm run typecheck
npm run build
GAME_TEST_URL=http://127.0.0.1:4321 node src/features/async-chaos-lab/scaling/verify-browser.mjs
```

The browser check uses Brave and an isolated disposable profile under `.astro/`.
Override `GAME_BROWSER` for another Chromium binary. Screenshots go under
`.astro/scaling-review/`. Test timer acceleration affects only its own browser.

This is a finite burst with fixed latencies and capacities, not an arrival-rate
or realistic CPU-scheduling model. It does not model row locks, leases, timeouts,
request-per-second quotas, separate worker pools or distributed admission control.
Concurrency capacity does not prove transaction consistency or prevent data races.
