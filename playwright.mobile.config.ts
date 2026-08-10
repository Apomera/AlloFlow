import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile + tablet responsive suite.
 *
 * Unlike `playwright.config.ts` (which points at the deployed site), this
 * config drives the **working tree** through the CRA dev server, so a fix can
 * be verified in the same loop that found the bug. Nothing here deploys.
 *
 *   npx playwright test -c playwright.mobile.config.ts
 *   npx playwright test -c playwright.mobile.config.ts --project=phone-ios
 *
 * The first run compiles a 3MB App.jsx, so the webServer timeout is generous.
 * Leave the dev server running between runs and `reuseExistingServer` picks it
 * up instantly.
 */

const PORT = process.env.PW_MOBILE_PORT || '3000';
const BASE_URL = process.env.PW_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e/mobile',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One worker. This app takes 20s+ to boot per test, and two workers hitting
  // the same dev server produced 60s navigation timeouts that looked like
  // layout failures but were pure contention.
  workers: 1,
  timeout: 180000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-mobile' }],
    ['json', { outputFile: 'test-results/mobile-responsive.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20000,
    navigationTimeout: 120000,
  },
  expect: {
    timeout: 15000,
  },
  projects: [
    // Phones. iOS runs on real WebKit because iOS Safari is the engine those
    // users actually have, and it diverges from Chromium on exactly the things
    // this suite tests (100vh, safe-area insets, position:fixed, momentum scroll).
    {
      name: 'phone-android',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
    {
      name: 'phone-ios',
      use: { ...devices['iPhone 14'] }, // webkit
    },
    // Small phone: the width where flex rows and fixed-width panels break first.
    {
      name: 'phone-small',
      use: { ...devices['iPhone SE'] }, // webkit, 375x667
    },
    // Tablets, both orientations. Landscape matters because the app's
    // breakpoints often treat >=1024px as "desktop" and re-enable a sidebar
    // that has no room on a real iPad.
    {
      name: 'tablet-ios-portrait',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'tablet-ios-landscape',
      use: { ...devices['iPad (gen 7) landscape'] },
    },
  ],
  outputDir: 'test-results/mobile',
  webServer: {
    command: 'npm --prefix desktop/web-app start',
    url: BASE_URL,
    timeout: 900000,
    reuseExistingServer: !process.env.CI,
    env: { BROWSER: 'none', PORT, NODE_OPTIONS: '--max-old-space-size=4096' },
  },
});
