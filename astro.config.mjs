import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// No need for a Tailwind plugin yet, we'll use the PostCSS config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 4321,  // <-- Set your desired port here
    host: true   // <-- Listen on all interfaces (not just 127.0.0.1)
  },
});