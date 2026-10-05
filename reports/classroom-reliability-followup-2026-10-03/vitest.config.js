import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['reports/classroom-reliability-followup-2026-10-03/student-response-lifecycle.test.js'],
    globals: false,
    maxWorkers: 1,
  },
});
