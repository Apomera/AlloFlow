const path = require('node:path');
module.exports = { ...require('../persona-mode-refinement-2026-09-12/playwright.config.cjs'), outputDir: path.join(__dirname, 'browser-tests') };
