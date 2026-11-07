# About me

The home page: the personal journey told as life chapters, what I bring, what I know, and the mascot that walks along the page while it scrolls.

## Inside

- `timeline-entry.ts` and `timeline-repository.ts`: the journey, read from the `timeline` collection.
- `skills.ts` and `contributions.ts`: the skill cards and contribution blocks.
- `copy.ts`: every interface text of the page, one section per illustrated component.
- `components/`: the page sections, the walking route and the mascot.

## Notes

- The collection is still named `timeline`: content storage and feature ownership need not share a name.
- Mascot calculations are pure functions with unit tests; the component only paints them.
