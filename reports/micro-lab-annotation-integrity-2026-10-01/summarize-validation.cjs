const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const folder = 'reports/micro-lab-annotation-integrity-2026-10-01';
const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const run = args => cp.execFileSync(process.execPath, args, { encoding: 'utf8' });
const expectedUnit = Number(process.argv[2]);
const expectedBrowser = Number(process.argv[3]);
if (expectedUnit !== 723 || expectedBrowser !== 49) throw new Error('This report requires exactly 723 unit checks and 49 browser scenarios.');
const unit = read('unit-results.json');
const browser = read('browser-results.json');
if (!unit.success || unit.numFailedTests || unit.numPassedTests !== expectedUnit || unit.numPendingTests || unit.testResults.length !== 22) {
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
const browserFiles = ['annotation-integrity', 'portfolio-selection', 'growth-citations', 'portfolio', 'experiment-design',
  'guided-resume', 'evidence-review', 'evidence-recovery'].map(name => 'tests/e2e/microbiology-' + name + '.spec.ts');
const testInputs = {};
for (const runner of runners) {
  const files = runner.kind === 'unit' ? unit.testResults.map(item => item.name) : browserFiles;
  const started = Date.parse(runner.started);
  if (!Number.isFinite(started)) throw new Error('Invalid runner start time.');
  for (const file of files) {
    if (fs.statSync(file).mtimeMs > started) throw new Error('Test file changed after validation started: ' + file);
    const relative = path.relative(process.cwd(), path.resolve(file)).replace(/\\/g, '/');
    testInputs[relative] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
}
const auditText = run(['reports/micro-lab-annotation-integrity-2026-10-01/check-defaults.cjs']);
const audit = JSON.parse(auditText);
if (!audit.mirrored || audit.registries.some(item => item.missing.length || item.changedFallbacks.length)) {
  throw new Error('Translation audit failed.');
}
fs.writeFileSync(path.join(folder, 'translation-audit.json'), auditText);
for (const file of [sourceFile, mirrorFile, path.join(folder, 'summarize-validation.cjs'), path.join(folder, 'check-defaults.cjs'), ...unit.testResults.map(item => item.name)]) {
  run(['--check', file]);
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
    priorRuns: fs.readdirSync(folder).filter(name => /^unit-(initial|recovery|outcomes-initial|full-initial).*results\.json$/.test(name)),
    note: 'The final consolidated focused regression run passes. Earlier attempt reports, if any, are retained.'
  },
  browser: {
    passed: browser.stats.expected,
    failed: browser.stats.unexpected,
    skipped: browser.stats.skipped,
    flaky: browser.stats.flaky,
    project: 'chromium',
    report: 'browser-results.json',
    priorRuns: fs.readdirSync(folder).filter(name => /^browser-(initial|recovery|layout).*results\.json$/.test(name)),
    scope: 'Raw-preserving Growth explanations, Resistance reflections and saved-record navigation, retained original-ID ownership and stale-write guards, actual observed Resistance outcomes without a saved prediction, keyboard and narrow layouts, and retained selected/full portfolios, Growth citations, design, evidence, recovery and navigation workflows, served from the local working tree.'
  },
  interface: { keys: audit.keys, missing: 0, changedFallbacks: 0, runtimeMirrored: true, microbiologyNamespacesMatch: true, syntaxChecksPassed: true },
  visualReview: ['annotation-growth-desktop.png', 'annotation-resistance-phone.png', 'annotation-zoom.png'],
  scope: 'Micro Lab source, desktop mirror, Micro Lab translation entries, focused tests, and validation artifacts.'
};
fs.writeFileSync(path.join(folder, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
