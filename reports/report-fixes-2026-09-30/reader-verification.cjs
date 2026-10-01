'use strict';
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const dir = 'reports/report-fixes-2026-09-30/';
const read = name => JSON.parse(fs.readFileSync(dir + name, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const browser = read('reader-browser-results.json'), compactBrowser = read('compact-audio-browser-results.json'), mounted = read('compact-audio-mounted-candidate-validation.json'), adjacent = read('reader-adjacent-tests.json'), monitored = read('reader-adjacent-validation.json');
assert.equal(browser.status, 'passed'); assert.equal(browser.checks.length, 48); assert.deepEqual(browser.changedInputs, []);
assert.equal(compactBrowser.status, 'passed'); assert.ok(compactBrowser.checks.length >= 20); assert.deepEqual(compactBrowser.changedInputs, []); assert.deepEqual(compactBrowser.errors, []);
assert.equal(mounted.status, 'passed'); assert.equal(mounted.counts.passed, 38); assert.equal(mounted.counts.failed, 0); assert.equal(mounted.counts.skipped, 0); assert.deepEqual(mounted.changedInputs, []);
assert.equal(mounted.suites.find(suite => suite.file === 'tests/report_compact_audio_ui.test.js').passed, 16);
assert.equal(mounted.suites.find(suite => suite.file === 'tests/report_reader_glossary_parity.test.js').passed, 22);
assert.equal(adjacent.numPassedTests, 149); assert.equal(adjacent.numFailedTests, 0); assert.deepEqual(monitored.changedInputs, []);
const files = ['text_utility_helpers_source.jsx', 'view_simplified_source.jsx', 'text_utility_helpers_module.js', 'view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'desktop/web-app/public/view_simplified_module.js', 'tests/report_compact_audio_ui.test.js', 'tests/report_reader_glossary_parity.test.js', 'tests/reader_exact_sentence_start.test.js', dir + 'reader-browser.cjs', dir + 'reader-adjacent-run.cjs', dir + 'compact-audio-browser.cjs', dir + 'compact-audio-mounted-run.cjs'];
const candidateHashes = Object.fromEntries(files.map(file => [file, hash(file)]));
assert.equal(candidateHashes['text_utility_helpers_source.jsx'], '6e3295ec4a7c662347d57ed2b6996fdf676066b09c288a2e92c12a240ae925ee');
assert.equal(candidateHashes['view_simplified_source.jsx'], '9237d2815e76a2e881e616fcf187904c7885e758d02114798b6985fed3aa024b');
assert.equal(candidateHashes['text_utility_helpers_module.js'], candidateHashes['desktop/web-app/public/text_utility_helpers_module.js']);
assert.equal(candidateHashes['view_simplified_module.js'], candidateHashes['desktop/web-app/public/view_simplified_module.js']);
for (const [file, digest] of Object.entries(browser.inputHashes)) assert.equal(hash(file), digest, 'Browser input changed: ' + file);
for (const [file, digest] of Object.entries(compactBrowser.inputHashes)) assert.equal(hash(file), digest, 'Compact browser input changed: ' + file);
for (const [file, digest] of Object.entries(mounted.inputHashes)) assert.equal(hash(file), digest, 'Mounted candidate input changed: ' + file);
for (const [file, digest] of Object.entries(monitored.monitoredInputs)) assert.equal(hash(file), digest, 'Adjacent suite input changed: ' + file);
const adaptation = read('reader-label-contract-adaptation.json');
assert.equal(adaptation.afterTestHash, candidateHashes['tests/reader_exact_sentence_start.test.js']);
const result = {
  at: new Date().toISOString(), status: 'passed', candidateHashes,
  fix: 'Compact teacher audio status separates voice-model preparation, synthesis attempts, ready session clips, playback and verified device saves. Expandable details support keyboard/Escape/focus restoration. Audio actions keep the parent Review disclosure open so a status change cannot hide Stop. Duplicate, failed and interrupted actions retain partial clips. Original/adapted/BOTH glossary parity and exact annotations remain covered.',
  tests: { compactMountedReader: { passed: 16, failed: 0, report: 'compact-audio-mounted-candidate-tests.json' }, mountedReader: { passed: 22, failed: 0, report: 'compact-audio-mounted-candidate-tests.json' }, compactGeneratedChromium: { passed: compactBrowser.checks.length, failed: 0, errors: compactBrowser.errors, report: 'compact-audio-browser-results.json', axe: compactBrowser.axe }, generatedModuleChromium: { passed: 48, failed: 0, errors: browser.errors, report: 'reader-browser-results.json' }, adjacentReader: { passed: 149, failed: 0, files: 8, report: 'reader-adjacent-tests.json' } },
  negativeEvidence: { nativeFocusProbe: 'reader-browser-focus-probe.json', originalBrowserAttempt: 'reader-browser-before-focus.json', mountedPreFix: 'reader-focus-before-tests.json', initialAdjacentLabelMismatch: 'reader-adjacent-before-label-expectation-tests.json', compactEscapeBehaviorPreFix: 'compact-audio-keyboard-before-behavior-tests.json', compactTimeoutBeforeBehavior: 'compact-audio-keyboard-before-tests.json', compactReviewDisclosureBrowserPreFix: 'compact-audio-browser-before-review-disclosure.json', compactReviewDisclosureMountedPreFix: 'compact-audio-review-disclosure-before-tests.json', compactHarnessUnboundedAttempt: 'compact-audio-unbounded-attempt.json', compactHarnessDeadlineBeforeFixtureFix: 'before-promise-fixture-compact-audio-browser-results.json' },
  negativeEvidenceNotes: 'The native Review disclosure failure and mounted red assertion reproduce a product defect and were fixed in source. The later unbounded/incomplete attempt and bounded deadline failure were caused by the fixture returning an unresolved mock-save promise to page.evaluate before Save activation; they are harness failures, not additional product-failure evidence. The final browser retains explicit action/wait/navigation bounds and an overall deadline.',
  screenshotsProduced: ['reader-browser-reflow320-font16.png', 'reader-browser-reflow320-font32.png', 'compact-audio-default320.png', 'compact-audio-save-failure320.png', 'compact-audio-font32-320.png'],
  screenshotsInspected: ['reader-browser-reflow320-font16.png', 'reader-browser-reflow320-font32.png', 'compact-audio-default320.png', 'compact-audio-save-failure320.png', 'compact-audio-font32-320.png'],
  validationScope: 'Local generated reader/helper modules, real React/CSS and canonical host glossary adapter, using fixture props and mocked speech/lookup/audio/storage callbacks. All source, generated, browser and adjacent inputs were explicitly hashed and unchanged across the candidate runs.',
  limits: ['Not a full app/student-session/cloud test.', 'Root font 16/32px at 320/640 CSSpx tested; actual browser zoom and manual screen reader testing were not performed.', 'No WCAG conformance or instructional-content-validity claim.', 'Shared host/cache-pin integration remains coordinator-owned and held.'],
  labelContractAdaptation: adaptation
};
fs.writeFileSync(dir + 'reader-verification.json', JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync(dir + 'compact-audio-final-validation.json', JSON.stringify({ ...result, exitCode: 0, inputHashes: { ...mounted.inputHashes, ...compactBrowser.inputHashes, ...browser.inputHashes, ...monitored.monitoredInputs, ...candidateHashes }, frozenBuild: mounted.frozenBuild, mountedInputs: mounted.inputHashes, compactBrowserInputs: compactBrowser.inputHashes, readerBrowserInputs: browser.inputHashes, adjacentInputs: monitored.monitoredInputs }, null, 2) + '\n');
console.log(JSON.stringify({status:result.status,report:dir+'reader-verification.json',helperHash:candidateHashes['text_utility_helpers_source.jsx']}));
