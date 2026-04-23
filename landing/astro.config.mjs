// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://recall.sh',
  integrations: [tailwind()],
  output: 'server',
  adapter: cloudflare({
    compatibilityDate: '2026-04-22',
  }),
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
