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
the confirmation, then the worker crashes before saving its checkpoint. Every
scripted fault occurs once per run.

Each action can be renamed and assigned one of five behaviors:

| Kind        | Replay behavior                                                   |
| ----------- | ----------------------------------------------------------------- |
| `check`     | Rechecks immutable input; no external effect.                     |
| `set-state` | Sets the same local value; safe to repeat.                        |
| `append`    | Creates another local row; unsafe to repeat without protection.   |
| `external`  | Applies another external effect unless the receiver deduplicates. |
| `notify`    | Sends another notification unless the receiver deduplicates.      |

Remember by ID writes a durable checkpoint after the action succeeds. Later
attempts skip that job/step when its checkpoint exists. Remembering the charge
prevents the earlier charge from being repeated; the final email still becomes
uncertain if the worker crashes before its checkpoint. Only a receiver that
recognizes the same stable notification ID can make that retry safe. Remembering
additional repeatable actions trades extra stored state for less repeated work.
With all four remembered and provider deduplication enabled for the email, five
previous successful actions are skipped and 14 action attempts occur, including
the two interrupted attempts. Failed actions are still executed again.

No external effects does not imply idempotency: a local append can duplicate.
Conversely, pure checks and setting the same local value do not need provider
protection. A safe replay may waste work without violating data integrity.

### A checkpoint is not an exactly-once guarantee

The scripted last-payment failure and engine-only `gap: 'charge' | 'email'`
regression scenarios crash after an external effect and before its local
checkpoint. A local marker cannot protect an operation that finished without that
marker being written. Retrying can duplicate it.

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
