import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'classroom-pending-resource-removal',
    environment: 'jsdom',
    include: ['reports/classroom-reliability-next-2026-10-03/pending-resource-removal.test.js'],
    maxWorkers: 1,
    globals: false
  }
});
