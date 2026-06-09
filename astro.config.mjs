import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import internalLinksIntegration from './src/lib/internalLinksIntegration.ts';

export default defineConfig({
  site: 'https://evolus.agency',
  compressHTML: true,
  build: {
    minifyCSS: true,
    minifyJS: true,
  },

  integrations: [
    internalLinksIntegration(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    })
  ],
});