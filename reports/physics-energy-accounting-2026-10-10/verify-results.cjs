const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../..');
const bytes = name => fs.readFileSync(path.join(repo, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = buffer => (buffer[0] === 255 && buffer[1] === 254 ? buffer.subarray(2).toString('utf16le') : buffer.toString('utf8')).replace(/^\uFEFF/, '');
const prefix = value => text(value).replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics', {")[0];
const inputs = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation-inputs.json'), 'utf8'));
const source = bytes('stem_lab/stem_tool_physics.js');
const mirror = bytes('desktop/web-app/public/stem_lab/stem_tool_physics.js');
const baseline = fs.readFileSync(path.join(__dirname, 'source-before-accounting.js'));
assert.equal(hash(baseline), 'e91d73525e07eb90f66ade539610f31847a0dcdba21d69c9434aab27dc694e7f');
assert.ok(source.equals(mirror), 'Source and desktop mirror differ');
assert.ok(source.equals(fs.readFileSync(path.join(__dirname, 'validated-source.js'))), 'Source changed after browser validation');
assert.equal(hash(source), inputs.sourceSha256);
assert.equal(hash(mirror), inputs.mirrorSha256);
assert.equal(hash(baseline), inputs.baselineSha256);
assert.equal(prefix(source), prefix(baseline), 'Numerical source changed');
assert.equal(hash(prefix(source)), inputs.numericalPrefixSha256);
for (const spec of inputs.specs) assert.equal(hash(bytes(spec.file)), spec.sha256, 'Test changed after snapshot: ' + spec.file);
assert.equal(inputs.expectedBrowserTests, 23);
assert.equal(inputs.expectedUnitTests, 356);
assert.equal(inputs.expectedUnitFiles, 21);
assert.equal(inputs.expectedPngs, 36);
const units = text(fs.readFileSync(path.join(__dirname, 'unit.log')));
assert.match(units, /Test Files\s+21 passed \(21\)/);
assert.match(units, /Tests\s+356 passed \(356\)/);
const browser = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-results.json'), 'utf8'));
const outcomes = { expected: browser.stats.expected, unexpected: browser.stats.unexpected, flaky: browser.stats.flaky, skipped: browser.stats.skipped };
assert.deepEqual(outcomes, { expected: 23, unexpected: 0, flaky: 0, skipped: 0 });
const completed = [];
function visit(suite) {
  for (const spec of suite.specs || []) for (const test of spec.tests || []) {
    assert.equal(test.status, 'expected');
    assert.equal(test.results.length, 1, 'Unexpected retry');
    assert.equal(test.results[0].status, 'passed');
    completed.push({ title: spec.title, file: spec.file || suite.file, durationMs: test.results[0].duration });
  }
  for (const child of suite.suites || []) visit(child);
}
browser.suites.forEach(visit);
assert.equal(completed.length, 23);
assert.equal(new Set(completed.map(test => test.file + ':' + test.title)).size, 23);
for (const spec of inputs.specs) {
  const wanted = path.basename(spec.file);
  assert.equal(completed.filter(test => path.basename(test.file) === wanted).length, spec.expectedTests, 'Missing complete cases: ' + wanted);
}
const visualReports = [], pngs = [];
for (const name of ['energy-accounting-visual-results.json', 'velocity-visual-results.json', 'graph-visual-results.json']) {
  const visuals = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  assert.deepEqual(visuals.errors, []);
  assert.equal(visuals.captures.length, 12);
  let witnessCount = 0;
  const layouts = new Set();
  for (const capture of visuals.captures) {
    assert.ok([1100, 375, 320].includes(capture.width));
    assert.ok(['default', 'dark', 'contrast'].includes(capture.theme));
    layouts.add([capture.width, capture.theme, capture.phase || capture.graph || capture.kind || capture.view].join(':'));
    assert.ok(capture.pixels.width > 0 && capture.pixels.height > 0);
    if (name === 'energy-accounting-visual-results.json') {
      assert.equal(capture.measured.bars.length, 3);
      assert.deepEqual(capture.measured.bars.map(bar => bar.field), ['ke', 'pe', 'dragLoss']);
      assert.ok(capture.measured.bars.every(bar => Number.isFinite(bar.width) && bar.width >= 0 && bar.width <= 300 + 1e-10));
      assert.equal(capture.pixels.witnesses.length, capture.measured.bars.filter(bar => bar.value > 0).length);
      assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 8));
      assert.ok(capture.measured.texts.length > 6);
      assert.ok(capture.measured.texts.every(item => item.font >= 12));
      assert.ok(capture.measured.pageWidth <= capture.measured.viewportWidth + 1);
      assert.ok(['apex', 'impact'].includes(capture.phase));
    } else if (name === 'velocity-visual-results.json') {
      assert.equal(capture.measured.scaleCircle.radius, 70);
      assert.equal(capture.pixels.witnesses.length, capture.measured.vectors.length);
      assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 8));
      assert.ok(capture.measured.pageWidth <= capture.measured.viewportWidth + 1);
    } else {
      assert.equal(capture.measured.cursor.dash, 'none');
      assert.equal(capture.measured.outline.width, 3);
      assert.equal(capture.pixels.witnesses.length, 4);
      assert.ok(capture.pixels.witnesses.every(witness => witness.error <= 5));
    }
    for (const witness of capture.pixels.witnesses) {
      assert.ok(Number.isFinite(witness.error) && witness.error >= 0);
      assert.ok(witness.x >= 0 && witness.x < capture.pixels.width);
      assert.ok(witness.y >= 0 && witness.y < capture.pixels.height);
      assert.equal(witness.actual.length, 3); assert.equal(witness.wanted.length, 3);
    }
    witnessCount += capture.pixels.witnesses.length;
    const png = fs.readFileSync(path.join(__dirname, capture.file));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(png.readUInt32BE(16), capture.pixels.width);
    assert.equal(png.readUInt32BE(20), capture.pixels.height);
    pngs.push({ file: capture.file, sha256: hash(png), width: capture.pixels.width, height: capture.pixels.height });
  }
  assert.equal(layouts.size, 12, 'A visual layout was duplicated: ' + name);
  visualReports.push({ file: name, positiveCaptures: visuals.captures.length, savedPixelWitnesses: witnessCount });
}
assert.equal(pngs.length, 36);
assert.equal(new Set(pngs.map(png => png.file)).size, 36);
const result = {
  sourceSha256: hash(source), mirrorSha256: hash(mirror), numericalPrefixUnchanged: true,
  specs: inputs.specs, unitTests: 356, unitFiles: 21, browserOutcomes: outcomes, browserTests: completed, visualReports, pngs,
  scope: 'Checks complete test outcomes, no retries, source and test identity, native geometry records, saved pixel-witness bounds, PNG dimensions, and capture hashes. Browser specs independently decode saved PNGs; this script does not decode them again.',
};
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ source: result.sourceSha256, unitTests: result.unitTests, browserTests: completed.length, positivePngs: pngs.length, numericalPrefixUnchanged: true }));
