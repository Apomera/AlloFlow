const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const unitFiles = new Map();
for (const file of ['unit-tests.json', 'unit-recheck.json']) {
  const report = read(file);
  for (const result of report.testResults) {
    assert.equal(result.status, 'passed', result.name);
    assert.ok(result.assertionResults.every(test => test.status === 'passed'), result.name);
    const name = path.basename(result.name);
    assert.ok(!unitFiles.has(name), 'Duplicate unit result: ' + name);
    unitFiles.set(name, result.assertionResults.length);
  }
}
const expected = fs.readdirSync(path.join(root, 'tests')).filter(file => /^astronomy_.*\.test\.js$/.test(file)).concat('stem_astronomy_sky.test.js').sort();
assert.deepEqual(Array.from(unitFiles.keys()).sort(), expected);
const browser = read('browser-tests.json');
assert.equal(browser.stats.unexpected, 0);
assert.equal(browser.stats.skipped, 0);
assert.equal(browser.stats.flaky, 0);
assert.equal(browser.stats.expected, 31);
assert.equal((browser.errors || []).length, 0);
const visual = read('final-browser.json');
for (const view of visual) {
  assert.deepEqual(view.errors, []);
  if (view.metrics) assert.ok(view.metrics.scrollWidth <= view.metrics.width + 1);
}
assert.equal(visual.find(view => view.name === 'section-journey').layouts.length, 18);
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_astronomy.js'));
assert.ok(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_astronomy.js'))));
const delta = read('ui-strings.delta.json');
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const strings = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).stem.astronomy;
  for (const [key, value] of Object.entries(delta)) assert.equal(strings[key], value, key);
}
const summary = {
  unitFiles: unitFiles.size,
  unitChecks: Array.from(unitFiles.values()).reduce((sum, count) => sum + count, 0),
  browserChecks: browser.stats.expected,
  mobileSections: 18,
  visualLayouts: visual.filter(view => view.metrics).length,
  newEnglishStrings: Object.keys(delta).length,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  mirrorMatches: true
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
