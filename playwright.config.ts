import { defineConfig, devices } from '@playwright/test';

/**
 * Timeouts are deliberately generous.
 *
 * These specs drive the deployed app, which boots from CDN (React, Tailwind,
 * lucide, then the AlloFlow bundle and its lazy modules). A cold first paint
 * routinely exceeds Playwright's 30s default, and most specs wait on an element
 * that only exists after mount — so the default budget produced failures that
 * looked like missing UI but were just an unfinished boot.
 *
 * Measured on 05-sidebar-controls against the deployed app:
 *     30s  per test, 6 workers  ->  0 passed / 10 failed
 *    150s  per test, 2 workers  ->  7 passed /  3 failed
 * Two of the three residual failures were `page.goto` hitting the 45s
 * navigation timeout, which is why navigationTimeout is raised as well.
 *
 * Fewer local workers matters too: parallel cold boots contend for the same CDN
 * and make every one of them slower.
 *
 * NOTE ON baseURL: it has no path, so specs use `page.goto('/')`. If you point
 * PW_BASE_URL at a URL that HAS a path (e.g. .../app/), `goto('/')` resolves
 * against the ORIGIN and silently drops that path — loading the wrong page.
 * Use a path-less origin here, or switch the specs to `goto('./')`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 3,
  timeout: 120000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PW_BASE_URL || 'https://prismflow-911fe.web.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 90000,
  },
  expect: {
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results',
});
