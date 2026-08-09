import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const contentFields = {
  title: z.string().min(1),
  excerpt: z.string(),
  heroImage: z.string().regex(/^\/assets\//).nullable(),
  heroAlt: z.string().nullable(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
};

const impact = defineCollection({
  loader: glob({ base: './src/content/impact', pattern: '**/*.md' }),
  schema: z.object({ ...contentFields, nextSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional() }).strict()
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.md' }),
  schema: z.object(contentFields).strict()
});

const events = defineCollection({
  loader: glob({ base: './src/content/events', pattern: '**/*.md' }),
  schema: z.object(contentFields).strict()
});

const pageFields = z.object({
  route: z.string().regex(/^\//),
  title: z.string().min(1),
  description: z.string(),
  heading: z.string().min(1),
  body: z.array(z.string()),
  heroImage: z.string().regex(/^\/assets\//).nullable(),
  heroAlt: z.string().nullable(),
  links: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) }).strict())
}).strict();

const institutionalPages = defineCollection({
  loader: glob({ base: './src/content/pages/institutional', pattern: '**/*.json' }),
  schema: pageFields
});

const legalPages = defineCollection({
  loader: glob({ base: './src/content/pages/legal', pattern: '**/*.json' }),
  schema: pageFields
});

const reportPages = defineCollection({
  loader: glob({ base: './src/content/pages/reports', pattern: '**/*.json' }),
  schema: pageFields
});

const contactMediaDonationPages = defineCollection({
  loader: glob({ base: './src/content/pages/contact-media-donation', pattern: '**/*.json' }),
  schema: pageFields
});

export const collections = { impact, news, events, institutionalPages, legalPages, reportPages, contactMediaDonationPages };
