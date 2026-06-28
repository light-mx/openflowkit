import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Inline (empty) PostCSS config so Vite doesn't walk up into the parent
  // repo's Tailwind PostCSS setup, which isn't installed here.
  css: { postcss: {} },
  test: {
    root: __dirname,
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
