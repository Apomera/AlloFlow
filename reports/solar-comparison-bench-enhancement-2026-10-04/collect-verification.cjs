const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const units = new Map();
for (const name of ['unit-results.json', 'new-unit-results.json']) {
  const report = read(name);
  assert.equal(report.success, true, name);
  for (const file of report.testResults) {
    assert.equal(file.status, 'passed', file.name);
    units.set(file.name.replace(/\\/g, '/'), file.assertionResults.map((test) => {
      assert.equal(test.status, 'passed', test.fullName);
      return test.fullName;
    }));
  }
}
assert.equal(units.size, 6);
const unitCount = [...units.values()].reduce((total, cases) => total + cases.length, 0);
assert.equal(unitCount, 58);
const browserCases = new Map();
const visit = (suite) => {
  for (const spec of suite.specs || []) for (const test of spec.tests) {
    browserCases.set([spec.file, spec.title, test.projectName].join('|'), { file: spec.file, title: spec.title, project: test.projectName, status: test.results.at(-1).status, outcome: test.status });
  }
  for (const child of suite.suites || []) visit(child);
};
for (const name of ['browser-results.json']) {
  const browserReport = read(name);
  assert.deepEqual(browserReport.errors, []);
  browserReport.suites.forEach(visit);
}
const browsers = [...browserCases.values()];
for (const test of browsers) { assert.equal(test.status, 'passed', test.title); assert.equal(test.outcome, 'expected', test.title); }
assert.equal(browsers.length, 13);
const visuals = read('after-metrics.json');
assert.equal(visuals.length, 14);
for (const state of visuals) {
  assert.ok(state.scrollWidth <= state.width + 1);
  assert.deepEqual(state.errors, []);
  assert.ok(state.minimumContrast >= 4.5);
  assert.ok(state.minimumTargetHeight >= 43.5);
  for (const portrait of state.portraits) assert.ok(Math.abs(portrait.actual - portrait.drawn) < 0.05);
}
const canonical = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_solarsystem.js'));
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js'));
assert.ok(canonical.equals(mirror));
new vm.Script(canonical.toString('utf8'));
const source = canonical.toString('utf8');
const blocks = [
  source.slice(source.indexOf('          function buildSolarPlanetComparison('), source.indexOf('          function openSolarScaleWalk(')),
  source.slice(source.indexOf('            !d.orreryMode && d.showVisualCompare ?'), source.indexOf('            !d.orreryMode && d.showScaleWalk ?')),
  source.split(/\r?\n/).filter((line) => /compareEvidenceSaveRef|solar-comparison-workbench|solar-compare-table-wrap\{/.test(line)).join('\n'),
];
assert.ok(blocks.every((block) => block.length && !/[^\r\n][ \t]+\r?$/m.test(block)), 'scoped source trailing whitespace');
const summary = {
  startedDate: '2026-10-04', completedDate: '2026-10-05', committed: false,
  units: { passed: unitCount, files: [...units].map(([file, cases]) => ({ file, passed: cases.length })) },
  browsers: { passed: browsers.length, cases: browsers },
  visualStates: visuals.length,
  minimumEnabledTextContrast: Math.min(...visuals.map((state) => state.minimumContrast)),
  minimumControlHeight: Math.min(...visuals.map((state) => state.minimumTargetHeight)),
  overflowFree: true, runtimeErrors: 0, syntax: 'passed', scopedWhitespace: 'passed', canonicalMirrorIdentical: true,
  sourceSha256: crypto.createHash('sha256').update(canonical).digest('hex'),
};
fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
