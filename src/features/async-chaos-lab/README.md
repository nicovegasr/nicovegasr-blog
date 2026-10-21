# Async Chaos Lab

Three browser-only payment simulations inside the existing Astro site. No React,
backend, broker, real database, payment SDK or additional project dependency.
All charges, email and failures are simulated.

## Run locally

From the repository root:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4328
```

| Experience               | Spanish                       | English                      |
| ------------------------ | ----------------------------- | ---------------------------- |
| Catalogue                | `/es/laboratorios/`                 | `/en/labs/`                 |
| Protect pending payments | `/es/laboratorios/async-chaos-lab/` | `/en/labs/async-chaos-lab/` |
| Inside the worker        | `/es/laboratorios/worker-steps/`    | `/en/labs/worker-steps/`    |
| Scaling the system       | `/es/laboratorios/scaling/`         | `/en/labs/scaling/`         |

Lab 3 has a separate fixed-clock engine because resource contention differs from
the fault/checkpoint state machine of labs 1 and 2. It shares their static Astro
wrapper, navigation, visual language and native custom-element approach. See
[`scaling/README.md`](./scaling/README.md) for its model, costs and reproduction.

All three labs open with an on-call introduction. Dismissing it leaves the
configuration editable and does not start processing. Lab 2's **Configure step**
opens a native popover without changing the diagram's dimensions. All fatal
outcomes share `outcome-shell.ts` and the same `qs-outcome` styles.

In labs 1 and 2, use Start/Pause and explicitly retry when an incident interrupts processing.
The shared transport offers ×1, ×2, ×3 and ×4 playback. Switching speed preserves
the current payment, progress and pause state, and never changes simulated results.
The short incident/restart reveal keeps its reading time at every speed.
Labs 1 and 2 reserve a small numbered stage for the film's white character. It
carries the immutable payment ID between steps, falls when the worker process
crashes, and stays alive and uncertain on response timeouts. Saved checkpoints
produce a skip gesture. A new neutral walking atlas supplies actual alternating
footsteps; the film atlas is reused only for the surprised and completed poses.
After a retry dialog closes, the character returns from the interrupted station
to station 01 before processing the same payment again. Pausing, resetting,
changing configuration, hiding the tab or disconnecting cancels the transition.
Reduced motion skips this animated delay. The engine does not advance during it.
Calls wait 700 ms for the initial reaction; the actor and its walking animation
never commit results or decide when a job succeeds. The actor has its own reserved
space and cannot intercept clicks on the diagram.
Tutorial opens a short teammate call. The optional guided walkthrough follows
actual failures and lets the player change the diagram. Finishing keeps the
successful configuration; leaving early restores the previous trial.
Names, above the API or beside the payment strip, enables cosmetic editing.
Changing a rule starts a fresh batch; changing a name does not.

## Read the code in this order

1. **`engine.ts`**: the types, default configurations and three state operations.
   `initialState` creates a batch; `advance` performs one logical transition;
   `continueAfterIncident` allows an interrupted job to be claimed again.
2. **`engine.test.ts`**: concrete examples of RAM loss, repeated delivery, partial
   work and recovery. Read the first three tests before following the whole model.
3. **`guide.ts`**: pure functions turn the current simulation state into an
   explanation, a next action and an optional field to highlight.
4. **`controller.ts`**: the custom element builds the diagram, handles clicks and
   schedules `advance` every 650 ms. Its rendering methods display state; they do
   not decide whether a charge, record or checkpoint exists.
5. **`StoryPage.astro`, `LabsPage.astro`, `links.ts`, `stories.css`, `figures.ts`**:
   static page composition, localized paths and presentation.

`labels.ts` owns default names, length limits and HTML escaping.
`achievements.ts` contains the five session awards. Feature-local ES/EN copy leaves
shared site dictionaries and navigation unchanged. The page files only select a
locale and a level; there are no parallel implementations of the two labs.

### State transitions

```text
claim -> execute -> [save checkpoint, if enabled] -> next step -> final ACK
              |                                          |
          incident                                  completed
              |
       explicit user retry -> claim the same payment ID again
