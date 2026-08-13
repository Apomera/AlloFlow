import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '37-full-pack-local-app.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 240000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3001',
    serviceWorkers: 'block',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 20000,
  },
  webServer: {
    command: 'node full-pack-app-server.cjs',
    url: 'http://127.0.0.1:3001/__health',
    timeout: 1200000,
    reuseExistingServer: false,
    env: { PORT: '3001', NODE_OPTIONS: '--max-old-space-size=8192' },
  },
});
