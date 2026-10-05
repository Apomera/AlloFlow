const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const acorn = require('acorn');
const folder = 'reports/micro-lab-home-integrity-2026-10-02';
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const run = args => cp.execFileSync(process.execPath, args, { encoding: 'utf8' });
const expectedUnit = Number(process.argv[2]);
const expectedBrowser = Number(process.argv[3]);
if (expectedUnit !== 941 || expectedBrowser !== 70) throw new Error('This report requires exactly 941 unit checks and 70 browser scenarios.');
const unit = read('unit-results.json');
const browser = read('browser-results.json');
const browserEvidence = require('./verify-browser.cjs')();
if (!unit.success || unit.numFailedTests || unit.numPassedTests !== expectedUnit || unit.numPendingTests || unit.testResults.length !== 26) {
  throw new Error('The final focused unit run must pass every expected test.');
}
if (browserEvidence.passed !== expectedBrowser) throw new Error('Every distinct Chromium scenario must be verified.');
const sourceFile = 'stem_lab/stem_tool_microbiology.js';
const mirrorFile = 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js';
const source = fs.readFileSync(sourceFile);
if (!source.equals(fs.readFileSync(mirrorFile))) throw new Error('Runtime mirrors differ.');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const unitRunner = read('unit-run-status.json');
if (unitRunner.kind !== 'unit' || unitRunner.phase !== 'passed' || unitRunner.exitCode !== 0 || unitRunner.signal !== null ||
    unitRunner.sourceStillMatches !== true || unitRunner.sourceSha256 !== sourceSha256 || unitRunner.expected !== expectedUnit || !unitRunner.finished) {
  throw new Error('The unit runner did not finish successfully against the current runtime.');
}
// Keep original browser phases and exit codes; the evidence proof verifies recovery separately.
const runners = [unitRunner, ...browserEvidence.runners];
const testInputs = {};
for (const runner of runners) {
  if (runner.testInputsStillMatch !== true || runner.syntaxChecksPassed !== true) throw new Error('Runner input or syntax verification failed.');
  const inputs = Object.entries(runner.testInputs || {});
  if (inputs.length !== (runner.kind === 'unit' ? 26 : runner.kind === 'browser' ? 11 : 1)) throw new Error('Incomplete runner inputs.');
  for (const [file, sha] of inputs) {
    if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== sha) throw new Error('A validated test changed: ' + file);
    testInputs[file] = sha;
  }
}
if (Object.keys(testInputs).length !== 37) throw new Error('Expected all 37 validated test inputs.');
const auditText = run(['reports/micro-lab-home-integrity-2026-10-02/check-defaults.cjs']);
const audit = JSON.parse(auditText);
if (!audit.mirrored || audit.registries.some(item => item.missing.length || item.changedFallbacks.length)) {
  throw new Error('Translation audit failed.');
}
fs.writeFileSync(path.join(folder, 'translation-audit.json'), auditText);
for (const file of [sourceFile, mirrorFile, path.join(folder, 'summarize-validation.cjs'), path.join(folder, 'check-defaults.cjs'), ...unit.testResults.map(item => item.name)]) {
  acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: file.endsWith('.test.js') ? 'module' : 'script' });
}
const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(file => JSON.parse(fs.readFileSync(file, 'utf8')).stem.microbiology);
if (JSON.stringify(registries[0]) !== JSON.stringify(registries[1])) throw new Error('Micro Lab translation namespaces differ.');
const summary = {
  date: '2026-10-03',
  sourceFile,
  sourceSha256,
  runners,
  testInputs,
  unit: {
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    files: unit.testResults.length,
    report: 'unit-results.json',
    priorRuns: fs.readdirSync(folder).filter(name => /^unit-(initial|recovery|outcomes-initial|full-initial|focused).*results\.json$/.test(name)),
    note: 'The final consolidated focused regression run passes. Earlier attempt reports, if any, are retained.'
  },
  browser: {
    passed: browserEvidence.passed,
    failed: 0,
    skipped: browser.stats.skipped,
    flaky: browser.stats.flaky,
    project: 'chromium',
    report: 'browser-results.json',
    recheckReport: browserEvidence.rechecked ? 'browser-recheck-results.json' : null,
    initialFailures: browserEvidence.initialFailures,
    rechecked: browserEvidence.rechecked,
    verificationMode: browserEvidence.verificationMode,
    evidence: browserEvidence,
    priorRuns: fs.readdirSync(folder).filter(name => /^browser-(initial|recovery|layout|focused|recheck).*results\.json$/.test(name)),
    scope: 'Home contextual resume ownership, latest-state guards, raw notes and imported metadata, selective identifier repair, JSON reload, keyboard and narrow layouts, and retained Mystery, microscope, annotations, portfolios, Growth citations, evidence and navigation workflows.'
  },
  interface: { keys: audit.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
  visualReview: ['home-integrity-desktop.png', 'home-integrity-phone.png', 'home-integrity-zoom.png'],
  scope: 'Micro Lab source, desktop mirror, focused tests, and validation artifacts.'
};
fs.writeFileSync(path.join(folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
