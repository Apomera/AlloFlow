const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const units = new Map();
// The targeted rerun supersedes the initial new-suite accessible-name failures.
// Every distinct final file and assertion must pass.
for (const name of ['unit-results.json', 'new-unit-results.json']) {
  for (const file of read(name).testResults) units.set(file.name.replace(/\\/g, '/'), file);
}
assert.equal(units.size, 6);
let unitCount = 0;
for (const file of units.values()) {
  assert.equal(file.status, 'passed', file.name);
  for (const test of file.assertionResults) { assert.equal(test.status, 'passed', test.fullName); unitCount++; }
}
assert.equal(unitCount, 59);
const browserCases = new Map();
function visit(suite) {
  for (const spec of suite.specs || []) for (const test of spec.tests) {
    const result = test.results.at(-1);
    assert.equal(result.status, 'passed', spec.title);
    assert.equal(test.status, 'expected', spec.title);
    browserCases.set([spec.file, spec.title, test.projectName].join('|'), { file: spec.file, title: spec.title, project: test.projectName, status: result.status });
  }
  for (const child of suite.suites || []) visit(child);
}
for (const name of ['browser-results.json', 'browser-copy-results.json', 'browser-map-results.json']) {
  const report = read(name);
  assert.deepEqual(report.errors, []);
  report.suites.forEach(visit);
}
const browsers = [...browserCases.values()];
assert.equal(browsers.length, 16);
const visuals = read('after-metrics.json');
assert.equal(visuals.length, 14);
for (const state of visuals) {
  assert.ok(state.scrollWidth <= state.width + 1);
  assert.deepEqual(state.errors, []);
  assert.ok(state.minimumContrast >= 4.5);
  assert.ok(state.minimumTargetHeight >= 43.5);
  assert.equal(state.geometry.dots.length, 2);
  for (const dot of state.geometry.dots) {
    assert.ok(dot.x - dot.r >= 0 && dot.y - dot.r >= 0 && dot.x + dot.r <= state.geometry.width && dot.y + dot.r <= state.geometry.height);
  }
}
const canonical = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_solarsystem.js'));
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'));
assert.ok(canonical.equals(mirror));
const source = canonical.toString('utf8');
new vm.Script(source);
const blocks = [
  source.slice(source.indexOf('          function buildSolarSignalLab()'), source.indexOf('          function buildSolarMoonLab()')),
  source.split(/\r?\n/).filter(line => /signalEvidenceSaveRef|solar-signal-workbench/.test(line)).join('\n'),
];
assert.ok(blocks.every(block => block.length && !/[^\r\n][ \t]+\r?$/m.test(block)));
const summary = {
  completedDate: '2026-10-05', committedByTask: false,
  units: { passed: unitCount, files: [...units].map(([file, result]) => ({ file, passed: result.assertionResults.length })) },
  browsers: { passed: browsers.length, cases: browsers },
  visualStates: visuals.length,
  minimumEnabledTextContrast: Math.min(...visuals.map(state => state.minimumContrast)),
  minimumControlHeight: Math.min(...visuals.map(state => state.minimumTargetHeight)),
  overflowFree: true, runtimeErrors: 0, syntax: 'passed', scopedWhitespace: 'passed', canonicalMirrorIdentical: true,
  sourceSha256: crypto.createHash('sha256').update(canonical).digest('hex'),
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ unitChecks: unitCount, browserCases: browsers.length,
  visualStates: visuals.length, minimumTextContrast: summary.minimumEnabledTextContrast,
  minimumControlHeight: summary.minimumControlHeight, canonicalMirrorIdentical: true,
  sourceSha256: summary.sourceSha256 }, null, 2));
