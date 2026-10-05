import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../playwright.config';

// Local harness verification: avoid slow video/trace flushing on this machine.
export default defineConfig({
  ...base,
  testDir: resolve(process.cwd(), 'tests/e2e'),
  outputDir: resolve(process.cwd(), 'reports/solar-control-deck-enhancement-2026-10-01/final-browser-results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240000,
  reporter: 'line',
  use: { ...base.use, video: 'off', trace: 'off' },
  projects: base.projects?.map(project => ({
    ...project,
    use: { ...base.use, ...project.use, video: 'off', trace: 'off' },
  })),
});
