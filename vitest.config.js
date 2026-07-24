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
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: './coverage',
      all: false,
      include: ['*_module.js', 'stem_lab/**/*.js', 'sel_hub/**/*.js'],
      exclude: ['tests/**', 'node_modules/**', 'desktop/web-app/**', '**/*_source.jsx', 'coverage/**'],
      // KNOWN LIMITATION: most unit tests load CDN modules via the loadAlloModule
      // `new Function()` eval harness (tests/setup.js), and @vitest/coverage-v8 does
      // NOT instrument eval'd scripts — so those modules report ~0% even though they
      // are exercised. `npm run test:coverage` is therefore only meaningful for code
      // genuinely ESM-imported by tests. Making module coverage real would require
      // refactoring the harness to import the modules (they're window-registering
      // IIFEs today) — a separate, larger task.
    },
  },
});
