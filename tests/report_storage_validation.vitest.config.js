import { defineConfig } from 'vitest/config';

export default defineConfig({ test: {
  environment: 'node', include: ['tests/report_storage_ack_recovery.test.js', 'tests/storage_adapter_bootstrap_readiness.test.js'],
  pool: 'threads', maxWorkers: 1, testTimeout: 15000, hookTimeout: 15000,
} });
