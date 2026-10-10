const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(root, 'reports/bridgelab-settling-route-2026-10-06');
const priorReport = 'reports/bridgelab-moment-precision-2026-10-06';
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(path.join(report, file), 'utf8'));
const previousBytes = read(priorReport + '/verification.json');
assert.equal(hash(previousBytes), '9f6f6ee1fc46a0653108ad6d7fd6f69ef9657fba0d688146a6a876a32762bd79');
const previous = JSON.parse(previousBytes.toString('utf8'));
assert.equal(previous.status, 'verified');
assert.equal(previous.sourceSha256, 'b0f0cf46dba121cee27a9fe047680c091869d6c2715feea46cc53099860907fc');
assert.equal(previous.sourceMirrorsIdentical, true);
assert.equal(previous.syntaxValid, true);
assert.equal(previous.model.configurationsPreviouslyPassed, 144);
assert.equal(previous.model.modelCodeUnchanged, true);

const sourceFiles = ['stem_lab/stem_tool_bridgelab.js', 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'];
const canonical = read(sourceFiles[0]);
assert(canonical.equals(read(sourceFiles[1])), 'Source mirrors differ');
const source = canonical.toString('utf8');
new vm.Script(source);
assert(!/(?<!\r)\n/.test(source), 'Source lost CRLF line endings');
const edits = json('source-edits.json');
assert.equal(hash(canonical), edits.afterSha256);
assert.equal(edits.afterSha256, '7e67272b7b7aa6521f37cd9c1525a5fbdeb492e6e2dfa773e4dc387afec19b5f');
assert.equal(edits.edits.length, 8);
function reverseEdits(text, entries) {
  for (const edit of [...entries].reverse()) {
    assert.equal(text.split(edit.after).length, 2, 'Edit must have one exact occurrence');
    text = text.replace(edit.after, edit.before);
  }
  return text;
}
let prior = reverseEdits(source, edits.edits);
assert.equal(hash(Buffer.from(prior)), edits.beforeSha256);
assert.equal(edits.beforeSha256, previous.sourceSha256);

// Recheck the earlier normalization chain, rather than infer physics continuity.
const priorEdits = JSON.parse(read(priorReport + '/source-edits.json').toString('utf8'));
assert.equal(priorEdits.afterSha256, previous.sourceSha256);
assert.equal(priorEdits.edits.length, 3);
prior = reverseEdits(prior, priorEdits.edits);
assert.equal(hash(Buffer.from(prior)), priorEdits.beforeSha256);
assert.equal(priorEdits.beforeSha256, 'a8ad1578d7555df6f460d004da49b4bfc392dd817adb66d0d7ef6464189926a5');
const roundedCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second). Displayed values are rounded.';
const originalCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second).';
assert.equal(prior.split(roundedCopy).length, 2);
const modelPath = 'reports/bridgelab-frame-energy-2026-10-06/model-invariants-before-rounding.json';
const modelBytes = read(modelPath);
const model = JSON.parse(modelBytes.toString('utf8'));
assert.equal(hash(modelBytes), '9d0b444ddbf45ef17965c4a5413f716338cb9d8f77c8f79fbdfa7a6c80b7ef81');
assert.equal(hash(modelBytes), previous.model.sha256);
assert.equal(model.status, 'passed');
assert.equal(model.configurations, 144);
assert.equal(model.sourceSha256, previous.model.sweepSourceSha256);
assert.equal(hash(Buffer.from(prior.replace(roundedCopy, originalCopy))), model.sourceSha256);

const calls = /__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const literals = [...source.matchAll(calls)].map(match => '[' + match[1] + ',' + match[2] + ']');
const entries = new Map();
for (const [key, value] of vm.runInNewContext('[' + literals.join(',') + ']', Object.create(null))) {
  if (!key.startsWith('stem.bridgelab.')) continue;
  if (entries.has(key)) assert.equal(entries.get(key), value);
  entries.set(key, value);
}
assert.equal(entries.size, 1356);
assert.equal(entries.get('stem.bridgelab.moment_energy_route'), 'Follow energy after shaking');
const englishFiles = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
assert.equal(edits.english.length, 2);
assert.deepEqual(edits.english.map(edit => edit.file).sort(), [...englishFiles].sort());
const english = [];
for (const file of englishFiles) {
  const bytes = read(file);
  const text = bytes.toString('utf8');
  const data = JSON.parse(text.replace(/^\uFEFF/, ''));
  for (const [key, value] of entries) assert.equal(data.stem.bridgelab[key.slice('stem.bridgelab.'.length)], value, file + ':' + key);
  const edit = edits.english.find(item => item.file === file);
  assert.equal(text.split(edit.after).length, 2);
  assert.equal(edit.beforeSha256, previous.english.find(item => item.file === file).sha256);
  english.push({file, sha256: hash(bytes), literalFallbacksMatched: entries.size,
    newRouteInsertionMatchedOnce: true, historicalWriteSha256: edit.afterSha256,
    currentMatchesHistoricalWriteHash: hash(bytes) === edit.afterSha256});
}

