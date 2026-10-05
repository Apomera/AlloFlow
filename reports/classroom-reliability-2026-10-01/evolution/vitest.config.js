import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['reports/classroom-reliability-2026-10-01/evolution/evolab_reveal_integrity.test.js'],
    maxWorkers: 1,
    globals: false
  }
});
