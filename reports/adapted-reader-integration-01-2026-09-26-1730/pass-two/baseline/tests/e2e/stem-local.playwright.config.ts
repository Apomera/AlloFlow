import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '36-stem-local-app.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 240000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3000',
    // Failure injection must reach page.route instead of a service-worker cache.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60000,
    actionTimeout: 20000,
  },
  webServer: {
    command: 'npm --prefix ../../desktop/web-app start',
    url: 'http://127.0.0.1:3000',
    timeout: 600000,
    reuseExistingServer: !process.env.CI,
    // This server exists only to exercise the built browser behavior. Parsing and
    // linting run in separate gates; skipping them here keeps the 3+ MB host bundle
    // within CI/OneDrive memory limits and avoids generating unused source maps.
    env: {
      BROWSER: 'none',
      PORT: '3000',
      DISABLE_ESLINT_PLUGIN: 'true',
      GENERATE_SOURCEMAP: 'false',
      // Match the production build's heap allowance: compiling the full host
      // exceeds Node's default 4 GB before these browser tests can start.
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
    },
  },
});
