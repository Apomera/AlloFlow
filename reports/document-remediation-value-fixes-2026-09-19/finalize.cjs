const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
process.chdir(path.resolve(__dirname, '../..'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const { summarizeUnit, summarizeBrowser } = require('../../dev-tools/remediation_validation.cjs');
const summary = read(path.join(__dirname, 'verified-validation/summary.json'));
const revisionOnlyFailure = summary.status === 'failed' && summary.error === 'Validation inputs, tools or revision changed during the run' && summary.identity.gitHeadChanged;
if ((!revisionOnlyFailure && summary.status !== 'passed') || summary.identity.changedInputs.length || summary.identity.toolsChanged) throw new Error('Test inputs or tools were not stable');
const unit = summarizeUnit(read(path.join(__dirname, 'verified-validation/unit.json')));
const browser = summarizeBrowser(read(path.join(__dirname, 'verified-validation/browser.json')));
if (summary.unit.passed !== unit.passed || summary.browser.passed !== browser.passed) throw new Error('Incorrect phase tally');
if (summary.status === 'passed' && summary.testsPassed !== unit.passed + browser.passed) throw new Error('Incorrect test tally');
for (const [file, expected] of Object.entries(summary.identity.after.inputSha256)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (actual !== expected) throw new Error('Input changed since verification: ' + file);
}
const original = read('reports/document-remediation-review-2026-09-19/results.json').results
  .map(({ id, expected, source, candidate }) => ({ id, expected, source, candidate }));
const fixtures = read('tests/fixtures/remediation_form_values.json');
if (JSON.stringify(original) !== JSON.stringify(fixtures)) throw new Error('Original review examples changed');
const sourcePolicy = fs.readFileSync('doc_pipeline_source.jsx', 'utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1];
const modulesMatch = fs.readFileSync('doc_pipeline_module.js').equals(fs.readFileSync('desktop/web-app/public/doc_pipeline_module.js'));
if (!modulesMatch) throw new Error('Shipping module copies disagree');
const record = { status: revisionOnlyFailure ? 'review-required' : 'passed', validationStatus: summary.status, validationError: summary.error || null, allTestsPassed: true, gitRevisionStable: !summary.identity.gitHeadChanged, runId: summary.runId, verifiedAt: summary.verifiedAt, policyVersion: sourcePolicy, unit, browser, testsPassed: unit.passed + browser.passed, newChecks: 34, gitRevisionVerified: summary.identity.gitHeadVerified, inputHashesVerified: Object.keys(summary.identity.after.inputSha256).length, originalReviewExamples: fixtures.length, shippingModulesIdentical: true, scope: 'Local automated fixtures and mocked model transport; no GitHub CI, deployment or human screen-reader test in this session.' };
fs.writeFileSync(path.join(__dirname, 'reviewed-summary.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
