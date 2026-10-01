import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
const folder = 'reports/reader-bilingual-revision-review-2026-09-26';
process.env.ALLO_VIEW_CANDIDATE = resolve(folder, 'candidate/view_simplified_module.js');
process.env.ALLO_CE_CANDIDATE = resolve(folder, 'candidate/content_engine_module.js');
export default defineConfig({ cacheDir: resolve(folder, '.vite-cache'), test: {
  environment: 'jsdom', setupFiles: ['./tests/setup.js'], maxWorkers: 1,
  include: [folder + '/bilingual_revision_review.test.js', folder + '/regressions/*.test.js', 'tests/revision_target.test.js', 'tests/adapted_reading_popup_read_aloud.test.js', 'tests/reader_keyboard_a11y.test.js'], globals: false
} });
