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
const baseline = fs.readFileSync(path.join(__dirname, 'source-before-graphs.js'));
assert.equal(hash(baseline), '862666ca23a82fa5d15b73917b011fa9eb157554ac3d76302a4cb4d4a051abe0');
assert.ok(main.equals(mirror), 'Source and desktop mirror differ');
assert.ok(main.equals(fs.readFileSync(path.join(__dirname, 'validated-source.js'))), 'Source changed after browser validation');
const prefix = value => text(value).replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics', {")[0];
assert.equal(prefix(main), prefix(baseline), 'Numerical source changed');
const units = text(fs.readFileSync(path.join(__dirname, 'unit.log')));
assert.match(units, /Test Files\s+21 passed \(21\)/);
assert.match(units, /Tests\s+356 passed \(356\)/);
const finalCases = new Map();
const browserRuns = [];
for (const [name, passed, failed] of [['browser-results.json', 18, 3], ['energy-theme-results.json', 3, 0]]) {
  const browser = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  assert.deepEqual({ expected: browser.stats.expected, unexpected: browser.stats.unexpected, flaky: browser.stats.flaky, skipped: browser.stats.skipped },
    { expected: passed, unexpected: failed, flaky: 0, skipped: 0 });
  function visit(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      assert.equal(test.results.length, 1, 'Unexpected retry');
      const successful = test.status === 'expected' && test.results[0].status === 'passed';
      if (!successful) {
        assert.equal(name, 'browser-results.json');
        assert.match(spec.file || suite.file, /physics-energy-visuals/);
        assert.match(spec.title, /^320px (default|dark|contrast) energy readings/);
      }
      finalCases.set(spec.title, { title: spec.title, resultFile: name, passed: successful, durationMs: test.results[0].duration });
    }
    for (const child of suite.suites || []) visit(child);
  }
  browser.suites.forEach(visit);
  browserRuns.push({ file: name, stats: browser.stats });
}
const completed = [...finalCases.values()];
assert.equal(completed.length, 21);
assert.ok(completed.every(test => test.passed), 'A final browser case did not pass');
assert.equal(hash(bytes('tests/e2e/physics-graph-keyboard.spec.ts')), 'f3525737884f5763167f2219f4a229c87609cd9ce4b2a461593caed4c2b7dd0f');
assert.equal(hash(bytes('tests/e2e/physics-energy-visuals.spec.ts')), '5e9196feac154b0d4e2ff9c0b97b265efe410f7252fb56fb46bb779c2247dffd');
const visuals = JSON.parse(fs.readFileSync(path.join(__dirname, 'graph-visual-results.json'), 'utf8'));
assert.deepEqual(visuals.errors, []);
assert.equal(visuals.captures.length, 12);
const pngs = visuals.captures.map(capture => {
  assert.equal(capture.measured.cursor.dash, 'none');
  assert.equal(capture.measured.outline.width, 3);
  assert.equal(capture.measured.outline.offset, 3);
  assert.equal(capture.pixels.witnesses.length, 4);
  assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 5));
  const png = fs.readFileSync(path.join(__dirname, capture.file));
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
  return { file: capture.file, sha256: hash(png), width: capture.pixels.width, height: capture.pixels.height };
});
const result = {
  sourceSha256: hash(main), mirrorSha256: hash(mirror), numericalPrefixUnchanged: true,
  specSha256: hash(bytes('tests/e2e/physics-graph-keyboard.spec.ts')),
  energySpecSha256: hash(bytes('tests/e2e/physics-energy-visuals.spec.ts')),
  unitTests: 356, browserRuns, browserTests: completed, pngs,
  scope: 'Checks complete browser outcomes, no retries, source identity, native geometry and saved PNG witness records. Does not independently decode the PNGs; the browser spec performs that check.',
};
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ source: result.sourceSha256, unitTests: result.unitTests, browserTests: completed.length, positivePngs: pngs.length, numericalPrefixUnchanged: true }));
