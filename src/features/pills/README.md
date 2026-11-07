# Pills

Short lessons grouped in series: the shelf of book spines, the notebook reader with its index, keyboard and swipe navigation, and the animated moments inside some pills.

## Inside

- `pill.ts`, `pill-repository.ts`, `pill-shelf.ts`: series, pills and the shelf order.
- `components/`: the shelf, `PillNotebook`, `PillReader` and its `PillReaderIndex`.
- `reader-*.ts`: navigation, keyboard, swipe, image zoom and the index toggle.
- `moments/`: interactive scenes a pill can embed, with their own `moments-copy.ts`.

## Notes

- The notebook opts into Astro's `ClientRouter`, so changing pill keeps the index.
- `content.config.ts` imports the list of moment stages from here to validate the frontmatter.