```

The state holds jobs, action results, checkpoints, attempts, a simulation tick and
an event history. Each transition clones its input. IDs and time come from state;
there is no randomness, DOM, network or timer inside the engine. `run` is a bounded
test/reproduction helper that automatically retries incidents; the UI does not
use it. Animation completion never advances the simulation.

`StepProgress.executions` counts attempts, including an interrupted action.
`effects` counts logical results: a repeatable check or set-state stays at one,
while an unsafe repeated append, charge or notification can reach two. Only
`external` and `notify` count toward the interface's external-effect metric.
`checkpoint` means successful progress was saved; it is never set before an
interrupted action produces its result. Disabling Remember produces no save event.

## Lab 1: why payments #2 and #3 fail

The batch contains three already-accepted jobs and one worker. Its fixed actions
are Validate payment, Record payment and Prepare result. Only recording appends a
row. The contract is one row per stable payment ID.

| Payment | Injected failure                                          | Consequence                                                                               |
| ------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| #1      | None                                                      | Its independent business result is retained.                                              |
| #2      | Worker process dies before its first action               | Co-hosted RAM loses both unfinished jobs. An independent database retains them for retry. |
| #3      | Final completion update/ACK fails after the result exists | The same ID returns. An unprotected retry appends a second row.                           |

To finish: choose Database and Check its ID. The simulated local record and its
idempotency identity share one atomic write. Validation and result preparation can
execute again; only appending the existing record is skipped.

The process boundary is deliberate: **a worker crash does not erase another
process's RAM**. This scenario puts the volatile structure inside the crashed
worker. Database mode keeps pending work outside it. Completed results are stored
separately and survive either available process failure.

Diagnostic job rows remain visible after RAM loss; they are the observer's history,
not surviving live queue records. Claim expiry and reoffering are collapsed into
the explicit retry action. HTTP 202 does not imply completion or durability.

## Lab 2: partial work inside one payment

Durable job storage and recovery are assumed. The default actions are validation,
a simulated Stripe charge, setting a local subscription active, and sending a
simulated confirmation. Payment #2 fails before activation takes effect; #3 sends
the confirmation, but the response times out before a checkpoint can be saved. Every
scripted fault occurs once per run.

Each action can be renamed and assigned one of five behaviors:

| Kind        | Replay behavior                                                   |
| ----------- | ----------------------------------------------------------------- |
| `check`     | Rechecks immutable input; no external effect.                     |
| `set-state` | Sets the same local value; safe to repeat.                        |
| `append`    | Creates another local row; unsafe to repeat without protection.   |
| `external`  | Applies another external effect unless the receiver deduplicates. |
| `notify`    | Sends another notification unless the receiver deduplicates.      |

**Save progress after confirmation** writes a durable checkpoint once the worker
receives success and stores it. A later retry can skip that action. For the charge,
this prevents a second charge after its confirmation was saved.

Provider deduplication covers a different moment: the service may perform the email
send, but its response times out before the worker can save a checkpoint. The worker
cannot tell whether to retry. Retrying may duplicate the email; not retrying may lose
the confirmation. A stable key recognized by the receiver lets it return the original
result for the retry. The two controls are related because both prevent repeated
effects, but the local checkpoint cannot cover a lost response; provider deduplication
can cover that gap when the service supports it. Neither guarantees exactly-once
physical delivery.

The interface shows both controls on external steps and explains the moment each one
covers. Provider protection requires receiver support for a stable operation ID.
Saving progress for repeatable local actions trades additional stored state for less
repeated work.

With all four checkpoints enabled and provider deduplication enabled for the email, five
previous successful actions are skipped and 14 action attempts occur, including
the two interrupted attempts. Failed actions are still executed again.

No external effects does not imply idempotency: a local append can duplicate.
Conversely, pure checks and setting the same local value do not need provider
protection. A safe replay may waste work without violating data integrity.

### A checkpoint is not an exactly-once guarantee

The scripted last-payment scenario models the email service accepting the message
and timing out before its response reaches the worker. The worker has no local
checkpoint, so retrying can duplicate the send. The engine-only `gap: 'charge' |
'email'` regression scenarios model the same lost-confirmation window after an
external effect. A local marker cannot protect an operation whose confirmation never
arrived to be saved.

`providerDeduplication` simulates a receiver that recognizes the same immutable
job/step operation key and returns the existing result. This support is conditional,
not a distributed transaction or a capability promised for every email provider.
No exactly-once physical execution, real Stripe call or real email guarantee is
claimed.

## Browser behavior

Names and awards use optional, locale-aware `sessionStorage`. Names are capped at
64 characters and escaped before insertion into HTML; job IDs remain immutable.
Labs 1 and 2 share component/payment names and keep their own step names. Lab 3
keeps its own names and comparison history. Blocked or
malformed storage falls back to an in-page session. Reload resets simulation
progress. Production timers stop when the element disconnects or the tab hides.

Native dialogs own keyboard focus during incidents and outcomes. Green identifies
current work; text and symbols also identify states. Reduced motion disables
packet, indicator and outcome animations. The compact transport remains reachable
while scrolling. There is no per-payment results table, event-log panel or abandoned
prototype. Lab 3 offers a compact comparison of finished trials in a dialog.

## Verification and deployment

```sh
npm run test:run
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1 --port 4330
```

In another terminal, verify the actual static build:

```sh
GAME_TEST_URL=http://127.0.0.1:4330 node src/features/async-chaos-lab/verify-browser.mjs
```

The browser check requires Node.js 22+ and a Chromium-family executable. It defaults
to Brave on macOS; set `GAME_BROWSER` to another executable path. It uses an isolated,
temporary profile under ignored `.astro/`, an automatically allocated debug port,
and local screenshots in `.astro/async-chaos-lab-review/`. It never controls the
player's browser. It checks real controls, both walkthroughs, customization/XSS,
keyboard focus, storage restrictions, mobile, EN, dark mode, reduced motion and
absence of runtime API/service requests.

Deploy **`dist/`**, built with the existing **`npm run build`**. Astro remains
`output: 'static'`; no server adapter, Pages Function, Worker, D1, KV, Durable Object
or backend binding is introduced. The simulated queue, worker and database execute
in the visitor's browser. The Node browser-review helper is not in the client bundle.

The catalogue is linked from the shared section navigation. Links from individual
Pills are not added in this change. No unpublished
Pill targets or inactive reference configuration are retained.

See [the code review](../../../docs/design/async-chaos-lab/code-review.md) for the
cleanup and regression fixes, and [the interface notes](../../../docs/design/async-chaos-lab/interface-notes.md)
for the current visual/interaction decisions.
