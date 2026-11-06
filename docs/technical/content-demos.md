# Interactive demos in Markdown

Markdown is compiled to HTML by Astro. Regular HTML can already appear between
paragraphs. Use `content-demo` for a named interactive block:

```html
<content-demo name="your-demo">
  <p>Explain the relationship here for readers without JavaScript.</p>
</content-demo>
```

Leave blank lines before and after the block. Write fallback HTML in the article's
language; Markdown syntax inside a raw HTML block is not parsed as Markdown.
The demo inherits the nearest `lang` attribute, normally the page language.

## Add a demo

1. Add an implementation under `src/features/<demo-name>/`. Export
   `mount(host, locale)`, returning a cleanup function for observers, timers,
   listeners and any other resources. Preserve and restore fallback nodes in
   cleanup. Import CSS with `?inline` and attach its style element during mount,
   so Astro does not hoist that stylesheet into pages that do not use the demo.
   Scope selectors to the demo's root and remove its style element in cleanup.
2. Register an explicit dynamic import in
   `src/shared/content-demos/registry.ts`, for example
   `'your-demo': () => import('@/features/your-demo/your-demo')`.
   The registry starts empty and lists supported names; Markdown supplies the
   name, never executable source or an import URL.
3. Place the HTML block anywhere in the article or pill, in both languages.
4. Verify both languages, mobile, keyboard use, reduced motion, no JavaScript
   and client navigation. Stop animations when offscreen or when the tab is hidden.

`BaseLayout` installs the small custom element loader once. It imports a demo
only when that demo appears in the current document. Unknown names keep their
fallback content. Import or mount failures preserve the fallback and offer a
retry button. Disconnecting a demo invokes its cleanup function; reconnecting
mounts it again.

