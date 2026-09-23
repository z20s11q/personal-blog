import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    reviewedAt: z.coerce.date(),
    category: z.string(),
    readingMinutes: z.number(),
  }),
});

const rust = defineCollection({
  loader: glob({ base: './src/content/rust', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    order: z.string(),
    chapter: z.number().nullable(),
  }),
});

export const collections = { articles, rust };
