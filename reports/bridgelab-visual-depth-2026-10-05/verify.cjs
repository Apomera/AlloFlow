const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.resolve(root, file));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const json = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const sourceFiles = ['stem_lab/stem_tool_bridgelab.js', 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'];
const canonical = read(sourceFiles[0]), mirror = read(sourceFiles[1]);
assert(canonical.equals(mirror), 'Bridge source mirrors differ');
const source = canonical.toString('utf8');
new vm.Script(source);
assert(!/(?<!\r)\n/.test(source), 'Bridge source must retain CRLF');

const calls = /__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const entries = new Map();
for (const match of source.matchAll(calls)) {
  const key = vm.runInNewContext(match[1]);
  if (!key.startsWith('stem.bridgelab.')) continue;
  const value = vm.runInNewContext(match[2]);
  if (entries.has(key)) assert.equal(entries.get(key), value, 'Conflicting literal fallback');
  entries.set(key, value);
}
const independentlyCheckedEnglishFiles = [];
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const raw = read(file), registry = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of entries) assert.equal(registry.stem.bridgelab[key.slice('stem.bridgelab.'.length)], value, file + ': ' + key);
  assert.equal(hash(read(file)), hash(raw), 'Registry changed while checking it');
  independentlyCheckedEnglishFiles.push({ file, sha256: hash(raw), literalFallbacksMatched: entries.size });
}

function verifyRun(kind) {
  const record = json(kind + '-run.json');
  assert.equal(record.kind, kind); assert.equal(record.exitCode, 0); assert.equal(record.signal, null);
  assert.equal(record.inputsUnchanged, true, 'Inputs changed during ' + kind + ' run');
  assert(Number.isFinite(Date.parse(record.startedAt)) && Date.parse(record.finishedAt) >= Date.parse(record.startedAt));
  assert.deepEqual(record.inputsBefore, record.inputsAfter);
  for (const [file, info] of Object.entries(record.inputsBefore)) {
    const data = read(file);
    assert.equal(hash(data), info.sha256, 'Stale ' + kind + ' input: ' + file);
    assert.equal(data.length, info.bytes);
  }
  const results = fs.readFileSync(path.join(__dirname, kind + '-results.json'));
  assert.equal(hash(results), record.result.sha256, 'Changed ' + kind + ' result');
  assert.equal(results.length, record.result.bytes);
  if (kind === 'browser') {
    assert.equal(record.video, 'off'); assert.equal(record.retries, 0); assert.equal(record.workers, 1);
    assert.equal(hash(fs.readFileSync(record.config.path)), record.config.sha256, 'Browser config changed');
  }
  return { record, results: JSON.parse(results) };
}

const unit = verifyRun('unit');
assert.equal(unit.results.success, true); assert.equal(unit.results.numFailedTests, 0);
assert.equal(unit.results.numPendingTests, 0); assert.equal(unit.results.numTodoTests, 0);
const expectedUnitFiles = new Map([
  ['tests/bridgelab_immersive_motion.test.js', 202],
  ['tests/bridgelab_seismic_model.test.js', 75],
  ['tests/bridgelab_seismic_inertia.test.js', 4]
]);
assert.equal(unit.results.testResults.length, expectedUnitFiles.size);
const assertions = [];
for (const result of unit.results.testResults) {
  const relative = path.relative(root, result.name).replace(/\\/g, '/');
  assert(expectedUnitFiles.has(relative), 'Unexpected unit file: ' + relative);
  assert.equal(result.status, 'passed');
  assert.equal(result.assertionResults.length, expectedUnitFiles.get(relative));
  for (const assertion of result.assertionResults) { assert.equal(assertion.status, 'passed'); assertions.push(assertion); }
  expectedUnitFiles.delete(relative);
}
assert.equal(unit.results.numTotalTests, 281); assert.equal(unit.results.numPassedTests, 281);
const newUnitChecks = assertions.filter(item => /shaking visual:/.test(item.fullName || item.title));
assert.equal(newUnitChecks.length, 9);

