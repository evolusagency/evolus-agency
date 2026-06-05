import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    tag: z.string(),
    read: z.string(),
    image: z.string().optional(),
    lang: z.enum(['fr', 'en']).default('fr'),
  }),
});

export const collections = { blog };