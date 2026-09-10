'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const unitGroups = [
  ['live-focused-tests.json', ['remediation_inline_math_option_groups.test.js', 'remediation_followup_fidelity.test.js', 'remediation_semantic_fidelity.test.js'], 82],
  ['live-integration-tests.json', ['aifix_chunk_gates.test.js', 'aifix_source_associations.test.js', 'remediation_form_association_index.test.js', 'remediation_source_contract_integration.test.js', 'doc_pipeline_build_parity.test.js'], 87],
  ['resilience-unit-tests.json', ['rendered_fidelity_resilience.test.js'], 19],
  ['export-inspection-unit-tests.json', ['document_export_inspection_failures.test.js'], 2],
];
const groups = unitGroups.map(([file, expectedFiles, count]) => {
  const report = read(file);
  assert.equal(report.success, true); assert.equal(report.numPassedTests, count); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
  assert.deepEqual(report.testResults.map(result => path.basename(result.name)).sort(), [...expectedFiles].sort());
  assert.ok(report.testResults.every(result => result.status === 'passed' && result.assertionResults.length && result.assertionResults.every(test => test.status === 'passed')));
  return { file, passed: count, files: expectedFiles };
});
for (const [file, count] of [['rendered-browser-tests.json', 45], ['export-baseline-tests.json', 24]]) {
  const report = read(file);
  assert.deepEqual([report.stats.expected, report.stats.unexpected, report.stats.skipped, report.stats.flaky], [count, 0, 0, 0]);
  assert.equal(report.errors.length, 0);
  groups.push({ file, passed: count });
}
const files = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'dev-tools/rendered_document_fidelity.cjs', 'dev-tools/document_export_at_acceptance.cjs'];
const hashes = Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
assert.equal(hashes['doc_pipeline_module.js'], hashes['desktop/web-app/public/doc_pipeline_module.js']);
assert.match(fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8'), /_PIPELINE_PROMPT_VERSION = '20260909-4'/);
const mcp = read('mcp-selftest/benchmark-report.json');
assert.deepEqual(mcp.summary, { plannedTrials: 1, completedTrials: 1, passed: 1, failed: 0 });
assert.equal(mcp.interruption, null); assert.equal(mcp.trials[0].versions.sourceDrift, false);
assert.equal(mcp.trials[0].model.provider, 'scripted');
assert.equal(mcp.versions.files['doc_pipeline_source.jsx'], hashes['doc_pipeline_source.jsx']);
function findReviews(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? findReviews(path.join(directory, entry.name)) : entry.name === 'review.html' ? [path.join(directory, entry.name)] : []);
}
const reviews = findReviews(path.join(__dirname, 'rendered-browser-artifacts'));
assert.equal(reviews.length, 1);
const recoveryResults = JSON.parse(fs.readFileSync(path.join(path.dirname(reviews[0]), 'rendered-fidelity.json'), 'utf8'));
assert.deepEqual(recoveryResults.reports.map(report => report.status), ['unavailable', 'passed']);
fs.copyFileSync(reviews[0], path.join(__dirname, 'batch-recovery-review.html'));
fs.writeFileSync(path.join(__dirname, 'batch-recovery-results.json'), JSON.stringify(recoveryResults, null, 2) + '\n');
const summary = { measuredAt: new Date().toISOString(), policyVersion: '20260909-4', distinctTestsPassed: groups.reduce((sum, group) => sum + group.passed, 0), groups,
  shippingModulesMatch: true, hashes, mcp: { passed: true, durationMs: mcp.trials[0].durationMs, scriptedModelCalls: mcp.trials[0].metrics.calls, sourceDrift: false },
  humanValidation: 'not-run', liveModelCalls: 0, deployment: 'not-run' };
fs.writeFileSync(path.join(__dirname, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'README.md'), `# Remediation meaning preservation and failure recovery

Implemented locally on September 9, 2026. The live acceptance policy is now \`20260909-4\`; both generated pipeline files were rebuilt and verified byte for byte.

## Changes

- Strict remediation preserves HTML superscript/subscript kind, content, and position, including linked expressions and existing captions. Existing captions use NFC normalization so Unicode exponents cannot collapse into ordinary digits. Equivalent formatting, improved footnote links, and new captions remain supported within the existing repair policy.
- Select options preserve effective disabled state inherited from optgroups, group membership, and existing group labels. Missing labels and equivalent disabled representations remain allowed.
- Baseline export acceptance preserves Unicode superscript/subscript distinctions, rejects incomplete text decoding as unavailable, and reports disabled scripts, unresolved resources, and active animations as incomplete coverage. Inert JSON, embedded assets, local SVG references, and canonical Unicode equivalents remain supported.
- Browser setup/inspection failures close contexts and retain unavailable diagnostics. Rendered checks continue other sides/profiles; valid manifests retain both unavailable and successful pairs. Batch completion rechecks source/candidate files and the manifest itself. An incomplete inspection cannot count as a pass.

## Validation

**259 distinct focused tests passed**, with every requested test file present in the final reports and no skips or retries in the final browser runs:

- 82 focused live-gate tests, including 27 new inline-math/option-group regressions.
- 87 live integration and generated-build parity tests.
- 19 deterministic rendered-recovery tests and two export inspection failure tests.
- 45 native Chromium rendered tests, including the existing 29 authored synthetic fixture cases and three new recovery/CLI tests.
- 24 baseline export tests: 20 new cases and four existing HTML/PDF export regressions.

The local MCP self-test passed in ${(mcp.trials[0].durationMs / 1000).toFixed(1)} seconds using ${mcp.trials[0].metrics.calls} scripted model calls, with no source drift. It does not measure live-model accuracy or human accessibility acceptance. No deployment or live model call was performed.

## Evidence

- [Verified counts, file hashes, and module parity](validation-summary.json)
- [Live focused tests](live-focused-tests.json) and [integration tests](live-integration-tests.json)
- [Rendered recovery unit tests](resilience-unit-tests.json) and [export failure unit tests](export-inspection-unit-tests.json)
- [Rendered browser tests](rendered-browser-tests.json) and [baseline export tests](export-baseline-tests.json)
- [Pre-change baseline false-pass probes](export-baseline-probes.json)
- [MCP self-test](mcp-selftest/benchmark-report.json)
- [Example recovered batch review](batch-recovery-review.html) and [underlying results](batch-recovery-results.json)

These are bounded preservation and automated inspection checks. The rendered comparison remains opt-in. Human screen-reader validation, representative production calibration, OCR accuracy, and description usefulness remain separate work.
`);
console.log(JSON.stringify({ testsPassed: summary.distinctTestsPassed, shippingModulesMatch: summary.shippingModulesMatch, mcp: summary.mcp }));