const proof = {
  status: 'source-passed', checkedAt: new Date().toISOString(),
  sourceSha256: hash(canonical), sourceMirrorsIdentical: true, syntaxValid: true, sourceCRLFPreserved: true,
  documentedUIEditsReversed: 8, english,
  englishNote: 'The shared English registries are checked by their current Bridge Lab values and exact new key insertion. Current whole-file hashes are recorded; historical write hashes are retained without requiring whole-file immutability.',
  previousVerification: {path: priorReport + '/verification.json', sha256: hash(previousBytes), status: previous.status},
  model: {configurationsPreviouslyPassed: 144, freshSweepRun: false, modelCodeUnchanged: true,
    path: modelPath, sha256: hash(modelBytes), sweepSourceSha256: model.sourceSha256,
    proof: 'Reversing the eight current UI edits, three prior UI edits and prior rounding sentence reproduces the checked model sweep source hash.'},
  unit: {status: 'not run in this pass', passed: null,
    reason: 'The recent focused Vitest run timed out while starting its fork worker, before test cases ran.',
    previousRun: priorReport + '/unit-run.json'}
};
if (process.argv[2] === 'source') {
  fs.writeFileSync(path.join(report, 'source-verification.json'), JSON.stringify(proof, null, 2) + '\n');
  console.log(JSON.stringify(proof, null, 2));
  process.exit(0);
}

const run = json('preview-run.json');
assert.equal(run.kind, 'preview');
assert.equal(run.exitCode, 0);
assert.equal(run.signal, null);
assert.equal(run.inputsUnchanged, true);
assert.deepEqual(run.inputsBefore, run.inputsAfter);
assert.deepEqual(Object.keys(run.inputsBefore).sort(), [...sourceFiles, 'tests/e2e/26-bridgelab-gl.spec.ts'].sort());
for (const [file, info] of Object.entries(run.inputsBefore)) {
  const bytes = read(file);
  assert.equal(hash(bytes), info.sha256, file + ': current hash differs from run');
  assert.equal(bytes.length, info.bytes);
}
assert.equal(run.workers, 1);
assert.equal(run.retries, 0);
assert.equal(run.video, 'off');
assert.equal(run.browserCache, 'C:/Users/cabba/AppData/Local/ms-playwright');
assert(run.command.includes('--project=chromium'));
assert(run.command.includes('--workers=1'));
assert(run.command.includes('--retries=0'));
assert(run.command.includes('--grep=settling.route:|moment.precision:'));
const configBytes = fs.readFileSync(run.config.path);
assert.equal(hash(configBytes), run.config.sha256);
assert.equal(configBytes.length, run.config.bytes);
const resultPath = path.join(report, 'preview-results.json');
assert.equal(path.resolve(run.result.path), path.resolve(resultPath));
const resultBytes = fs.readFileSync(resultPath);
assert.equal(hash(resultBytes), run.result.sha256);
assert.equal(resultBytes.length, run.result.bytes);
const results = JSON.parse(resultBytes.toString('utf8'));
const flatten = suites => suites.flatMap(suite => [...(suite.specs || []), ...flatten(suite.suites || [])]);
const specs = flatten(results.suites);
assert.equal(specs.length, 4);
assert.deepEqual(results.errors, []);
assert.equal(results.stats.expected, 4);
for (const key of ['unexpected', 'skipped', 'flaky']) assert.equal(results.stats[key], 0);
assert.equal(specs.filter(spec => spec.title.startsWith('settling route:')).length, 2);
assert.equal(specs.filter(spec => spec.title.startsWith('moment precision:')).length, 2);
for (const spec of specs) {
  assert.equal(spec.ok, true);
  assert.equal(spec.tests.length, 1);
  const test = spec.tests[0];
  assert.equal(test.projectName, 'chromium');
  assert.equal(test.status, 'expected');
  assert.equal(test.results.length, 1);
  const result = test.results[0];
  assert.equal(result.status, 'passed');
  assert.equal(result.retry, 0);
  assert.deepEqual(result.errors, []);
}
const start = Date.parse(run.startedAt);
const end = Date.parse(run.finishedAt);
assert(Number.isFinite(start) && Number.isFinite(end) && end >= start);
proof.browser = {passed: 4, startedAt: run.startedAt, finishedAt: run.finishedAt, workers: 1, retries: 0,
  video: 'off', browserCache: run.browserCache, inputsUnchanged: true,
  resultsSha256: hash(resultBytes), configSha256: hash(configBytes)};
proof.captures = [];
for (const name of fs.readdirSync(report).filter(name => /^settling-route-(1000|320)-.*\.png$/.test(name))) {
  const file = path.join(report, name);
  const bytes = fs.readFileSync(file);
  const stat = fs.statSync(file);
  assert(bytes.length > 24);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR');
  assert(stat.mtimeMs >= start && stat.mtimeMs <= end, 'Capture outside run: ' + name);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert(width > 0 && height > 0 && width < 20000 && height < 20000);
  proof.captures.push({name, sha256: hash(bytes), bytes: bytes.length, width, height, modifiedAt: stat.mtime.toISOString()});
}
assert(proof.captures.length >= 4, 'Expected at least four fresh route captures');
for (const width of ['1000', '320']) assert(proof.captures.filter(capture => capture.name.startsWith('settling-route-' + width + '-')).length >= 2);
proof.status = 'verified';
fs.writeFileSync(path.join(report, 'verification.json'), JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify({status: proof.status, browserPassed: proof.browser.passed, captures: proof.captures.length,
  englishFallbacks: entries.size, modelCodeUnchanged: true, unit: proof.unit}, null, 2));
