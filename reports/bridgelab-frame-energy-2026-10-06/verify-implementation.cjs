const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(root, 'reports/bridgelab-frame-energy-2026-10-06');
const read = file => fs.readFileSync(path.join(root, file));
const json = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const sources = ['stem_lab/stem_tool_bridgelab.js', 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'];
const canonical = read(sources[0]), mirror = read(sources[1]);
assert(canonical.equals(mirror));
const source = canonical.toString('utf8'); new vm.Script(source);
assert(!/(?<!\r)\n/.test(source));
const calls = /__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const literals = [...source.matchAll(calls)].map(match => '[' + match[1] + ',' + match[2] + ']');
const pairs = vm.runInNewContext('[' + literals.join(',') + ']', Object.create(null));
const entries = new Map();
for (const [key, value] of pairs) {
  if (!key.startsWith('stem.bridgelab.')) continue;
  if (entries.has(key)) assert.equal(entries.get(key), value);
  entries.set(key, value);
}
assert.equal(entries.size, 1355);
const english = [];
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const bytes = read(file), data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of entries) assert.equal(data.stem.bridgelab[key.slice('stem.bridgelab.'.length)], value, file + ': ' + key);
  assert.equal(hash(read(file)), hash(bytes));
  english.push({ file, sha256: hash(bytes), literalFallbacksMatched: entries.size });
}
const modelFile = fs.existsSync(path.join(report, 'model-invariants.json')) ? 'model-invariants.json' : 'model-invariants-before-rounding.json';
const model = json(modelFile);
assert.equal(model.status, 'passed'); assert.equal(model.configurations, 144);
const finalCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second). Displayed values are rounded.';
const priorCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second).';
const sweepMatchesCurrentSource = model.sourceSha256 === hash(canonical);
if (!sweepMatchesCurrentSource) {
  assert.equal(source.split(finalCopy).length, 2);
  assert.equal(hash(Buffer.from(source.replace(finalCopy, priorCopy), 'utf8')), model.sourceSha256, 'Source changed beyond the one display sentence');
}
const kind = fs.existsSync(path.join(report, 'browser-run.json')) ? 'browser' : 'preview';
const run = json(kind + '-run.json'), bytes = fs.readFileSync(path.join(report, kind + '-results.json'));
const results = JSON.parse(bytes.toString('utf8'));
assert.equal(run.kind, kind); assert.equal(run.exitCode, 0); assert.equal(run.signal, null); assert.equal(run.inputsUnchanged, true);
assert.deepEqual(run.inputsBefore, run.inputsAfter);
for (const [file, info] of Object.entries(run.inputsBefore)) {
  const current = read(file); assert.equal(hash(current), info.sha256); assert.equal(current.length, info.bytes);
}
assert.equal(hash(bytes), run.result.sha256); assert.equal(bytes.length, run.result.bytes);
assert.equal(run.video, 'off'); assert.equal(run.retries, 0); assert.equal(run.workers, 1);
assert.equal(hash(fs.readFileSync(run.config.path)), run.config.sha256);
const start = Date.parse(run.startedAt), end = Date.parse(run.finishedAt);
assert(Number.isFinite(start) && Number.isFinite(end) && end >= start);
function flatten(suites) { return suites.flatMap(suite => [...(suite.specs || []), ...flatten(suite.suites || [])]); }
const specs = flatten(results.suites), expected = kind === 'browser' ? 35 : 3;
assert.deepEqual(results.errors, []); assert.equal(results.stats.expected, expected);
assert.equal(results.stats.unexpected, 0); assert.equal(results.stats.skipped, 0); assert.equal(results.stats.flaky, 0);
assert.equal(specs.length, expected); assert.equal(new Set(specs.map(spec => spec.id)).size, expected);
assert.equal(specs.filter(spec => spec.title.startsWith('frame energy:')).length, 3);
for (const spec of specs) {
  assert.equal(spec.ok, true); assert.equal(spec.tests.length, 1);
  const test = spec.tests[0]; assert.equal(test.projectName, 'chromium'); assert.equal(test.status, 'expected');
  assert.equal(test.expectedStatus, 'passed'); assert.equal(test.results.length, 1);
  assert.equal(test.results[0].status, 'passed'); assert.equal(test.results[0].retry, 0); assert.deepEqual(test.results[0].errors, []);
}
const captures = [];
for (const width of [1000, 320]) for (const state of ['native', 'tiny', 'decay']) {
  const name = 'frame-energy-' + width + '-' + state + '.png', file = path.join(report, name);
  const image = fs.readFileSync(file), stat = fs.statSync(file);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(stat.mtimeMs >= start && stat.mtimeMs <= end, 'Stale capture: ' + name);
  captures.push({ name, sha256: hash(image), bytes: image.length, width: image.readUInt32BE(16), height: image.readUInt32BE(20) });
}
const attempts = ['unit-memory-interrupted-run.json', 'unit-stopped-retry-run.json', 'unit-fork-startup-run.json', 'unit-thread-startup-run.json']
  .map(name => { const raw = fs.readFileSync(path.join(report, name)), data = JSON.parse(raw.toString('utf8'));
    return { name, sha256: hash(raw), startedAt: data.startedAt, finishedAt: data.finishedAt || null,
      exitCode: data.exitCode ?? null, status: data.status || (data.finishedAt ? 'not completed successfully' : 'interrupted') }; });
assert(!fs.existsSync(path.join(report, 'unit-results.json')), 'A completed unit result now exists; validate it before reporting a limitation');
for (const file of sources) assert.equal(hash(read(file)), hash(canonical));
const proof = { status: 'source-model-browser-passed-unit-validation-blocked', checkedAt: new Date().toISOString(),
  sourceSha256: hash(canonical), sourceMirrorsIdentical: true, syntaxValid: true, independentlyCheckedEnglishFiles: english,
  numericConfigurations: 144, numericProof: { file: modelFile, sweepSourceSha256: model.sourceSha256,
    sweepMatchesCurrentSource, modelCodeUnchanged: true, finalDifference: sweepMatchesCurrentSource ? null : 'One sentence in the display text: Displayed values are rounded.' },
  browser: { passed: expected, kind, retries: 0, workers: 1, video: 'off', startedAt: run.startedAt, finishedAt: run.finishedAt },
  captures, unit: { status: 'not completed', declaredCases: 287, completedPassReport: false, attempts,
    limitation: 'A full run exhausted native memory, a slow retry was interrupted, and both fresh fork and thread workers timed out before collecting tests.' },
  note: 'Browser assertions are bound to the current source. The numerical sweep matches either that source or the exact source before the one final display sentence; normalization proves the model code is unchanged. No unit pass count is inferred from failed or interrupted runs.' };
fs.writeFileSync(path.join(report, 'implementation-verification.json'), JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify({ status: proof.status, englishFallbacks: entries.size, numericConfigurations: 144,
  browserPassed: expected, freshFeatureCaptures: captures.length, unit: proof.unit.status }, null, 2));
