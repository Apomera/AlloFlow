'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
process.chdir(path.resolve(__dirname, '../..'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const { summarizeUnit, summarizeBrowser } = require('../../dev-tools/remediation_validation.cjs');
const summary = read(path.join(__dirname, 'validation/summary.json'));
const revisionOnlyFailure = summary.status === 'failed' && summary.error === 'Validation inputs, tools or revision changed during the run' && summary.identity.gitHeadChanged;
if ((!revisionOnlyFailure && summary.status !== 'passed') || summary.identity.changedInputs.length || summary.identity.toolsChanged) throw new Error('Complete tests or stable declared inputs unavailable: ' + summary.error);
const unit = summarizeUnit(read(path.join(__dirname, 'validation/unit.json')));
const browser = summarizeBrowser(read(path.join(__dirname, 'validation/browser.json')));
if (summary.status === 'passed' && summary.testsPassed !== unit.passed + browser.passed) throw new Error('Incorrect test tally');
for (const kind of ['unit', 'browser']) {
 const phase = summary.phases[kind];
 if (phase.status !== 'passed' || phase.process.exitCode !== 0 || phase.process.signal || phase.diagnostics.missingSuites.length || !fs.existsSync(phase.logFile)) throw new Error('Incomplete phase evidence: ' + kind);
}
for (const [file, expected] of Object.entries(summary.identity.after.inputSha256)) {
 const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if (hash !== expected) throw new Error('Input changed after validation: ' + file);
}
const original = read('reports/document-remediation-opportunities-2026-09-19/form-gaps/results.json').results;
const fixtures = read('tests/fixtures/remediation_submission_state.json');
for (const entry of original) {
 const fixture = fixtures.find(item => item.id === entry.id);
 if (!fixture || fixture.source !== entry.source || fixture.candidate !== entry.candidate) throw new Error('Original example changed: ' + entry.id);
}
const modulesMatch = fs.readFileSync('doc_pipeline_module.js').equals(fs.readFileSync('desktop/web-app/public/doc_pipeline_module.js'));
if (!modulesMatch) throw new Error('Shipping modules differ');
const result = { status: revisionOnlyFailure ? 'review-required' : 'passed', validationStatus: summary.status, validationError: summary.error || null, gitHeadStable: !summary.identity.gitHeadChanged, runId: summary.runId, verifiedAt: summary.verifiedAt, policyVersion: '20260920-1', unit, browser, testsPassed: unit.passed + browser.passed, newChecks: fixtures.length * 2 + 7 + 9, migratedBrowserChecks: 3, inputHashesVerified: Object.keys(summary.identity.after.inputSha256).length, gitHeadVerified: summary.identity.gitHeadVerified, originalFormExamples: original.length, shippingModulesIdentical: modulesMatch, scope: 'Local automated fixtures, native Chromium and mocked model transport. No deployment, GitHub CI, live-model or human screen-reader acceptance.' };
fs.writeFileSync(path.join(__dirname, 'reviewed-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
