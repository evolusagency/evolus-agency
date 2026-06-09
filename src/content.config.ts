import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog'
  }),

  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),

    tag: z.string(),
    read: z.string(),

    image: z.string().optional(),

    lang: z.enum(['fr', 'en']).default('fr'),

    category: z.enum([
      'seo',
      'marketing',
      'automation',
      'web-design'
    ]).default('seo'),

    featured: z.boolean().default(false),

    pillar: z.boolean().default(false),

    author: z.string().default('Evolus Agency')
  }),
});

export const collections = { blog };