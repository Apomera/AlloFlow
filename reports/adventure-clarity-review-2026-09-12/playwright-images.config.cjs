const path = require('node:path');
module.exports = { testDir: path.resolve(__dirname, '../../tests/e2e'), testMatch: ['adventure-image-lifecycle.spec.ts', 'adventure-journey.spec.ts'], workers: 2, timeout: 60000, retries: 0, reporter: 'list', use: { browserName: 'chromium', video: 'off', trace: 'retain-on-failure' }, outputDir: path.join(__dirname, 'image-browser-tests') };
