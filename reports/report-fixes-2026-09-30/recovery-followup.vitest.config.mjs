import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  environment: 'node', include: ['tests/report_storage_mixed_recovery.test.js'],
  pool: 'threads', maxWorkers: 1, testTimeout: 15000,
} });
