import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // translation_pipeline.test.js is a custom Node assert-based runner
    // (like tests/clinical_tests.js), not a vitest suite. Vitest fails
    // its discovery because the file's `test()` calls aren't vitest's
    // API. The file works correctly when invoked directly — it just
    // shouldn't be a vitest target. Run separately via
    // `node tests/translation_pipeline.test.js`.
    exclude: ['node_modules/**', 'tests/translation_pipeline.test.js'],
    globals: false,
  },
});
