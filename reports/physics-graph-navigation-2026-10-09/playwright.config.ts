import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';
import path from 'node:path';

const reportDir = path.resolve('reports/physics-graph-navigation-2026-10-09');

// These local graph tests save their own native PNG and geometry evidence.
export default defineConfig({
  ...base,
  testDir: '../../tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: path.join(reportDir, process.env.PHYSICS_BROWSER_RESULTS || 'browser-results.json') }]],
  outputDir: path.join(reportDir, process.env.PHYSICS_BROWSER_ARTIFACTS || 'browser-artifacts'),
  use: { ...base.use, trace: 'off', video: 'off' },
});
