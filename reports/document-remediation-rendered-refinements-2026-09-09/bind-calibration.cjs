'use strict';
const fs = require('node:fs');
const file = 'dev-tools/calibrate_rendered_fidelity.cjs';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const replace = (before, after) => { if (!s.includes(before)) throw Error('Anchor missing: ' + before); s = s.replace(before, after); };
replace("const { compareFiles } = require('./rendered_document_fidelity.cjs');", `const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const corpusPaths = ['cases.cjs', 'extended_cases.cjs'].map(name => path.resolve(__dirname, '../tests/fixtures/rendered_fidelity', name));
// Capture the identities when modules are loaded, before asynchronous inspection.
const inputPaths = [__filename, path.join(__dirname, 'rendered_document_fidelity.cjs'), path.join(__dirname, 'rendered_fidelity_review.cjs'), ...corpusPaths];
const inputSnapshots = inputPaths.map(file => ({ path: file, sha256: digest(fs.readFileSync(file)) }));
const loadedCases = corpusPaths.flatMap(file => require(file));
const { compareFiles } = require('./rendered_document_fidelity.cjs');
const { renderReview } = require('./rendered_fidelity_review.cjs');
function changedInputs() {
  return inputSnapshots.filter(input => { try { return digest(fs.readFileSync(input.path)) !== input.sha256; } catch { return true; } }).map(input => path.relative(path.resolve(__dirname, '..'), input.path).split(path.sep).join('/'));
}`);
replace("  const corpusPath = path.resolve(__dirname, '../tests/fixtures/rendered_fidelity/cases.cjs');\n  const extendedCorpusPath = path.resolve(__dirname, '../tests/fixtures/rendered_fidelity/extended_cases.cjs');\n  const corpusPaths = [corpusPath, extendedCorpusPath];\n  const cases = corpusPaths.flatMap(file => require(file));", "  if (changedInputs().length) throw Error('Calibration inputs changed since loading; start a fresh process.');\n  const cases = JSON.parse(JSON.stringify(loadedCases));\n  const corpusPayloadSha256 = digest(JSON.stringify(cases));\n  const corpusFiles = inputSnapshots.filter(input => corpusPaths.includes(input.path)).map(input => ({ path: path.relative(path.resolve(__dirname, '..'), input.path).split(path.sep).join('/'), sha256: input.sha256 }));");
const start = s.indexOf('    corpusSha256:');
const end = s.indexOf('    total: results.length', start);
if (start < 0 || end < 0) throw Error('Hash section missing');
s = s.slice(0, start) + "    corpusSha256: digest(JSON.stringify(corpusFiles)), corpusFiles, corpusPayloadSha256,\n    implementationSha256: inputSnapshots[1].sha256, calibrationSha256: inputSnapshots[0].sha256, reviewRendererSha256: inputSnapshots[2].sha256,\n    evidence: { complete: changedInputs().length === 0, changedInputs: changedInputs() },\n" + s.slice(end);
replace("require('./rendered_fidelity_review.cjs').renderReview({ reports })", 'renderReview({ reports })');
replace('metrics: result.metrics, humanMetrics:', 'metrics: result.metrics, evidence: result.evidence, humanMetrics:');
replace('if (result.total !== result.matched)', 'if (result.total !== result.matched || !result.evidence.complete)');
fs.writeFileSync(file, s.replace(/\n/g, '\r\n'));
