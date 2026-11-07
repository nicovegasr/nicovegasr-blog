# Discovery

How search engines and AI agents find and understand the site: the author's
identity, the schema.org structured data and the `/llms.txt` index.

## Inside

- `author.ts`: name, portrait and public profiles, the single source for links and structured data.
- `structured-data.ts` and `JsonLd.astro`: the WebSite, Person and BlogPosting graphs, with unit tests.
- `llms-text.ts`: the `/llms.txt` renderer, with unit tests.

## Notes

- Pages gather the content; this piece only shapes it, so it never imports a feature.
