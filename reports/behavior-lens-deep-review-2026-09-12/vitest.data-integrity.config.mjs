import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'], include: ['reports/behavior-lens-deep-review-2026-09-12/data-integrity.probe.test.js'], maxWorkers: 1, testTimeout: 15000 } });
