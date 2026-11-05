# Coverflow

A container-sized Astro gallery of website previews in continuous motion, with
a counter, a play/pause button, dots, arrow keys,
mouse and touch dragging, and static links without JavaScript. It has no dependency on blog data or page layout.

```astro
---
import Coverflow from '@/shared/coverflow/Coverflow.astro';
const items = [
  { title: 'First site', href: 'https://example.com/blog',
    image: '/images/first.webp', imageAlt: 'First site homepage' },
  // Add more items; three or more enable the moving gallery.
];
---
<Coverflow
  title="More to explore"
  {items}
  labels={{ pause: 'Pause', resume: 'Resume',
    choose: 'Choose a website', visit: 'Visit website', carousel: 'carousel' }}
/>
```

`items`, `title` and `labels` are required. `CoverflowItem` and `CoverflowLabels`
are exported from `coverflow.ts`. Each item accepts `title`, `href`, `image`,
`imageAlt`, optional `caption` for the browser bar and optional `description`,
shown under the centred card with a crossfade. Links open in a new tab.

Optional props:

- `description`: text below the heading.
- `id`: a stable anchor; otherwise each instance generates its own unique ID.
- `initialIndex`: first centered item, clamped to the available items; default 0.
- `duration`: milliseconds the drift takes to move one item; default 8000,
  minimum 1000. Invalid values use the default.
- `autoplay`: default true. Reduced motion always starts paused; users can
  explicitly resume.

The caller owns outer spacing and full-width page breakouts. Card sizes and
responsive rules use the component's container, so no page CSS is required.
Multiple instances have independent controls and lifecycle state.

The cards drift continuously. Moving the mouse onto a card eases the drift to a
halt so it can be read or clicked; moving off it, or scrolling the page, eases
it back. Content scrolling or drifting under a resting mouse never holds it. Resting the mouse on a
side card brings it to the centre; whatever slides under a still mouse never
triggers another glide. Neighbouring cards part at the halfway point of a
crossing so their stacking order swaps where they no longer overlap. Any deliberate choice
(a dot, a side card, an arrow key, a drag or keyboard focus on a
slide) glides there with an ease-out and stops the motion on that item; Play
resumes the drift from there. A drag
follows the pointer, can grab cards mid-glide, lands on the nearest item (a
flick carries one further) and never follows the link underneath. Clicking the
centred card opens its link. A muted hint under the dots (`dragHint`, or
`swipeHint` on coarse pointers) fades away after the visitor's first drag and
stays hidden on later visits.
Background tabs and offscreen instances suspend work without changing the
selected playback state. Removing the element disposes its animation,
observers and event handlers; reconnecting the same element restores position
and playback state. Replacing it with a new element starts from its props.

Zero items render nothing. One or two render a static responsive gallery with
normal links and no playback controls. Three or more enable coverflow; the
returning card fades out before crossing the loop boundary. Arbitrarily large
catalogues still animate every item: use a curated set of previews rather than
an unbounded feed. Preview images are static assets supplied by the caller.

The blog uses a small adapter:

```astro
---
import FriendBlogs from '@/features/friend-blogs/components/FriendBlogs.astro';
---
<FriendBlogs locale="es" />
```

Its catalogue lives in `src/content/friend-blogs.json`. It owns the translations
and website destinations; Coverflow owns rendering and interaction.
