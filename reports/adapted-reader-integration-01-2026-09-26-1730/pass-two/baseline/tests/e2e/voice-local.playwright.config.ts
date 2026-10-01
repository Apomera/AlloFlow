import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results/voice-local',
  testMatch: '38-voice-access-local-app.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3002',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
  webServer: {
    // The full-app harness avoids CRA's premature-ready development port.
    command: 'node full-pack-app-server.cjs',
    url: 'http://127.0.0.1:3002/__health',
    timeout: 1_200_000,
    reuseExistingServer: false,
    env: { PORT: '3002', NODE_OPTIONS: '--max-old-space-size=8192' },
  },
});
