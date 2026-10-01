'use strict';
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = 'reports/report-fixes-2026-09-30/';
const read = name => JSON.parse(fs.readFileSync(dir + name, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const browser = read('reader-browser-results.json'), parity = read('reader-parity-tests.json'), adjacent = read('reader-adjacent-tests.json'), monitored = read('reader-adjacent-validation.json');
assert.equal(browser.status, 'passed'); assert.equal(browser.checks.length, 48); assert.deepEqual(browser.changedInputs, []);
assert.equal(parity.numPassedTests, 22); assert.equal(parity.numFailedTests, 0);
assert.equal(adjacent.numPassedTests, 149); assert.equal(adjacent.numFailedTests, 0); assert.deepEqual(monitored.changedInputs, []);
const files = ['text_utility_helpers_source.jsx', 'view_simplified_source.jsx', 'text_utility_helpers_module.js', 'view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'desktop/web-app/public/view_simplified_module.js', 'tests/report_reader_glossary_parity.test.js', 'tests/reader_exact_sentence_start.test.js', dir + 'reader-browser.cjs', dir + 'reader-adjacent-run.cjs'];
const candidateHashes = Object.fromEntries(files.map(file => [file, hash(file)]));
assert.equal(candidateHashes['text_utility_helpers_source.jsx'], '6e3295ec4a7c662347d57ed2b6996fdf676066b09c288a2e92c12a240ae925ee');
assert.equal(candidateHashes['view_simplified_source.jsx'], 'ef0f05dd0b6df7f14e1ac643d9914b8b995012c80a910baf9da035a3a4ed8c05');
assert.equal(candidateHashes['text_utility_helpers_module.js'], candidateHashes['desktop/web-app/public/text_utility_helpers_module.js']);
assert.equal(candidateHashes['view_simplified_module.js'], candidateHashes['desktop/web-app/public/view_simplified_module.js']);
for (const [file, digest] of Object.entries(browser.inputHashes)) assert.equal(hash(file), digest, 'Browser input changed: ' + file);
for (const [file, digest] of Object.entries(monitored.monitoredInputs)) assert.equal(hash(file), digest, 'Adjacent suite input changed: ' + file);
const adaptation = read('reader-label-contract-adaptation.json');
adaptation.afterTestHash = candidateHashes['tests/reader_exact_sentence_start.test.js']; adaptation.validation = 'All 149 adjacent tests passed after only three expected labels changed.';
fs.writeFileSync(dir + 'reader-label-contract-adaptation.json', JSON.stringify(adaptation, null, 2) + '\n');
const result = {
  at: new Date().toISOString(), status: 'passed', candidateHashes,
  fix: 'Open glossary help repositions on scroll/resize while its trigger has focus; hover-only help still dismisses on passage scroll. Escape keeps focus and does not reopen on later scroll.',
  tests: { mountedReader: { passed: 22, failed: 0, report: 'reader-parity-tests.json' }, generatedModuleChromium: { passed: 48, failed: 0, errors: browser.errors, report: 'reader-browser-results.json' }, adjacentReader: { passed: 149, failed: 0, files: 8, report: 'reader-adjacent-tests.json' } },
  negativeEvidence: { nativeFocusProbe: 'reader-browser-focus-probe.json', originalBrowserAttempt: 'reader-browser-before-focus.json', mountedPreFix: 'reader-focus-before-tests.json', initialAdjacentLabelMismatch: 'reader-adjacent-before-label-expectation-tests.json' },
  screenshotsInspected: ['reader-browser-reflow320-font16.png', 'reader-browser-reflow320-font32.png'],
  validationScope: 'Local generated reader/helper modules, real React/CSS and canonical host glossary adapter, using fixture props and mocked speech/lookup callbacks. Built-browser and adjacent loaded inputs were unchanged.',
  limits: ['Not a full app/student-session/cloud test.', 'Root font 16/32px at 320/640 CSSpx tested; actual browser zoom and manual screen reader testing were not performed.', 'No WCAG conformance or instructional-content-validity claim.', 'Shared host/cache-pin integration remains coordinator-owned and held.'],
  labelContractAdaptation: adaptation
};
fs.writeFileSync(dir + 'reader-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status:result.status,report:dir+'reader-verification.json',helperHash:candidateHashes['text_utility_helpers_source.jsx']}));
