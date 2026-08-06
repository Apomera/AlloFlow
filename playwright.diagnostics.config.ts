import { defineConfig, devices } from '@playwright/test';

/**
 * Diagnostics, not suite members.
 *
 * A few probes are worth keeping but not worth running on every pass: they
 * start and stop a static server per case, mount whole tools, and take minutes.
 * Naming them *.diagnostic.ts keeps them out of the main config's testMatch;
 * this config is how you run them on purpose.
 *
 *   npx playwright test --config=playwright.diagnostics.config.ts
 *   npx playwright test --config=playwright.diagnostics.config.ts -g heatLab
 *
 * Deliberately separate from playwright.config.ts so the main suite's settings
 * are untouched — and because these measure, they never retry: a retried
 * measurement is a different measurement.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.diagnostic.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 30000,
    navigationTimeout: 45000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  outputDir: 'test-results/diagnostics',
});
