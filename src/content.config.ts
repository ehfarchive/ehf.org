import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseStrictUtcIsoDate } from './lib/iso-date';

const publishedAt = z.string().refine((value) => {
  try {
    parseStrictUtcIsoDate(value, 'publishedAt');
    return true;
  } catch {
    return false;
  }
}, 'publishedAt must be a valid ISO calendar date').optional();

const contentFields = {
  title: z.string().min(1),
  excerpt: z.string(),
  heroImage: z.string().regex(/^\/assets\//).nullable(),
  heroAlt: z.string().nullable(),
  publishedAt
};

const impact = defineCollection({
  loader: glob({ base: './src/content/impact', pattern: '**/*.md' }),
  schema: z.object({ ...contentFields, nextSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional() }).strict()
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.md' }),
  schema: z.object({
    ...contentFields,
    listingImage: z.string().regex(/^\/assets\//),
    listingAlt: z.string(),
    listingImagePosition: z.string().optional()
  }).strict()
});

const watch = defineCollection({
  loader: glob({ base: './src/content/watch', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    listingTitle: z.string(),
    speaker: z.string().nullable(),
    excerpt: z.string(),
    heroImage: z.string().regex(/^\/assets\//),
    heroAlt: z.string(),
    publishedAt,
    videoUrl: z.string().url().regex(/^https:\/\/www\.youtube\.com\/watch\?v=/),
    nextSlug: z.string().min(1).nullable()
  }).strict()
});

const fellowsArticles = defineCollection({
  loader: glob({ base: './src/content/fellows-articles', pattern: '**/*.md' }),
  schema: z.object({
    ...contentFields,
    pathSegment: z.string().min(1).refine((value) => !value.includes('/')),
    nextPathSegment: z.string().min(1).nullable()
  }).strict()
});

const snapshots = defineCollection({
  loader: glob({ base: './src/content/snapshots', pattern: '**/*.md' }),
  schema: z.object(contentFields).strict()
});

const events = defineCollection({
  loader: glob({ base: './src/content/events', pattern: '**/*.md' }),
  schema: z.object({
    ...contentFields,
    programmeDays: z.tuple([z.string().min(1), z.string().min(1)]).optional()
  }).strict()
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

export const collections = { impact, watch, fellowsArticles, news, events, snapshots, institutionalPages, legalPages, reportPages, contactMediaDonationPages };
