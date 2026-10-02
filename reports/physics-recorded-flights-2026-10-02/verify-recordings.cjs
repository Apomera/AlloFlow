// Checks saved test reports and records the exact verified physics source.
// Run from the repository root after the commands in README.md.
const fs = require('fs');
const cp = require('child_process');
const crypto = require('crypto');
const assert = require('assert');
const report = 'reports/physics-recorded-flights-2026-10-02';
const sourcePin = '21ec879803dee6927c065237c6f4882f7ba77f6c8b0d3307e0b84795073063e6';
const baseline = '1bce28945b84b84299a462c3d32209be18f3c4e6';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(report + '/' + name, 'utf8'));
const source = fs.readFileSync('stem_lab/stem_tool_physics.js');
assert.strictEqual(hash(source), sourcePin);
assert(source.equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js')));
const units = read('unit-results.json');
assert.strictEqual(units.success, true);
assert.strictEqual(units.numPassedTests, 343);
assert.strictEqual(units.numFailedTests, 0);
assert.strictEqual(units.numPendingTests, 0);
assert.strictEqual(units.numFailedTestSuites, 0);
assert.strictEqual(units.testResults.length, 20);
assert(units.testResults.every(file => file.status === 'passed'));
const browserCounts = {};
for (const [name, count] of [['browser-results.json', 6], ['regression-browser-results.json', 59]]) {
  const data = read(name);
  assert.strictEqual(data.stats.expected, count);
  for (const key of ['unexpected', 'flaky', 'skipped']) assert.strictEqual(data.stats[key], 0);
  const results = [];
  function walk(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests) results.push(...test.results);
    (suite.suites || []).forEach(walk);
  }
  data.suites.forEach(walk);
  assert.strictEqual(results.length, count);
  assert(results.every(result => result.status === 'passed' && result.retry === 0 && !result.errors.length));
  browserCounts[name] = count;
}
const visuals = read('visual-results.json');
assert.strictEqual(visuals.passed, true);
assert.strictEqual(visuals.sourceUnchanged, true);
assert.strictEqual(visuals.sourceSha256, sourcePin);
assert.strictEqual(visuals.mirrorSha256, sourcePin);
assert.deepStrictEqual(visuals.errors, []);
const expectedConfigurations = [];
for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) expectedConfigurations.push(theme + '/' + width);
assert.deepStrictEqual(visuals.configurations.map(c => c.theme + '/' + c.width).sort(), expectedConfigurations.sort());
assert.deepStrictEqual(visuals.originalFlights.map(flight => flight.run), [1, 2]);
assert(visuals.originalFlights.every(flight => flight.samples > 100));
for (const config of visuals.configurations) {
  assert.strictEqual(config.pageOverflow, 0);
  assert.strictEqual(config.overflow, 0);
  assert(config.cardWidth > 0 && config.cardWidth <= config.width);
  assert(config.minFont >= 12);
  assert(config.minContrast >= (config.theme === 'contrast' ? 7 : 4.5));
  assert(config.targets.every(target => target.width >= 44 && target.height >= 44));
  assert.strictEqual(config.focused, true);
  assert(config.kept.includes('Kept recording') && config.kept.includes('original points'));
  assert.strictEqual(config.screenshot, 'recordings-' + config.theme + '-' + config.width + '.png');
  assert(fs.readFileSync(report + '/' + config.screenshot).subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
}
const catalogs = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const newKeys = ['history_kept_recording', 'history_original_points', 'history_saved_help', 'history_session_recording'].sort();
const physics = JSON.parse(fs.readFileSync(catalogs[0], 'utf8')).stem.physics;
for (const file of catalogs) {
  const current = JSON.parse(fs.readFileSync(file, 'utf8')).stem.physics;
  const before = JSON.parse(cp.execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).stem.physics;
  assert.deepStrictEqual(current, physics);
  assert.deepStrictEqual(Object.keys(current).filter(key => !(key in before)).sort(), newKeys);
  for (const key of Object.keys(before)) assert.strictEqual(current[key], before[key]);
}
const hostFile = 'stem_lab/stem_lab_module.js';
const hostBlock = text => {
  const start = text.indexOf('// STEM_AUTOSAVE_START');
  const end = text.indexOf('// STEM_AUTOSAVE_END', start);
  assert(start >= 0 && end > start);
  return text.slice(start, end).replace(/\r\n/g, '\n');
};
const host = hostBlock(fs.readFileSync(hostFile, 'utf8'));
const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.strictEqual(host, hostBlock(cp.execFileSync('git', ['show', head + ':' + hostFile], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })), 'Physics host save dependency is not yet committed.');
const dependencies = ['tests/physics_recorded_flights.test.js', 'tests/physics_recording_autosave.test.js',
  'tests/e2e/physics-recorded-flights.spec.ts', 'tests/e2e/helpers/stem_gl_harness.ts',
  'tests/helpers/physics_element_tree.js', 'tests/setup.js', 'pure_helpers_module.js',
  'vitest.config.js', 'playwright.config.ts', '.github/workflows/physics.yml'];
const verification = {
  passed: true, baselineCommit: baseline, checkedHead: head, sourceSha256: sourcePin,
  mirrorMatches: true, unitTests: 343, unitFiles: 20, browserTests: 65, browserCounts,
  configurations: 9, screenshots: 9, physicsCatalog: physics,
  hostAutosave: { file: hostFile, block: 'STEM_AUTOSAVE', sha256: hash(Buffer.from(host)), headMatches: true },
  dependencySha256: Object.fromEntries(dependencies.map(file => [file, hash(fs.readFileSync(file))])),
  reportSha256: Object.fromEntries(['unit-results.json', 'browser-results.json', 'regression-browser-results.json', 'visual-results.json', 'verify-recordings.cjs']
    .concat(visuals.configurations.map(c => c.screenshot)).map(file => [file, hash(fs.readFileSync(report + '/' + file))]))
};
fs.writeFileSync(report + '/verification.json', JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, sourceSha256: sourcePin, units: 343, browsers: 65, configurations: 9 }));
