const path = require('node:path');
module.exports = { testDir: path.resolve(__dirname, '../../tests/e2e'), testMatch: 'persona-refinement.spec.ts', workers: 2, timeout: 45000, retries: 0, reporter: 'list', use: { browserName: 'chromium', trace: 'retain-on-failure' }, outputDir: path.join(__dirname, 'browser-tests') };
