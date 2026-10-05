import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['reports/classroom-reliability-next-2026-10-03/studio-submission-readiness.test.js'],
    globals: false,
    maxWorkers: 1,
  },
});
