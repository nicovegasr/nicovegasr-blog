import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro:schema';

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
  }),
});

const projects = defineCollection({
  loader: localizedMarkdown('projects'),
  schema: z.object({
    title: z.string().min(1).max(80),
    pitch: z.string().min(20).max(280),
    origin: z.string().min(20),
    learnings: z.array(z.string().min(1)).min(1),
    order: z.number().int().default(0),
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
    companyUrl: z.string().url(),
    role: z.string().min(1),
    location: z.string().min(1),
    startDate: z.coerce.date(),
    lastUpdateDate: z.coerce.date(),
  }),
});

export const collections = { posts, projects, principles, timeline, work };
