import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
  }),
});

const principles = defineCollection({
  loader: localizedMarkdown('principles'),
  schema: z.object({
    title: z.string().min(1).max(80),
    order: z.number().int().default(0),
  }),
});

const timeline = defineCollection({
  loader: localizedMarkdown('timeline'),
  schema: z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    sector: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    summary: z.string().min(10),
  }),
});

const work = defineCollection({
  loader: localizedMarkdown('work'),
  schema: z.object({
    company: z.string().min(1),
    companyUrl: z.url(),
    role: z.string().min(1),
    location: z.string().min(1),
    startDate: z.coerce.date(),
    lastUpdateDate: z.coerce.date(),
  }),
});

const pills = defineCollection({
  loader: localizedMarkdown('pills'),
  schema: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('series'),
      title: z.string().min(1).max(60),
      summary: z.string().min(10).max(200),
      icon: z.string().min(1),
      publicationDate: z.coerce.date(),
    }),
    z.object({
      kind: z.literal('pill'),
      title: z.string().min(1).max(80),
      subtitle: z.string().min(1).max(80),
      icon: z.string().min(1),
      order: z.number().int(),
      bonus: z.boolean().default(false),
      publicationDate: z.coerce.date(),
      lastUpdateDate: z.coerce.date().optional(),
    }),
  ]),
});

export const collections = { posts, principles, timeline, work, pills };
