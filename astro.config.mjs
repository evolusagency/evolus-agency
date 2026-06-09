import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeInternalLinks from './src/lib/rehypeInternalLinks.ts';

export default defineConfig({
  site: 'https://evolus.agency',

  integrations: [
    sitemap()
  ],

  markdown: {
    processor: unified({
      rehypePlugins: [
        rehypeInternalLinks,
      ],
    }),
  },
});