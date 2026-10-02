const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const acorn = require('acorn');
const folder = 'reports/micro-lab-measurement-conversion-2026-10-01';
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const run = args => cp.execFileSync(process.execPath, args, { encoding: 'utf8' });
const expectedUnit = Number(process.argv[2]);
const expectedBrowser = Number(process.argv[3]);
if (expectedUnit !== 794 || expectedBrowser !== 56) throw new Error('This report requires exactly 794 unit checks and 56 browser scenarios.');
const unit = read('unit-results.json');
const browser = read('browser-results.json');
if (!unit.success || unit.numFailedTests || unit.numPassedTests !== expectedUnit || unit.numPendingTests || unit.testResults.length !== 24) {
  throw new Error('The final focused unit run must pass every expected test.');
}
if (browser.stats.expected !== expectedBrowser || browser.stats.unexpected || browser.stats.flaky || browser.stats.skipped || browser.errors.length) {
  throw new Error('The Chromium run must pass every expected scenario without retries.');
}
const sourceFile = 'stem_lab/stem_tool_microbiology.js';
const mirrorFile = 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js';
const source = fs.readFileSync(sourceFile);
if (!source.equals(fs.readFileSync(mirrorFile))) throw new Error('Runtime mirrors differ.');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const runners = ['unit', 'browser'].map(kind => {
  const status = read(kind + '-run-status.json');
  const expected = kind === 'unit' ? expectedUnit : expectedBrowser;
  if (status.kind !== kind || status.phase !== 'passed' || status.exitCode !== 0 || status.signal !== null ||
      status.sourceStillMatches !== true || status.sourceSha256 !== sourceSha256 || status.expected !== expected || !status.finished) {
    throw new Error('The ' + kind + ' runner did not finish successfully against the current runtime.');
  }
  return status;
});
const testInputs = {};
for (const runner of runners) {
  if (runner.testInputsStillMatch !== true || runner.syntaxChecksPassed !== true) throw new Error('Runner input or syntax verification failed.');
  const inputs = Object.entries(runner.testInputs || {});
  if (inputs.length !== (runner.kind === 'unit' ? 24 : 9)) throw new Error('Incomplete runner inputs.');
  for (const [file, sha] of inputs) {
    if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== sha) throw new Error('A validated test changed: ' + file);
    testInputs[file] = sha;
  }
}
if (Object.keys(testInputs).length !== 33) throw new Error('Expected all 33 validated test inputs.');
const auditText = run(['reports/micro-lab-measurement-conversion-2026-10-01/check-defaults.cjs']);
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
  date: '2026-10-01',
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
    passed: browser.stats.expected,
    failed: browser.stats.unexpected,
    skipped: browser.stats.skipped,
    flaky: browser.stats.flaky,
    project: 'chromium',
    report: 'browser-results.json',
    priorRuns: fs.readdirSync(folder).filter(name => /^browser-(initial|recovery|layout|focused).*results\.json$/.test(name)),
    scope: 'Microscope working-estimate conversion, exact decimal equivalence, raw-state preservation, stale draft and viewing-setting guards, keyboard and narrow layouts, and retained annotations, selected/full portfolios, Growth citations, design, evidence, recovery and navigation workflows.'
  },
  interface: { keys: audit.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
  visualReview: ['conversion-desktop.png', 'conversion-phone.png', 'conversion-zoom.png'],
  scope: 'Micro Lab source, desktop mirror, Micro Lab translation entries, focused tests, and validation artifacts.'
};
fs.writeFileSync(path.join(folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