const browser = verifyRun('browser');
assert.deepEqual(browser.results.errors, []);
assert.equal(browser.results.stats.expected, 23); assert.equal(browser.results.stats.unexpected, 0);
assert.equal(browser.results.stats.flaky, 0); assert.equal(browser.results.stats.skipped, 0);
function flatten(suites) { return suites.flatMap(suite => [...(suite.specs || []), ...flatten(suite.suites || [])]); }
const specs = flatten(browser.results.suites);
assert.equal(specs.length, 23);
const groups = { 'bridge landscape:': 2, 'starting energy:': 2, 'decay time:': 2, 'decay fraction:': 3,
  'guide energy:': 3, 'guided damping:': 4, 'claim interval:': 4, 'energy questions:': 3 };
assert.equal(new Set(specs.map(spec => spec.id)).size, specs.length);
for (const [prefix, expected] of Object.entries(groups)) assert.equal(specs.filter(spec => spec.title.startsWith(prefix)).length, expected, prefix);
for (const spec of specs) {
  assert.equal(spec.ok, true, spec.title); assert.equal(spec.file.replace(/\\/g, '/'), '26-bridgelab-gl.spec.ts');
  assert.equal(spec.tests.length, 1);
  const test = spec.tests[0];
  assert.equal(test.projectName, 'chromium'); assert.equal(test.expectedStatus, 'passed');
  assert.equal(test.status, 'expected'); assert.equal(test.timeout, 180000); assert.equal(test.results.length, 1);
  assert.equal(test.results[0].retry, 0); assert.equal(test.results[0].status, 'passed');
  assert.deepEqual(test.results[0].errors, []);
}
const browserStart = Date.parse(browser.results.stats.startTime);
assert(browserStart >= Date.parse(browser.record.startedAt) && browserStart <= Date.parse(browser.record.finishedAt));

const model = json('model-invariants.json');
assert.equal(model.status, 'passed'); assert.equal(model.sourceSha256, hash(canonical)); assert.equal(model.configurations, 144);
const captures = [1000, 320].flatMap(width => [
  ...['controlled', 'recorded', 'print'].map(mode => 'starting-energy-' + width + '-' + mode + '.png'),
  ...['orbit', 'walkway', 'river', 'bank'].map(mode => 'bridge-' + width + '-landscape-' + mode + '.png'),
  ...['controls', 'fallback'].map(mode => 'decay-time-' + width + '-' + mode + '.png')
]);
const captureFiles = [];
for (const name of captures) {
  const file = fs.readFileSync(path.join(__dirname, name));
  assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Missing PNG: ' + name);
  const stat = fs.statSync(path.join(__dirname, name));
  assert(stat.mtimeMs >= Date.parse(browser.record.startedAt) && stat.mtimeMs <= Date.parse(browser.record.finishedAt), 'Stale capture: ' + name);
  captureFiles.push({ name, sha256: hash(file), bytes: file.length, modifiedAt: stat.mtime.toISOString() });
}
for (const file of sourceFiles) assert.equal(hash(read(file)), hash(canonical), 'Source changed while verifying');
const report = { status: 'passed', checkedAt: new Date().toISOString(), sourceSha256: hash(canonical),
  sourceMirrorsIdentical: true, syntaxValid: true, literalEnglishFallbacks: entries.size,
  independentlyCheckedEnglishFiles, unit: { passed: 281, newChecks: newUnitChecks.length, files: 3,
    startedAt: unit.record.startedAt, finishedAt: unit.record.finishedAt },
  browser: { passed: specs.length, groups, cleanFreshRun: true, retries: 0, video: 'off',
    startedAt: browser.record.startedAt, finishedAt: browser.record.finishedAt },
  numericConfigurations: model.configurations, featureCaptures: captures, featureCaptureFiles: captureFiles,
  note: 'Source/test hashes match both completed runs. The current English registries are independently checked because browser and unit harnesses use literal fallbacks.' };
fs.writeFileSync(path.join(__dirname, 'source-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
