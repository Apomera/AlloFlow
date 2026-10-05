import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', globals: false, maxWorkers: 1,
    include: ['reports/classroom-reliability-followup-2026-10-03/recovery_draft_schema.test.js'],
  },
});
