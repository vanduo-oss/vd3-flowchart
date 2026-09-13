import { defineConfig } from 'vitest/config';

// Default to the `node` environment so DOM-free code (chart primitives) is
// proven runtime-agnostic; DOM-dependent spec files opt into jsdom with a
// `// @vitest-environment jsdom` docblock. Shared jsdom stubs are installed
// once via setupFiles (they self-guard on `window`).
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
