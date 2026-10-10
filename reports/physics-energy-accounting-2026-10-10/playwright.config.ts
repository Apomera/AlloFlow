import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';
import path from 'node:path';

const reportDir = path.resolve('reports/physics-energy-accounting-2026-10-10');

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
