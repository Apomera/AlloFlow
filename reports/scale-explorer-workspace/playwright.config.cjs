const { defineConfig } = require('@playwright/test');
const path = require('node:path');
module.exports = defineConfig({
  testDir: path.resolve(__dirname, '../../tests/e2e'),
  testMatch: /scale-explorer-.*\.spec\.ts/,
  workers: 1, fullyParallel: false, retries: 0, timeout: 360000,
  expect: { timeout: 15000 },
  reporter: [['list']],
  outputDir: path.join(__dirname, 'test-results'),
  use: { browserName: 'chromium', actionTimeout: 20000, viewport: { width: 1400, height: 1100 }, screenshot: 'only-on-failure', trace: 'off', video: 'off' }
});
