import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '38-voice-access-local-app.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
  webServer: {
    command: 'npm --prefix ../../desktop/web-app start',
    url: 'http://127.0.0.1:3000',
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      BROWSER: 'none',
      PORT: '3000',
      DISABLE_ESLINT_PLUGIN: 'true',
      GENERATE_SOURCEMAP: 'false',
    },
  },
});
