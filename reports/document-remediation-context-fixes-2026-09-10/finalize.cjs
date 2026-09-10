const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../');
process.chdir(root);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const { summarizeUnit, summarizeBrowser } = require('../../dev-tools/remediation_validation.cjs');
const hashes = read(path.join(__dirname, 'implementation-hashes.json'));
for (const [file, expected] of Object.entries(hashes)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (expected !== actual) throw new Error('Implementation changed during validation: ' + file);
}
const unit = summarizeUnit(read(path.join(__dirname, 'final-validation/unit.json')));
const browser = summarizeBrowser(read(path.join(__dirname, 'final-validation/browser.json')));
const summary = read(path.join(__dirname, 'final-validation/summary.json'));
if (summary.status !== 'passed' || summary.testsPassed !== unit.passed + browser.passed) throw new Error('Incomplete final validation');
const fixtures = read('tests/fixtures/remediation_form_context.json');
const originals = ['forms', 'unicode'].flatMap(kind => read('reports/document-remediation-next-review-2026-09-10/' + kind + '/results.json').results)
  .map(({ id, expected, source, candidate }) => ({ id, expected, source, candidate }));
if (JSON.stringify(fixtures) !== JSON.stringify(originals)) throw new Error('Saved review fixtures drifted');
const record = {
  ...summary,
  policyVersion: fs.readFileSync('doc_pipeline_source.jsx', 'utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
  implementationUnchangedDuringFinalValidation: true,
  shippingModulesIdentical: hashes['doc_pipeline_module.js'] === hashes['desktop/web-app/public/doc_pipeline_module.js'],
  originalReviewFixturesPreserved: fixtures.length,
  addedChecks: 55,
  priorChecksRetained: 521,
  scope: 'Local synthetic fixtures, actual source and generated modules, scripted model transport, Chromium. CI workflow configured but not executed on GitHub; no deployment or human screen-reader acceptance.',
};
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
