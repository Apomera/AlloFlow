'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const rendered = read('final-browser-tests.json'), units = read('unit-tests.json'), exportResults = read('export-binding-tests.json'), retry = read('export-cli-retry.json');
const calibration = read('calibration/calibration-report.json'), review = read('review-smoke.json');
assert.deepEqual([rendered.stats.expected, rendered.stats.unexpected, rendered.stats.skipped], [42, 0, 0]);
assert.equal(units.numPassedTests, 11); assert.equal(units.numFailedTests, 0); assert.equal(units.testResults.length, 2);
assert.equal(exportResults.stats.expected, 13); assert.equal(exportResults.stats.unexpected, 1); assert.equal(exportResults.stats.skipped, 0); assert.equal(retry.stats.expected, 1); assert.equal(retry.stats.unexpected, 0); assert.equal(retry.stats.skipped, 0);
assert.equal(calibration.matched, 29); assert.equal(calibration.total, 29); assert.equal(calibration.evidence.complete, true);
assert.equal(review.status, 'review-required'); assert.equal(review.checks.length, 2);
const root = path.resolve(__dirname, '../..');
const files = ['dev-tools/rendered_document_fidelity.cjs', 'dev-tools/calibrate_rendered_fidelity.cjs', 'dev-tools/rendered_fidelity_review.cjs', 'dev-tools/document_export_at_acceptance.cjs', 'tests/fixtures/rendered_fidelity/cases.cjs', 'tests/fixtures/rendered_fidelity/extended_cases.cjs'];
const summary = { measuredAt: new Date().toISOString(), changes: ['desktop/mobile/print rendering profiles', 'NFC text preservation', 'animation and unresolved media coverage', 'self-contained HTML review', 'artifact and source byte stability', 'calibration input stability'],
  tests: { rendered: rendered.stats, exportInitial: exportResults.stats, exportRetry: retry.stats, unit: { passed: units.numPassedTests, files: units.testResults.length }, distinctPassed: 67 },
  calibration: { total: calibration.total, matched: calibration.matched, metrics: calibration.metrics, evidence: calibration.evidence }, review,
  files: files.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') })),
  humanValidation: 'not-run', deployment: 'not-run', liveModelCalls: 0 };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'README.md'), `# Rendered fidelity refinements — September 9, 2026

The optional post-export checker now compares desktop, mobile-width, and print profiles using the same source-authored checkpoints. It preserves superscript text, reports delayed/active animations and unresolved media as incomplete, and retains source selectors even when inspection is unavailable. Mixed failed and unavailable properties no longer imply complete coverage.

The standalone and export-acceptance CLIs emit escaped, self-contained HTML review reports. Each profile retains the exact original file hashes. Export acceptance inspects captured HTML/PDF bytes and rechecks both artifacts and optional sources after all inspections, invalidating changed or missing files. Calibration records the loaded input identities and actual case payload, then marks changed inputs incomplete.

## Validation

- 42 rendered browser tests passed, including all 28 existing tests and 14 new profile/evidence tests.
- 14 export tests passed across the initial run and isolated retry: 10 new byte-binding/CLI tests and four existing HTML/PDF export regressions.
- 11 unit tests passed: seven renderer tests and four calibration-evidence tests.
- 29/29 authored synthetic calibration cases matched: eight valid repairs, eighteen harmful changes, and three intentionally unavailable cases. No false acceptances, false rejections, or unexpected unavailable outcomes occurred in this corpus.
- The standalone CLI correctly returned review-required for a mobile-only loss while desktop and print passed. Its review page was checked at 1100px and 390px without whole-page horizontal overflow; screenshot evidence is included.

The initial 39-test browser run had 20 passes, one timeout, and 18 serial-group skips. The final 42-test run passed without skips. The initial export run had one CLI subprocess timeout; that isolated case passed with a longer test timeout. These initial results are preserved.

## Evidence

- [Validation summary](validation-summary.json)
- [Final rendered tests](final-browser-tests.json)
- [Export tests](export-binding-tests.json) and [isolated CLI retry](export-cli-retry.json)
- [Unit tests](unit-tests.json)
- [Calibration results](calibration/calibration-report.json) and [all-case HTML review](calibration/review.html)
- [Mobile-loss example report](standalone-review/review.html) and [CLI/layout observations](review-smoke.json)
- [Desktop screenshot](review-desktop.png), [phone screenshot](review-mobile.png), and [profile comparison screenshot](review-mobile-profile.png)

This work changes developer acceptance tools, not the live remediation candidate gate or production delivery policy. The corpus is synthetic; it does not measure production error rates, model quality, OCR accuracy, PDF pagination, or screen-reader usability. Human validation remains not-run, and no deployment or live model call was performed.
`);
console.log(JSON.stringify({ distinctTestsPassed: summary.tests.distinctPassed, calibrationMatched: calibration.matched, humanValidation: summary.humanValidation }));
