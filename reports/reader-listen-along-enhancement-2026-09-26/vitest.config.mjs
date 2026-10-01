import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
const folder = 'reports/reader-listen-along-enhancement-2026-09-26';
process.env.ALLO_VIEW_CANDIDATE = resolve(folder, 'candidate/view_simplified_module.js');
export default defineConfig({
  cacheDir: resolve(folder, '.vite-cache'),
  test: {
    environment: 'jsdom', setupFiles: ['./tests/setup.js'],
    include: [folder + '/*.test.js', 'tests/reader_display_menu.test.js', 'tests/reader_keyboard_a11y.test.js', 'tests/reader_place_review_adapt.test.js'],
    globals: false, maxWorkers: 1
  }
});
