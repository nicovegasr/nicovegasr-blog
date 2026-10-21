# Lab 3: scaling workers and their services

Routes: `/es/laboratorios/scaling/` and `/en/labs/scaling/`.

This remains a static Astro page with a native custom element. Processing happens
in a deterministic browser simulation: no backend, real service calls, Cloudflare
Functions or new dependencies.

## Files

- `engine.ts`: payments, worker ownership, resource admission, HTTP quotas and cost.
- `achievements.ts` / `achievements.test.ts`: actual-run rewards and minimum-team proof.
- `engine.test.ts`: repeatability, capacity, FIFO waiting, HTTP 429, effects and mission rules.
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

`capacities` supplies the simultaneous slots for each resource. Defaults are
4 CPU units, 3 simultaneous payment-service calls, 2 database writes and 5 email
requests. Workers share one admission gate per resource: if its slots are full,
a worker retains its payment and waits locally before sending the request.
Waiting is FIFO by arrival tick, then payment ID. No effect is applied while
waiting, and no new payment is claimed by that worker. There are at most eight
workers in the UI (24 in engine experiments), so assigned work and admission
queues are bounded. Other accepted payments remain in the durable intake queue.

This admission gate is explicit coordination across the simulated workers.
Asynchronous I/O alone does not provide it. This is a model of coordinated
concurrency control, not a guarantee that independent real processes share a
local semaphore or that a remote service queues requests automatically.

HTTP steps have a separate provider quota: `rateLimits[1]` for charging and
`rateLimits[3]` for email, defaulting to 3 and 5 accepted requests per second.
The model uses fixed one-second windows aligned to the simulation clock. Unused
quota does not accumulate, and pausing playback does not advance the window.
It is deliberately not a rolling-window or token-bucket implementation.
CPU and local database work have concurrent slots but no HTTP quota.

After acquiring a free slot, a caller can still receive **HTTP 429** if its
provider quota is exhausted. That request is marked `rejected`, produces no
new effect and retains its payment and worker. The finite trial stops with
`phase: 'rate-limited'`; accepted in-flight work is frozen at that snapshot.
The receiver remains alive. A 429 is a rejection, not a service crash.
`rateLimit` records the step, payment, quota and time until the next fixed window.
The trial does not automatically retry or resume after that duration; backoff,
jitter and retry limits are intentionally outside this level.

The simulation uses fixed 0.5-second ticks. Frame rate and playback multipliers
do not change queues, quota windows, effects or results. All admitted operations
apply their effect only upon completion, once per payment/step.

`waitingSeconds` adds the time all workers spend waiting for admission. It is not
elapsed trial time: two workers waiting for one second contribute two seconds.
Request/response execution time is separate and already included in each step's
1 / 3 / 1 / 1 second duration. Waiting workers still count as occupied and cost
reserved worker units.

## Interaction and presentation

All three levels open with an on-call introduction; closing it leaves the system
editable without starting playback. Lab 3's resource capacity is adjusted directly
on each node using minus/plus controls, from 1 to 8 units. Each change prepares a
fresh attempt. Pause before changing workers or resources.

Each hired worker has a small character at its own station. The card retains its
worker ID, payment ID and phase, and remains clickable to inspect its payment.
Neutral characters are idle; CPU work shows a gear. Waiting for CPU, waiting for
a service slot, and an accepted HTTP call awaiting its response have distinct
labels and a clock. A rejected worker shows 429 and a surprised pose, never a
corpse. The other characters pause when the trial stops.

`team-actors.ts` derives these poses from actual ownership and simulation state.
Shared character atlases are reused without new generated assets. Packet motion
and small state signals respect reduced motion; hidden tabs pause automatically.
Payment chips show their owner, green execution, amber admission queues and red
429 rejections. There are no arrows or floating resource inspectors.

The first completed attempt shows only its own result. Later completions compare
with the last completed attempt in history, never a computed one-worker reference.
Names and the last eight attempts live in optional version-5 `sessionStorage`.
Names can be recovered from version 4; results under its collapse model are not
compared with the current admission/quota model.
Blocked storage does not prevent playback. Names are escaped and length-limited.

## Mission and resource cost

Complete all 24 payments in at most 37 simulated seconds, without a 429,
within 400 teaching units and with at most eight workers. A correctly prepared
four-worker team wins. Different larger teams/capacities can also succeed.

`cost = seconds * (workers + extraConcurrentSlots + extraHttpQuota)`

The included capacities are `[4, 3, 2, 5]`. Every extra unit costs one teaching
unit per simulated second. Reserved workers cost the same while idle or waiting.
The included HTTP quotas are 3 and 5 requests/s. Each extra request/s of quota
also costs one teaching unit per simulated second. Reducing included capacity or
quota does not generate a negative bill. These are explicit teaching units, not
real provider prices or CPU/RAM measurements.

Examples from the engine:

| Workers | CPU / Stripe / DB / Email slots | Charge / email quota (req/s) | Result |
| ------- | ------------------------------ | --------------------------- | ------ |
| 1 | 4 / 3 / 2 / 5 | 3 / 5 | Complete in 144 s, 144 units |
| 4 | 4 / 3 / 2 / 5 | 3 / 5 | Complete in 39 s, 4 s cumulative wait, 156 units |
| 4 | 4 / 4 / 2 / 5 | 3 / 5 | HTTP 429 at charging after 1 s, with a free slot |
| 4 | 4 / 4 / 2 / 5 | 4 / 5 | Win in 37 s, 2 s cumulative wait, 222 units |
| 4 | 4 / 4 / 4 / 5 | 4 / 5 | Win in 36 s, no admission wait, 288 units |
| 4 | 4 / 4 / 4 / 2 | 4 / 5 | Win in 37 s, 2 s waiting for email slots, 296 units |
| 6 | 6 / 6 / 6 / 6 | 6 / 6 | Complete in 24 s, but 480 units exceeds the budget |

With all four resources at one slot and the included quotas, both four-worker
and eight-worker teams finish in 75 seconds. The larger team increases cumulative
waiting from 138 to 372 worker-seconds and doubles cost from 300 to 600 units.
The bottleneck has not become faster merely because more workers are waiting.

## Achievements

Three optional achievements cover worker-only scaling, timely completion and
winning with the minimum team. Eligibility comes from terminal engine state,
not button clicks. New awards appear in the existing result scene once.
The catalogue uses the same expandable session-achievements section as labs 1
and 2. Player descriptions do not reveal the winning worker count or a resource
configuration.

The minimum team is four: each of 24 payments holds a worker for six seconds,
so three workers require at least 48 seconds. A feasible four-worker configuration with four charge requests/s
finishes in 36 seconds. The minimum-team reward requires the full mission verdict,
including the budget. Timely completion alone has its own reward.

Unlocks persist in a locale-independent session-storage
key. Resetting a trial retains them; storage denial leaves in-memory play intact.
No extra result dialogs or external requests are introduced.

The HTTP 429 result uses the shared serrated incident ticket. Its explanation
distinguishes receiver rejection from a crash and reports the consumed quota
alongside free concurrent capacity. Its content remains scrollable on small screens.

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

This is a finite burst with fixed latencies, concurrent capacities and explicit
fixed-window HTTP quotas, not a sustained arrival-rate or realistic CPU scheduler.
It does not model row locks, leases, timeouts, token buckets, retries, separate
worker pools or a real distributed admission implementation.
Concurrency capacity does not prove transaction consistency or prevent data races.
