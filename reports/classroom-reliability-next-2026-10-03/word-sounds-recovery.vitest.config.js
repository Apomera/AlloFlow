import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', globals: false, maxWorkers: 1,
    include: ['reports/classroom-reliability-next-2026-10-03/word-sounds-recovery.test.js'],
  },
});
