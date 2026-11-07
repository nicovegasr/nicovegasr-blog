# Friends' blogs

A self-contained block any page can drop in: the friends' blogs, read from `src/content/friend-blogs.json`, drifting past in a 3D gallery.

## Inside

- `friend-blog.ts` and `friend-blog-repository.ts`: the data and its only reader.
- `components/FriendBlogs.astro` and `copy.ts`: the block and its text.
- `coverflow/`: the gallery, see its README.

## Notes

- It is the one shared piece that reads its own content collection, because it is a whole widget rather than a helper.
- The gallery lives inside because nothing else uses it.
