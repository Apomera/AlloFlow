const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const folder = 'reports/micro-lab-evidence-review-2026-09-30';
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const run = args => cp.execFileSync(process.execPath, args, { encoding: 'utf8' });
const expectedUnit = Number(process.argv[2]);
const expectedBrowser = Number(process.argv[3]);
if (!Number.isInteger(expectedUnit) || expectedUnit < 184 || !Number.isInteger(expectedBrowser) || expectedBrowser < 6) throw new Error('Supply expected unit and browser counts.');
const unit = read('unit-results.json');
const browser = read('browser-results.json');
if (!unit.success || unit.numFailedTests || unit.numPassedTests !== expectedUnit || unit.numPendingTests) {
  throw new Error('The final focused unit run must pass every expected test.');
}
if (browser.stats.expected !== expectedBrowser || browser.stats.unexpected || browser.stats.flaky || browser.stats.skipped || browser.errors.length) {
  throw new Error('The Chromium run must pass every expected scenario without retries.');
}
const sourceFile = 'stem_lab/stem_tool_microbiology.js';
const mirrorFile = 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js';
const source = fs.readFileSync(sourceFile);
if (!source.equals(fs.readFileSync(mirrorFile))) throw new Error('Runtime mirrors differ.');
const auditText = run(['reports/micro-lab-evidence-review-2026-09-30/check-defaults.cjs']);
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
  date: '2026-09-30',
  sourceFile,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  unit: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    files: unit.testResults.length,
    report: 'unit-results.json',
    priorRuns: fs.readdirSync(folder).filter(name => /^unit-(initial|recovery).*results\.json$/.test(name)),
    note: 'The final consolidated focused regression run passes. Earlier attempt reports, if any, are retained.'
  },
  browser: {
    passed: browser.stats.expected,
    failed: browser.stats.unexpected,
    skipped: browser.stats.skipped,
    flaky: browser.stats.flaky,
    project: 'chromium',
    report: 'browser-results.json',
    priorRuns: fs.readdirSync(folder).filter(name => /^browser-(initial|recovery).*results\.json$/.test(name)),
    scope: 'Microscope unscored draft review and previous-view replay, Growth sweep history and exports, local download feedback, and retained notebook and navigation regressions, served from the local working tree.'
  },
  interface: { keys: audit.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
  visualReview: ['microscope-draft-review-phone.png', 'microscope-previous-view-phone.png', 'growth-previous-sweep-phone.png', 'mystery-download-retry-phone.png'],
  scope: 'Micro Lab source, desktop mirror, Micro Lab translation entries, focused tests, and validation artifacts.'
};
fs.writeFileSync(path.join(folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
