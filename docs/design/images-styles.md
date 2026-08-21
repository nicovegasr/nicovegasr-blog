# Image style guide

This guide defines the current visual language for educational images in the
blog. It is deliberately evolutionary: preserve what works, but do not turn
previous images into templates or repeat their compositions.

## Purpose

Every image must teach one relationship that is easier to understand visually
than through prose. If the image only decorates the article or repeats a list,
omit it.

Before generating an image:

1. Read the article and state the single idea the image must explain.
2. Name an original, subject-specific visual concept.
3. Explain how that concept differs from existing blog images.
4. Define the exact labels for every locale before generation.

Existing assets are quality references, not compositions or styles to copy.

## Visual language

- Use a white or warm off-white background with generous empty space.
- Use deep navy for the main drawing and typography.
- Use blue for the principal flow or action, teal for a supporting system or
  alternative path, orange for transformation, friction, or attention, and
  green only for a successful result.
- Prefer bold technical outlines, simple geometric forms, and mostly flat
  illustration. A light paper grain or restrained depth is acceptable when it
  improves cohesion, but the result must not look photorealistic.
- Give the composition one obvious reading path. Arrows and connectors must
  explain causality, sequence, ownership, or contrast rather than decorate.
- Use one strong visual metaphor or system model per image. Do not mix several
  unrelated metaphors.
- Make the subject specific to the article. Avoid generic dashboards, floating
  cards, stock cloud diagrams, ornamental circuitry, and icon collections with
  no teaching role.

## Composition and typography

- Prefer a landscape `3:2` canvas around `1440x960`. A wider ratio is allowed
  when a genuinely sequential flow needs it.
- Keep the title short and make it the strongest text element.
- Use a condensed, bold sans serif for titles and a highly legible sans serif
  for labels. Use monospace only for real code, commands, or payloads.
- Keep labels brief. At mobile width, the main idea, stages, and arrows must
  remain understandable without zooming.
- Avoid paragraphs inside images, tiny annotations, dense legends, and text
  placed close to the edges.
- Leave safe margins around all content and keep visual weight balanced.

## Technical accuracy

- Model a real mechanism, trade-off, or boundary; do not imply a false process
  merely because it makes a cleaner diagram.
- Use domain terms consistently with the article.
- Do not invent commands, response shapes, interfaces, metrics, or product
  behaviour.
- Brand names may appear when the article teaches with a real product, but do
  not imitate a vendor's marketing artwork or depend on its logo to explain the
  concept.

## Localisation

- Create equivalent Spanish and English assets with the same teaching idea,
  hierarchy, stages, and semantic colours.
- Translate meaning rather than forcing identical line lengths.
- Use descriptive alt text in the article. Alt text should explain the visual
  relationship, not repeat the title or list decorative objects.
- Check accents, punctuation, capitalisation, and technical identifiers before
  accepting either asset.

## Review checklist

- The image communicates one useful idea within a few seconds.
- The reading order is unambiguous.
- Every object, colour, arrow, and label has a teaching role.
- Text is correct and readable at rendered desktop and mobile widths.
- ES and EN versions are structurally equivalent.
- The result is original and not a restyled copy of another blog image.
- The final project asset uses WebP unless transparency or another technical
  requirement justifies a different format.
- The article renders correctly and the production build succeeds.

## Current Fundamentos baseline

The Fundamentos images establish a useful range rather than one fixed layout:

- `API` succeeds through repeated examples with one shared contract.
- `Tipos de API` uses distinct metaphors around a central category.
- `Backend` uses a direct three-step causal flow.
- `Frontend` separates visible interface from state and coordination.
- `Base de datos` makes contention and the cost of different paths visible.
- `Infraestructura` uses a cutaway comparison to show responsibility by layer.

Their common strengths are a clear thesis, concrete technical objects, dark
outlines, restrained semantic colour, and a visual relationship that carries
the explanation. Future images should preserve those strengths while finding
a composition native to each subject.
