import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// No need for a Tailwind plugin yet, we'll use the PostCSS config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
});