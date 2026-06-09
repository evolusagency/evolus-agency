import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeInternalLinks from './src/lib/rehypeInternalLinks.ts';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://evolus.agency',

  output: 'static',

  adapter: cloudflare({
    mode: 'advanced'
  }),

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