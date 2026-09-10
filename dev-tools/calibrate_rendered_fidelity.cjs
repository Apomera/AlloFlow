#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const corpusPaths = ['cases.cjs', 'extended_cases.cjs'].map(name => path.resolve(__dirname, '../tests/fixtures/rendered_fidelity', name));
// Capture the identities when modules are loaded, before asynchronous inspection.
const inputPaths = [__filename, path.join(__dirname, 'rendered_document_fidelity.cjs'), path.join(__dirname, 'rendered_fidelity_review.cjs'), path.join(__dirname, 'document_html_dependencies.cjs'), ...corpusPaths];
const inputSnapshots = inputPaths.map(file => ({ path: file, sha256: digest(fs.readFileSync(file)) }));
const loadedCases = corpusPaths.flatMap(file => require(file));
const { compareFiles } = require('./rendered_document_fidelity.cjs');
const { renderReview } = require('./rendered_fidelity_review.cjs');
function changedInputs() {
  return inputSnapshots.filter(input => { try { return digest(fs.readFileSync(input.path)) !== input.sha256; } catch { return true; } }).map(input => path.relative(path.resolve(__dirname, '..'), input.path).split(path.sep).join('/'));
}
async function runCalibration(output, options = {}) {
  if (fs.existsSync(output)) throw Error('Use a fresh output directory to preserve calibration evidence.');
  if (changedInputs().length) throw Error('Calibration inputs changed since loading; start a fresh process.');
  const cases = JSON.parse(JSON.stringify(loadedCases));
  const corpusPayloadSha256 = digest(JSON.stringify(cases));
  const corpusFiles = inputSnapshots.filter(input => corpusPaths.includes(input.path)).map(input => ({ path: path.relative(path.resolve(__dirname, '..'), input.path).split(path.sep).join('/'), sha256: input.sha256 }));
  fs.mkdirSync(output, { recursive: true });
  const ownBrowser = !options.browser;
  const browser = options.browser || await require('playwright').chromium.launch({ headless: true });
  const results = [], reports = [];
  try {
    for (const fixture of cases) {
      const folder = path.join(output, fixture.id); fs.mkdirSync(folder);
      const source = path.join(folder, 'source.html'), candidate = path.join(folder, 'candidate.html');
      fs.writeFileSync(source, fixture.sourceHtml); fs.writeFileSync(candidate, fixture.candidateHtml);
      const report = await compareFiles(browser, source, candidate, fixture);
      fs.writeFileSync(path.join(folder, 'result.json'), JSON.stringify(report, null, 2) + '\n');
      reports.push({ id: fixture.id, ...report });
      results.push({ id: fixture.id, category: fixture.category, expected: fixture.expectedStatus, actual: report.status, matched: report.status === fixture.expectedStatus,
        profiles: report.profiles?.map(profile => ({ id: profile.id, status: profile.status })), durationMs: report.durationMs, evidence: fixture.id + '/result.json', sourceSha256: report.source.sha256, candidateSha256: report.candidate.sha256 });
    }
  } finally { if (ownBrowser) await browser.close(); }
  const valid = results.filter(r => r.expected === 'passed'), harmful = results.filter(r => r.expected === 'review-required');
  const falseAccepts = harmful.filter(r => r.actual === 'passed').length;
  const falseRejections = valid.filter(r => r.actual === 'review-required').length;
  const changed = changedInputs();
  const summary = { schemaVersion: 1, kind: 'synthetic-rendered-fidelity-calibration', measuredAt: new Date().toISOString(), browserVersion: browser.version(),
    corpusSha256: digest(JSON.stringify(corpusFiles)), corpusFiles, corpusPayloadSha256,
    implementationSha256: inputSnapshots[1].sha256, calibrationSha256: inputSnapshots[0].sha256, reviewRendererSha256: inputSnapshots[2].sha256, dependencyCollectorSha256: inputSnapshots[3].sha256,
    evidence: { complete: changed.length === 0, changedInputs: changed },
    total: results.length, matched: results.filter(r => r.matched).length,
    metrics: { harmfulCases: harmful.length, validRepairs: valid.length, falseAccepts, falseRejections,
      falseAcceptanceRate: harmful.length ? falseAccepts / harmful.length : null, falseRejectionRate: valid.length ? falseRejections / valid.length : null,
      unexpectedlyUnavailable: results.filter(r => r.actual === 'unavailable' && r.expected !== 'unavailable').length },
    humanMetrics: null, humanValidation: 'not-run', results,
    limitations: ['Authored synthetic HTML pairs are not a representative production error-rate estimate.', 'No PDF OCR accuracy, real model output quality, or screen-reader usability was measured.', 'Selected checkpoints assess only the named properties; external-resource and script-dependent cases remain unavailable.'] };
  fs.writeFileSync(path.join(output, 'calibration-report.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'review.html'), renderReview({ reports }));
  return summary;
}
if (require.main === module) (async () => {
  const output = process.argv[2]; if (!output) throw Error('Usage: calibrate_rendered_fidelity.cjs NEW_OUTPUT_DIR');
  const result = await runCalibration(path.resolve(output));
  console.log(JSON.stringify({ total: result.total, matched: result.matched, metrics: result.metrics, evidence: result.evidence, humanMetrics: result.humanMetrics }));
  if (result.total !== result.matched || !result.evidence.complete) process.exitCode = 1;
})().catch(e => { console.error(e.message); process.exitCode = 2; });
module.exports = { runCalibration };
