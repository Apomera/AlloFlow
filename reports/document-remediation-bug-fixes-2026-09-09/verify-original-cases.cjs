'use strict';
// Replay the saved review cases against the current implementation without
// modifying the original evidence or sending any document to a model service.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const review = path.join(root, 'reports/document-remediation-bug-review-2026-09-09');
process.chdir(root);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const evidence = ['live-source-probes.json', 'export-review-probes.json', 'rendered-probe-results.json'];
const evidenceHashes = Object.fromEntries(evidence.map(file => [file, hash(fs.readFileSync(path.join(review, file)))]));
const read = file => JSON.parse(fs.readFileSync(path.join(review, file), 'utf8'));
const implementationFiles = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'dev-tools/document_export_at_acceptance.cjs', 'dev-tools/rendered_document_fidelity.cjs'];
const implementationHashes = Object.fromEntries(implementationFiles.map(file => [file, hash(fs.readFileSync(file))]));
async function main() {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('');
  global.DOMParser = dom.window.DOMParser;
  global.NodeFilter = dom.window.NodeFilter;
  const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
  const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
  const live = [];
  for (const fixture of read(evidence[0]).results) {
    const harness = make(() => fixture.candidate);
    const decision = harness.acceptFixedHtmlDetailed(fixture.candidate, fixture.source, { strictContent: true, mode: 'faithful' });
    const output = await harness.run(fixture.source);
    const wantedAcceptance = fixture.expected === 'accept';
    live.push({ id: fixture.id, expected: fixture.expected, decision,
      pipelineReturnedCandidate: output === fixture.candidate, pipelineReturnedSource: output === fixture.source,
      rejectionEvidence: harness.evidence,
      passed: decision.accepted === wantedAcceptance && output === (wantedAcceptance ? fixture.candidate : fixture.source) });
  }
  dom.window.close();
  const { inspectHtml } = require(path.join(root, 'dev-tools/document_export_at_acceptance.cjs'));
  const { compareFiles } = require(path.join(root, 'dev-tools/rendered_document_fidelity.cjs'));
  const browser = await require('playwright').chromium.launch({ headless: true });
  const exports = [], rendered = [];
  try {
    for (const fixture of read(evidence[1]).reports) {
      const report = await inspectHtml(browser, 'synthetic.html', fixture.expected, Buffer.from(fixture.html));
      const allChecksPassed = report.checks.every(check => check.status === 'passed');
      const wantsPass = ['valid-table-control', 'canonical-table-false-rejection', 'inert-xml-data-block'].includes(fixture.id);
      const tableExposureFailure = ['presentational-table', 'aria-hidden-table'].includes(fixture.id);
      const passed = wantsPass ? allChecksPassed && report.coverage.complete
        : tableExposureFailure ? report.checks.some(check => /^html\.table-/.test(check.id) && check.status === 'failed')
          : !report.coverage.complete && !allChecksPassed;
      exports.push({ id: fixture.id, expected: wantsPass ? 'passed' : tableExposureFailure ? 'failed-table' : 'incomplete-dependency-coverage', passed, report });
    }
    for (const fixture of read(evidence[2]).results) {
      const original = fixture.report;
      const checkpoints = original.checks.map(check => ({ id: check.id, sourceSelector: check.sourceSelector, candidateSelector: check.candidateSelector,
        properties: check.properties ? check.properties.map(p => p.property) : ['role', 'exposed'] }));
      const report = await compareFiles(browser, original.source.path, original.candidate.path, { checkpoints });
      const expected = fixture.id === 'unrequested-large-text' ? 'passed' : 'review-required';
      rendered.push({ id: fixture.id, expected, passed: report.status === expected && report.coverage.complete, report });
    }
  } finally { await browser.close(); }
  const originalEvidenceUnchanged = evidence.every(file => hash(fs.readFileSync(path.join(review, file))) === evidenceHashes[file]);
  const implementationUnchangedDuringRun = implementationFiles.every(file => hash(fs.readFileSync(file)) === implementationHashes[file]);
  const results = [...live, ...exports, ...rendered];
  const report = { measuredAt: new Date().toISOString(), kind: 'original-review-case-closure',
    policyVersion: fs.readFileSync('doc_pipeline_source.jsx', 'utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
    passed: results.every(result => result.passed) && originalEvidenceUnchanged && implementationUnchangedDuringRun,
    originalEvidenceUnchanged, implementationUnchangedDuringRun, implementationHashes, evidenceHashes,
    caseCount: results.length, passingCases: results.filter(result => result.passed).length,
    browserVersion: browser.version(), live, exports, rendered,
    scope: 'Synthetic local candidate-gate and Chromium checker reproductions; model transport is mocked. No live-model, human screen-reader, or downstream delivery acceptance claim.' };
  fs.writeFileSync(path.join(__dirname, 'original-cases-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, caseCount: report.caseCount, passingCases: report.passingCases,
    failedCases: results.filter(result => !result.passed).map(result => result.id), originalEvidenceUnchanged, implementationUnchangedDuringRun }, null, 2));
  if (!report.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
