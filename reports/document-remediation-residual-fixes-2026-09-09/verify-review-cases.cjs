'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
process.chdir(root);
const oldReview = 'reports/document-remediation-bug-review-2026-09-09/';
const review = 'reports/document-remediation-residual-review-2026-09-09/';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const evidencePaths = [oldReview + 'live-source-probes.json', oldReview + 'export-review-probes.json', oldReview + 'rendered-probe-results.json', review + 'live/results.json', review + 'export/results.json', review + 'rendered-results.json'];
const evidenceHashes = Object.fromEntries(evidencePaths.map(file => [file, hash(file)]));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const implementationFiles = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'dev-tools/document_export_at_acceptance.cjs', 'dev-tools/rendered_document_fidelity.cjs', 'dev-tools/document_html_dependencies.cjs', 'dev-tools/calibrate_rendered_fidelity.cjs'];
const implementationHashes = Object.fromEntries(implementationFiles.map(file => [file, hash(file)]));
async function main() {
  const dom = new (require('jsdom').JSDOM)('');
  global.DOMParser = dom.window.DOMParser; global.NodeFilter = dom.window.NodeFilter;
  const text = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
  const make = new Function('fs', 'path', text.slice(text.indexOf('const SRC ='), text.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
  const live = [];
  for (const fixture of [...read(evidencePaths[0]).results, ...read(evidencePaths[3]).results]) {
    const harness = make(() => fixture.candidate);
    const decision = harness.acceptFixedHtmlDetailed(fixture.candidate, fixture.source, { strictContent: true, mode: 'faithful' });
    const output = await harness.run(fixture.source), accept = fixture.expected === 'accept';
    live.push({ id: fixture.id, expected: fixture.expected, decision, pipelineReturnedCandidate: output === fixture.candidate,
      pipelineReturnedSource: output === fixture.source, evidence: harness.evidence,
      passed: decision.accepted === accept && output === (accept ? fixture.candidate : fixture.source) });
  }
  dom.window.close();
  const { inspectHtml } = require(path.join(root, 'dev-tools/document_export_at_acceptance.cjs'));
  const { compareRenderedHtml, PROPERTIES } = require(path.join(root, 'dev-tools/rendered_document_fidelity.cjs'));
  const browser = await require('playwright').chromium.launch({ headless: true });
  const exports = [], rendered = [];
  try {
    const exportCases = read(evidencePaths[1]).reports.map(fixture => ({ ...fixture, desired: ['presentational-table', 'aria-hidden-table'].includes(fixture.id) ? 'failed' : fixture.id === 'relative-css-background' ? 'unavailable' : 'passed' }));
    exportCases.push(...read(evidencePaths[4]).results);
    for (const fixture of exportCases) {
      const report = await inspectHtml(browser, 'synthetic.html', fixture.expected, Buffer.from(fixture.html));
      const actual = report.checks.some(check => check.status === 'failed') ? 'failed' : !report.coverage.complete || report.checks.some(check => check.status === 'unavailable') ? 'unavailable' : 'passed';
      exports.push({ id: fixture.id, expected: fixture.desired, actual, passed: actual === fixture.desired, report });
    }
    const renderedCases = read(evidencePaths[2]).results.map(fixture => ({ ...fixture,
      source: fs.readFileSync(fixture.report.source.path, 'utf8'), candidate: fs.readFileSync(fixture.report.candidate.path, 'utf8'),
      expected: fixture.id === 'unrequested-large-text' ? 'passed' : 'review-required' }));
    renderedCases.push(...read(evidencePaths[5]).results);
    for (const fixture of renderedCases) {
      const checkpoints = fixture.report.checks.map(check => ({ id: check.id, sourceSelector: check.sourceSelector,
        candidateSelector: check.candidateSelector,
        properties: check.properties ? check.properties.map(property => property.property).filter(property => PROPERTIES.includes(property)) : ['role', 'exposed'] }));
      const report = await compareRenderedHtml(browser, fixture.source, fixture.candidate, { checkpoints });
      rendered.push({ id: fixture.id, expected: fixture.expected, actual: report.status,
        passed: report.status === fixture.expected && (fixture.expected === 'unavailable' || report.coverage.complete), report });
    }
  } finally { await browser.close(); }
  const results = [...live, ...exports, ...rendered];
  const originalEvidenceUnchanged = evidencePaths.every(file => hash(file) === evidenceHashes[file]);
  const implementationUnchangedDuringRun = implementationFiles.every(file => hash(file) === implementationHashes[file]);
  const result = { measuredAt: new Date().toISOString(), kind: 'review-case-closure',
    policyVersion: fs.readFileSync('doc_pipeline_source.jsx', 'utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
    passed: results.every(test => test.passed) && originalEvidenceUnchanged && implementationUnchangedDuringRun,
    originalEvidenceUnchanged, implementationUnchangedDuringRun, implementationHashes, evidenceHashes,
    caseCount: results.length, passingCases: results.filter(test => test.passed).length, browserVersion: browser.version(), live, exports, rendered,
    scope: 'Both saved review batches, using the actual source gate with mocked model transport and local Chromium checkers. No live-model or human accessibility acceptance claim.' };
  fs.writeFileSync(path.join(__dirname, 'review-cases-results.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed, caseCount: result.caseCount, passingCases: result.passingCases,
    failedCases: results.filter(test => !test.passed).map(test => test.id), originalEvidenceUnchanged, implementationUnchangedDuringRun }, null, 2));
  if (!result.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
