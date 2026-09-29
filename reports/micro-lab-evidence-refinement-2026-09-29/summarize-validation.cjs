const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const folder = 'reports/micro-lab-evidence-refinement-2026-09-29';
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const run = args => cp.execFileSync(process.execPath, args, { encoding: 'utf8' });
const unit = read('unit-results.json');
const browser = read('browser-results.json');
if (!unit.success || unit.numFailedTests || unit.numPassedTests !== 184 || unit.numPendingTests) {
  throw new Error('The final focused unit run must pass all 184 tests.');
}
if (browser.stats.expected !== 12 || browser.stats.unexpected || browser.stats.flaky || browser.stats.skipped || browser.errors.length) {
  throw new Error('The Chromium run must pass all 12 scenarios without retries.');
}
const sourceFile = 'stem_lab/stem_tool_microbiology.js';
const mirrorFile = 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js';
const source = fs.readFileSync(sourceFile);
if (!source.equals(fs.readFileSync(mirrorFile))) throw new Error('Runtime mirrors differ.');
const auditText = run(['reports/micro-lab-workspace-evidence-2026-09-28/check-defaults.cjs']);
const audit = JSON.parse(auditText);
if (!audit.mirrored || audit.registries.some(item => item.missing.length || item.changedFallbacks.length)) {
  throw new Error('Translation audit failed.');
}
fs.writeFileSync(path.join(folder, 'translation-audit.json'), auditText);
for (const file of [sourceFile, mirrorFile, path.join(folder, 'commit-scope.cjs'), ...unit.testResults.map(item => item.name)]) {
  run(['--check', file]);
}
const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(file, 'utf8')).stem.microbiology);
if (JSON.stringify(registries[0]) !== JSON.stringify(registries[1])) throw new Error('Micro Lab translation namespaces differ.');
const summary = {
  date: '2026-09-29',
  sourceFile,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  unit: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    files: unit.testResults.length,
    report: 'unit-results.json',
    priorRuns: ['unit-initial-results.json', 'unit-mock-isolation-results.json'],
    note: 'Initial shared-worker runs exposed test-only URL mock isolation and descriptor comparison failures. The final consolidated run passes after both are corrected.'
  },
  browser: {
    passed: browser.stats.expected,
    failed: browser.stats.unexpected,
    skipped: browser.stats.skipped,
    flaky: browser.stats.flaky,
    project: 'chromium',
    report: 'browser-results.json',
    scope: 'Six new saved-work scenarios plus six existing workspace and notebook review scenarios, served from the local working tree.'
  },
  interface: { keys: audit.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
  visualReview: ['mystery-revision-comparison-desktop.png', 'growth-hour-six-phone.png', 'microscope-unchecked-working-view-phone.png', 'gram-home-revision-phone.png'],
  scope: 'Micro Lab source, desktop mirror, Micro Lab translation entries, focused tests, and validation artifacts.'
};
fs.writeFileSync(path.join(folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
