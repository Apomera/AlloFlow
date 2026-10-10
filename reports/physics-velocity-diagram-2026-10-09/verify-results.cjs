const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../..');
const bytes = name => fs.readFileSync(path.join(repo, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = buffer => (buffer[0] === 255 && buffer[1] === 254 ? buffer.subarray(2).toString('utf16le') : buffer.toString('utf8')).replace(/^\uFEFF/, '');
const main = bytes('stem_lab/stem_tool_physics.js');
const mirror = bytes('desktop/web-app/public/stem_lab/stem_tool_physics.js');
const baseline = fs.readFileSync(path.join(__dirname, 'source-before-diagram.js'));
assert.equal(hash(baseline), '757ec62cdb8a924e9834991dcb13ccc2eb2ac9181344df4a6665ba5c8dd79715');
assert.ok(main.equals(mirror), 'Source and desktop mirror differ');
assert.ok(main.equals(fs.readFileSync(path.join(__dirname, 'validated-source.js'))), 'Source changed after browser validation');
const prefix = value => text(value).replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics', {")[0];
assert.equal(prefix(main), prefix(baseline), 'Numerical source changed');
const units = text(fs.readFileSync(path.join(__dirname, 'unit.log')));
assert.match(units, /Test Files\s+21 passed \(21\)/);
assert.match(units, /Tests\s+356 passed \(356\)/);
const initialSpecSha256 = hash(fs.readFileSync(path.join(__dirname, 'initial-velocity-diagram.spec.ts')));
assert.equal(initialSpecSha256, '956be3bba8495d35777be1a5dadd9e7f3723508c1b0ac143e919cfd7cddbd4a1');
assert.equal(hash(bytes('tests/e2e/physics-velocity-diagram.spec.ts')), '8f3a5419bdea74050ea868866a32564b21a2d597397ef5735d9c5bde7681a267');
const completedByTitle = new Map();
const browserRuns = [];
for (const [resultFile, expectedCount] of [['browser-results.json', 15], ['scale-sampling-results.json', 1]]) {
  const browser = JSON.parse(fs.readFileSync(path.join(__dirname, resultFile), 'utf8'));
  const outcomes = { expected: browser.stats.expected, unexpected: browser.stats.unexpected, flaky: browser.stats.flaky, skipped: browser.stats.skipped };
  assert.deepEqual(outcomes, { expected: expectedCount, unexpected: 0, flaky: 0, skipped: 0 });
  const runCases = [];
  function visit(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      assert.equal(test.status, 'expected');
      assert.equal(test.results.length, 1, 'Unexpected retry');
      assert.equal(test.results[0].status, 'passed');
      const completed = { title: spec.title, file: spec.file || suite.file, durationMs: test.results[0].duration, resultFile };
      runCases.push(completed);
      completedByTitle.set(spec.title, completed);
    }
    for (const child of suite.suites || []) visit(child);
  }
  browser.suites.forEach(visit);
  assert.equal(runCases.length, expectedCount);
  if (resultFile === 'scale-sampling-results.json') {
    assert.equal(runCases[0].title, 'zero, leftward, downward and tiny velocity components retain exact geometry and visible numeric explanations');
  }
  browserRuns.push({ resultFile, outcomes, cases: runCases });
}
const completed = [...completedByTitle.values()];
assert.equal(completed.length, 15);
const visualReports = [];
const pngs = [];
for (const name of ['velocity-visual-results.json', 'graph-visual-results.json']) {
  const visuals = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  assert.deepEqual(visuals.errors, []);
  assert.equal(visuals.captures.length, 12);
  let witnesses = 0;
  for (const capture of visuals.captures) {
    if (name === 'velocity-visual-results.json') {
      assert.equal(capture.measured.scaleCircle.radius, 70);
      assert.equal(capture.pixels.witnesses.length, capture.measured.vectors.length);
      assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 8));
    } else {
      assert.equal(capture.measured.cursor.dash, 'none');
      assert.equal(capture.measured.outline.width, 3);
      assert.equal(capture.pixels.witnesses.length, 4);
      assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 5));
    }
    witnesses += capture.pixels.witnesses.length;
    const png = fs.readFileSync(path.join(__dirname, capture.file));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    pngs.push({ file: capture.file, sha256: hash(png), width: capture.pixels.width, height: capture.pixels.height });
  }
  visualReports.push({ file: name, positiveCaptures: visuals.captures.length, savedPixelWitnesses: witnesses });
}
assert.equal(pngs.length, 24);
assert.equal(new Set(pngs.map(png => png.file)).size, 24);
const result = {
  sourceSha256: hash(main), mirrorSha256: hash(mirror), numericalPrefixUnchanged: true,
  initialSpecSha256,
  specSha256: hash(bytes('tests/e2e/physics-velocity-diagram.spec.ts')),
  unitTests: 356, browserRuns, browserTests: completed, visualReports, pngs,
  scope: 'Checks complete test outcomes, no retries, source identity, native geometry and saved pixel-witness records, and capture hashes. The browser specs independently decode saved PNGs; this script does not decode them again.',
};
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ source: result.sourceSha256, unitTests: result.unitTests, browserTests: completed.length, positivePngs: pngs.length, numericalPrefixUnchanged: true }));
