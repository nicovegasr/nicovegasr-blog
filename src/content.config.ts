import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { MOMENT_STAGES } from './features/pills/moments/moment-stage';

// Markdown lives under src/content/<collection>/<locale>/<slug>.md.
// generateId keeps the "<locale>/<slug>" shape (extension stripped) so the
// locale and slug can be parsed from the entry id downstream.
const localizedMarkdown = (collection: string) =>
  glob({
    pattern: '**/*.md',
    base: `./src/content/${collection}`,
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
  });

const posts = defineCollection({
  loader: localizedMarkdown('posts'),
  schema: z.object({
    title: z.string().min(1).max(120),
    publicationDate: z.coerce.date(),
    lastUpdateDate: z.coerce.date().optional(),
    summary: z.string().min(20).max(280),
    tags: z.array(z.string().min(1)).default([]),
    // Slug of this post's counterpart in the other locale, so the language
    // switcher can link directly to it instead of falling back to the blog index.
    translationSlug: z.string().min(1).optional(),
    // Set when the article lives on another site: the entry has no body, so the
    // listing links out and the reading time can't be derived from the markdown.
    external: z
      .object({
        url: z.string().url(),
        publisher: z.string().min(1),
        readingTimeInMinutes: z.number().int().positive(),
      })
      .optional(),
  }),
});

const timeline = defineCollection({
  loader: localizedMarkdown('timeline'),
  schema: z.object({
    kind: z.enum(['work', 'personal']).default('work'),
    title: z.string().min(1),
    role: z.string().min(1).optional(),
    sector: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    summary: z.string().min(10),
  }),
});

const pills = defineCollection({
  loader: localizedMarkdown('pills'),
  schema: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('series'),
      draft: z.boolean().default(false),
      title: z.string().min(1).max(60),
      summary: z.string().min(10).max(200),
      icon: z.string().min(1),
      order: z.number().int(),
      publicationDate: z.coerce.date(),
    }),
    z.object({
      kind: z.literal('pill'),
      title: z.string().min(1).max(80),
      subtitle: z.string().min(1).max(80),
      icon: z.string().min(1),
      order: z.number().int(),
      momentStage: z.enum(MOMENT_STAGES).optional(),
      publicationDate: z.coerce.date(),
      lastUpdateDate: z.coerce.date().optional(),
    }),
  ]),
});

export const collections = { posts, timeline, pills };
