import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['reports/classroom-reliability-followup-2026-10-03/resource_receiver_lifecycle.test.js'],
    maxWorkers: 1,
    name: 'classroom-resource-receiver-lifecycle',
    globals: false
  }
});
