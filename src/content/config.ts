import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(120),
    publicationDate: z.coerce.date(),
    lastUpdateDate: z.coerce.date().optional(),
    summary: z.string().min(20).max(280),
    tags: z.array(z.string().min(1)).default([]),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(80),
    pitch: z.string().min(20).max(280),
    origin: z.string().min(20),
    learnings: z.array(z.string().min(1)).min(1),
    order: z.number().int().default(0),
  }),
});

const values = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(80),
    order: z.number().int().default(0),
  }),
});

const timeline = defineCollection({
  type: 'content',
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
  type: 'content',
  schema: z.object({
    company: z.string().min(1),
    headline: z.string().min(10),
    lastUpdateDate: z.coerce.date(),
  }),
});

export const collections = { posts, projects, values, timeline, work };
