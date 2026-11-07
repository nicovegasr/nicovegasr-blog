# Posts

Articles: the paginated grid, search, series, related posts, RSS feeds and the article page.

## Inside

- `post.ts`, `post-series.ts`, `post-pagination.ts`: types and pure rules, with unit tests.
- `post-repository.ts` and `post-feed.ts`: the only code that reads the `posts` collection.
- `BlogPage.astro` and `PostPage.astro`: the two pages the routes render.
- `copy.ts` and `components/`: interface text and the pieces of both pages.
- `post-markdown.ts` and `post-markdown-endpoint.ts`: each article as plain Markdown at `<url>.md`, for agents.
- `social-image/`: the share card layout (pure, tested) and the endpoint that draws it as PNG at build time.

## Notes

- Collection queries live in the repository; relations between two posts live in `post.ts`.
- The blog index shows the friends' blogs block from `shared/friend-blogs`.
