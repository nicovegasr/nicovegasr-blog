# Exit 137

A card game about keeping a log job inside its memory: four challenges with one three-star solution each.

## Inside

- `engine.ts`, `challenges.ts`, `guide.ts`, `attempts.ts`: the pure simulation, with unit tests.
- `controller.ts`: orchestrates the focused views (`hud-view`, `code-view`, `result-view`, `stage-animator`, `coach-overlay`).
- `copy.ts`, `copy-es.ts`, `copy-en.ts`: every text behind the `LabCopy` type.
- `catalogue-entry.ts` and `catalogue-preview/`: what the labs catalogue shows.

## Notes

- The engine holds no words: `guide.ts` returns hint keys that the views translate.
- Numbers are deliberately round: the lab teaches orders of magnitude, not a benchmark.
