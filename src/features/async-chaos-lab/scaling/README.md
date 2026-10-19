# Lab 3: scaling a reliable worker

Routes: `/es/laboratorios/scaling/` and `/en/labs/scaling/`.

This level assumes the reliability taught in labs 1 and 2. It never connects to
Stripe, sends email, or writes to a database. Astro generates static pages; a
native custom element runs the simulation in the browser. No new dependencies,
API routes, backend, or Cloudflare Functions are involved.

## Where to change what

- `engine.ts`: jobs, resource admission, fixed clock, retry scheduling and costs.
- `engine.test.ts`: ownership, effects, shared capacities, retries and timing.
- `content.ts`: bilingual on-call scenes, names and resource explanations.
- `controller.ts`: playback, rendering, dialogs, session history and discovery.
- `scaling.css`: feature-scoped layout, packet motion and state signals.
- `../ScalingPage.astro`: static page wrapper; `../LabHeader.astro`: shared navigation.
- `verify-browser.mjs`: real browser interactions, layout and screenshot checks.

## The simulation in one pass

`createScaling(config)` creates 24 pending payments. `playScaling` assigns one
payment to each available worker and admits work into the first phase. Every
`tickScaling` advances the simulated clock by **0.5 seconds**. At a boundary it:

1. Accounts for the interval just spent working or waiting.
2. Completes due operations and makes delayed retries eligible again.
3. Releases workers whose payments completed all four phases.
4. Gives idle workers the oldest pending payments.
5. Admits waiting payments in waiting-time/ID order into available resources.

The four operations take 1, 3, 1 and 1 seconds. Shared capacities are 4 CPU units,
3 concurrent payment-service calls, 2 concurrent database writes and 5 concurrent
email calls. A worker retains its payment through processing, local waiting and
retry backoff. It cannot claim another payment until that one finishes.

An enabled admission limit is capped by the known receiver capacity: excess work
waits locally. Disabling it sends excess calls to a **fictional rejecting
receiver**. Rejections occur before applying an effect. Each delayed attempt
uses bounded exponential backoff and deterministic jitter derived from job,
phase, rejection count and seed. CPU contention still queues rather than
inventing HTTP-style CPU errors. After 12 rejections of a single phase, processing
stops with the job retained as failed; there is no silent loss or infinite loop.

`pauseScaling` freezes time. Playback speeds only change how frequently the UI
requests ticks. A resumed or accelerated run therefore produces the same result.
The page pauses when its tab becomes hidden and cleans up its timer on disconnect.

## Why the bottleneck can move

Lowering or removing a concurrency limit does **not** increase service capacity.
The optional Stripe contract upgrade increases the actual shared capacity from
3 to 9 calls; its duration stays 3 seconds. Only after that upgrade can the
two-write database become the dominant resource wait with these durations.
The UI makes the extra capacity and its cost explicit. The upgrade deliberately
preserves the application’s existing admission limit. A contextual call explains
why buying extra receiver capacity does not help while the step still admits
only three calls. The player must tune that limit on the phase itself.

The first visible Stripe queue unlocks controls and pauses for a short call.
A four-worker trial unlocks the controls and celebrates horizontal-scaling progress without awarding victory, even
if its waiting line was too small to trigger that call. Other calls react to
the first actual rejection, to unused capacity after an upgrade, and to a database queue after the admission limit is adjusted.
Calls occur once per browser session; experiments remain freely repeatable.

## Costs and the mission

One unit is one reserved worker-second. Every extra Stripe slot also costs one
unit per simulated second. The original resource contract is included:

`cost = seconds * workers + seconds * (stripeCapacity - 3)`

Idle and waiting workers remain reserved. These are teaching units, not prices
or measured CPU/RAM consumption. Efficiency is completed payments per unit.
The mission accepts any configuration that completes all 24 payments within
26 simulated seconds with at most 8 available workers, costs at most 400 units and has no rejections. There is
no hidden score or worker-count penalty.

Reproducible examples from the default seed and original contract:

| Workers | Seconds | Units | Rejections |
| ------- | ------- | ----- | ---------- |
| 1       | 144     | 144   | 0          |
| 4       | 39      | 156   | 0          |
| 8       | 28      | 224   | 0          |

With 8 workers and unprotected Stripe, the same batch takes 32 seconds and
has 16 rejections/retries. Expanding Stripe to 9 slots while leaving the local
limit at 3 still takes 28 seconds, so that alone cannot win. With 8 workers and
a protected admission limit of 8, the batch takes 21 seconds and 294 units;
the database now accumulates more waiting time than Stripe. Six workers with
a limit of 6 also win in 26 seconds; seven with a limit of 4 win in 25 seconds.
The general engine still supports 24 workers for regression experiments, but
the playable mission only offers eight and never awards an oversized team victory. The baseline displayed by the UI comes from running the
one-worker engine, not from a separate formula.

## Interaction and persistence

Workers are added one at a time on the team itself; no worker multiplier is offered. Playback speed controls remain separate. Click a phase for its explanation and,
once unlocked, the Stripe upgrade. Per-phase admission controls sit inside each
phase. Pause before changing configuration: every configuration change prepares
a fresh trial. Renaming changes the live labels without resetting processing.
Click a payment or worker to hear what that payment is currently doing.

The last eight finished trials, discovery flags and names are kept in
`sessionStorage`. Reset does not erase the comparison. Older victory flags are recomputed against the current mission; oversized historical teams are excluded. Reload begins a new
one-worker run while preserving session history. Blocked storage does not stop
the lab. Names are length-limited and escaped before insertion into HTML.
Motion preferences disable packet flight and decorative pulsing.

## Verification

```sh
npm run test:run
npm run typecheck
npm run build
GAME_TEST_URL=http://127.0.0.1:4321 node src/features/async-chaos-lab/scaling/verify-browser.mjs
```

The browser check uses the existing Brave installation, with an isolated
headless profile under `.astro/`. Override `GAME_BROWSER` for another Chromium
binary. Screenshots are saved under `.astro/scaling-review/`; the disposable
profile is removed on exit. The check accelerates only its own simulation timer.

## Deliberate simplifications

- This is a finite burst of 24 payments, not an unbounded arrival-rate model.
- CPU capacity is a fixed pool, not a model of scheduling or CPU slowdown.
- Resources have fixed latency and capacity. There are no network timeouts,
  rate-per-second quotas, database row locks, lease expiry or process crashes.
- Concurrency control does not prove transactional consistency or prevent data
  races. The database scene says so explicitly.
- Retry rejection is known to happen before an effect. Ambiguous external
  outcomes, stable-ID support and local checkpoints belong to lab 2.
- This level does not model separate queues/worker pools for every stage.
  Every payment retains a global worker slot throughout the pipeline.
