import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const impact = defineCollection({
  loader: glob({ base: './src/content/impact', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    publishedAt: z.coerce.date().optional(),
    excerpt: z.string(),
    heroImage: z.string().regex(/^\/assets\//),
    heroAlt: z.string(),
    nextSlug: z.string().optional()
  })
});

export const collections = { impact };
