# Labs

Every interactive lab and the catalogue that presents them, in one feature so the catalogue can read each lab's entry without crossing feature boundaries.

## Inside

- `catalogue/`: the labs index.
- `async-chaos-lab/`: three payment levels on a shared simulation engine.
- `exit-137/`: the memory card game.

## Notes

- Each lab writes its own `catalogue-entry.ts` and `catalogue-preview/`, so adding a lab never edits another lab's text.
