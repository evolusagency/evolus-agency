import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://evolus.agency',

  integrations: [
    sitemap()
  ]
});