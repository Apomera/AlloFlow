import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'jsdom', setupFiles: ['./tests/setup.js'],
  include: ['reports/reader-place-lifecycle-enhancement/ui-regression.test.js', 'tests/reader_place_persistence.test.js', 'tests/reader_place_lifecycle.test.js',
    'tests/reader_place_review_adapt.test.js', 'tests/reader_keyboard_a11y.test.js', 'tests/reader_render_cost.test.js',
    'tests/reader_display_menu.test.js', 'tests/reader_sentence_links.test.js', 'tests/reader_i18n.test.js'],
  env: { ALLO_VIEW_CANDIDATE: (process.env.ALLO_READING_RECOVERY_UI_ROOT ?? 'reports/reader-place-lifecycle-enhancement/') + 'view_simplified_module.js' }, maxWorkers: 1
} });
