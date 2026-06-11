// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://fletched.me',
  integrations: [sitemap()],
  // Disable the in-page Astro dev toolbar (the floating dev-only popup).
  devToolbar: { enabled: false },
  // Prefetch internal links on hover for instant navigation.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: {
    // inline small stylesheets to cut render-blocking requests
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
