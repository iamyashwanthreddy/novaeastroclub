import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    // three.js is ~135 kB gzipped and only loaded after the page shell paints.
    chunkSizeWarningLimit: 700,
  },
});
