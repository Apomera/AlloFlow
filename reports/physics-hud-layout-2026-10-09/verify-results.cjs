const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const sourcePin = '862666ca23a82fa5d15b73917b011fa9eb157554ac3d76302a4cb4d4a051abe0';
const specPin = '132762e1ab4b0e702b18467c353bfb2ec99436cd2092c4f78632ea0fe41cfffc';
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(path.join(__dirname, file));
const json = file => JSON.parse(read(file));
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_physics.js'));
assert.equal(sha(source), sourcePin);
assert(source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_physics.js'))));
assert.equal(sha(fs.readFileSync(path.join(root, 'tests/e2e/physics-hud-layout.spec.ts'))), specPin);
new Function(source.toString('utf8'));
const before = read('source-before-hud.js'), marker = "window.StemLab.registerTool('physics',";
assert.equal(sha(before), '90d7922145112ef4c87b0f84c579cc413ed9fa5aa0b2d33a04386dcd9ceacd4b');
const sourceText = source.toString('utf8').replace(/\r\n/g, '\n'), old = before.toString('utf8').replace(/\r\n/g, '\n');
assert(sourceText.indexOf(marker) > 0 && old.indexOf(marker) > 0);
assert.equal(sourceText.slice(0, sourceText.indexOf(marker)), old.slice(0, old.indexOf(marker)));
const start = old.indexOf('                // Playback controls the simulation clock, never the step size.'), end = old.indexOf('                // Targets score the actual impact', start);
assert(start > 0 && end > start);
assert.equal(sourceText.split(old.slice(start, end)).length, 2, 'The existing simulation-step and apex block is retained once');
const units = json('unit-results.json');
assert.equal(units.success, true); assert.equal(units.numTotalTests, 356); assert.equal(units.numPassedTests, 356); assert.equal(units.numFailedTests, 0); assert.equal(units.testResults.length, 21);
const unitIdentities = result => result.testResults.flatMap(file => { assert.equal(file.status, 'passed'); return file.assertionResults.map(test => { assert.equal(test.status, 'passed'); return path.basename(file.name) + '\u0000' + test.fullName; }); }).sort();
const previousUnits = JSON.parse(fs.readFileSync(path.join(root, 'reports/physics-plot-callouts-2026-10-04/unit-results.json')));
assert.deepEqual(unitIdentities(units), unitIdentities(previousUnits));
const suites = {}, inputHashes = { 'unit-results.json': sha(read('unit-results.json')) };
for (const [file, count] of [['layout-results.json',9], ['controls-energy-results.json',14], ['hud-results.json',3], ['callout-results.json',5], ['point-results.json',6]]) {
  const result = json(file), tests = [];
  assert.deepEqual(result.errors, []); assert.equal(result.stats.expected, count);
  for (const key of ['unexpected','flaky','skipped']) assert.equal(result.stats[key], 0);
  assert.equal(result.config.workers, 1);
  function visit(suite) { for (const spec of suite.specs || []) { assert.equal(spec.ok, true); for (const test of spec.tests) { assert.equal(test.status, 'expected'); assert.equal(test.results.length, 1); const actual = test.results[0]; assert.equal(actual.status, 'passed'); assert.equal(actual.retry, 0); assert.deepEqual(actual.errors, []); tests.push(spec.file + ':' + spec.title); } } for (const child of suite.suites || []) visit(child); }
  result.suites.forEach(visit); assert.equal(tests.length, count);
  suites[file] = { passed: count, durationMs: result.stats.duration, tests }; inputHashes[file] = sha(read(file));
}
const hud = json('hud/hud-visual-results.json'); assert.deepEqual(hud.errors, []); assert.equal(hud.captures.length, 19);
inputHashes['hud/hud-visual-results.json'] = sha(read('hud/hud-visual-results.json'));
assert.equal(new Set(hud.captures.map(capture => capture.name)).size, 19);
let minimumFont = Infinity;
for (const capture of hud.captures) {
  assert(capture.documentWidth <= capture.viewportWidth + 1);
  for (const entries of [capture.header, capture.footer]) {
    assert(entries.length > 0);
    for (const [index, text] of entries.entries()) {
      assert(text.fontSize >= 11.99); minimumFont = Math.min(minimumFont, text.fontSize); assert.equal(text.maxWidth, null);
      assert(text.left >= 10 && text.right <= capture.width - 10);
      if (!text.inkPixels) {
        assert(text.text.includes('…')); assert(text.witnesses.length >= 2);
        for (const witness of text.witnesses) {
          assert(witness.alpha >= .25 && witness.alpha <= 1); assert(witness.channelError <= 4);
          assert.equal(witness.before[3], 255); assert.equal(witness.actual[3], 255);
          assert(witness.expected.every((value, channel) => Math.abs(value - witness.actual[channel]) <= 4));
        }
      }
      for (const other of entries.slice(index + 1)) assert(!(text.left < other.right && text.right > other.left && text.top < other.bottom && text.bottom > other.top));
    }
  }
  assert(capture.description && capture.telemetry.text);
}
const captureHashes = {};
for (const [directory, count] of [['hud',19], ['callouts',35], ['points',19]]) {
  const files = fs.readdirSync(path.join(__dirname, directory)).filter(file => file.endsWith('.png')).sort(); assert.equal(files.length, count);
  for (const file of files) { const bytes = read(directory + '/' + file); assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))); assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0); captureHashes[directory + '/' + file] = sha(bytes); }
}
for (const name of ['callouts','points']) { const report = json(name + '/visual-results.json'); if (name === 'callouts') { assert.equal(report.sourceSha256, sourcePin); assert.equal(report.sourceStable, true); assert.equal(report.mirrorStable, true); assert.equal(report.specStable, true); } assert.deepEqual(report.errors, []); inputHashes[name + '/visual-results.json'] = sha(read(name + '/visual-results.json')); }
const archive = json('before-selection-fixture-fix/archive-integrity.json'); assert.equal(archive.files.length, 188); assert.equal(archive.passed, 1); assert.equal(archive.failed, 1); assert.equal(archive.skipped, 1);
for (const file of archive.files) { const bytes = read('before-selection-fixture-fix/' + file.path); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
const ellipsisArchive = json('before-ellipsis-ink-fix/archive-integrity.json'); assert.equal(ellipsisArchive.files.length, 270); assert.equal(ellipsisArchive.passed, 1); assert.equal(ellipsisArchive.failed, 1); assert.equal(ellipsisArchive.skipped, 1);
for (const file of ellipsisArchive.files) { const bytes = read('before-ellipsis-ink-fix/' + file.path); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
const interruptedArchive = json('interrupted-callout-validation/archive-integrity.json'); assert.equal(interruptedArchive.status, 'incomplete'); assert.equal(interruptedArchive.files.length, 256); assert.equal(interruptedArchive.sourceSha256, sourcePin);
for (const file of interruptedArchive.files) { const bytes = read('interrupted-callout-validation/' + file.path); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
const secondInterruptedArchive = json('interrupted-callout-validation-2/archive-integrity.json'); assert.equal(secondInterruptedArchive.status, 'incomplete'); assert.equal(secondInterruptedArchive.files.length, 128); assert.equal(secondInterruptedArchive.sourceSha256, sourcePin);
for (const file of secondInterruptedArchive.files) { const bytes = read('interrupted-callout-validation-2/' + file.path); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
let additionalFailureFiles = 0;
for (const [directory, count, passed, skipped] of [['callout-timeout', 148, 0, 4], ['callout-timeout-2', 199, 0, 4], ['callout-raster-failure', 134, 0, 4], ['before-point-spacing-fix', 231, 1, 4]]) {
  const manifest = json(directory + '/archive-integrity.json'); assert.equal(manifest.files.length, count); assert.equal(manifest.passed, passed); assert.equal(manifest.failed, 1); assert.equal(manifest.skipped, skipped); assert.equal(manifest.sourceSha256, sourcePin);
  for (const file of manifest.files) { const bytes = read(directory + '/' + file.path); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256); }
  additionalFailureFiles += manifest.files.length;
}
const priorPointSpec = read('before-point-spacing-fix/physics-velocity-clarity.spec.ts').toString('utf8').replace(/\r\n/g, '\n');
const pointSpec = fs.readFileSync(path.join(root, 'tests/e2e/physics-velocity-clarity.spec.ts'));
assert.equal(pointSpec.toString('utf8').replace(/\r\n/g, '\n'), priorPointSpec.replace("expect(header(draw)).toContain('g 9.8 m/s²  ·  2 kg')", "expect(header(draw).replace(/\\s+/g, ' ')).toContain('g 9.8 m/s² · 2 kg')"));
const baseline = json('baseline-results.json'), baselineInputs = json('baseline-control-inputs.json');
assert.equal(baseline.stats.expected, 0); assert.equal(baseline.stats.unexpected, 1); assert.equal(baseline.stats.skipped, 3); assert(JSON.stringify(baseline).includes('Test timeout of 300000ms exceeded.'));
assert.equal(baselineInputs.baselineSourceSha256, sha(before)); assert.equal(baselineInputs.controlSpecSha256, sha(read('baseline-callouts.spec.ts'))); assert.equal(baselineInputs.originalSpecSha256, sha(fs.readFileSync(path.join(root, 'tests/e2e/physics-canvas-callouts.spec.ts'))));
for (const file of ['baseline-results.json', 'baseline-control-inputs.json', 'baseline-callouts.spec.ts', 'baseline.config.ts', 'callout.config.ts', 'playwright.config.ts']) inputHashes[file] = sha(read(file));
const verification = { passed: true, sourceSha256: sourcePin, hudSpecSha256: specPin, pointSpecSha256: sha(pointSpec), pointSpecOnlyNormalizesWhitespace: true, mirrorMatches: true, numericalPrefixUnchanged: true, simulationStepBlockRetainedOnce: true, unitTests: 356, unitFiles: 21, browserTests: Object.values(suites).reduce((sum,suite) => sum + suite.passed, 0), suites, hudCaptures: 19, positiveCaptures: Object.keys(captureHashes).length, minimumFont, archivedFailureFilesPreserved: archive.files.length + ellipsisArchive.files.length + additionalFailureFiles, interruptedFilesPreserved: interruptedArchive.files.length + secondInterruptedArchive.files.length, inputHashes, captureHashes };
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, unitTests: verification.unitTests, browserTests: verification.browserTests, positiveCaptures: verification.positiveCaptures, hudCaptures: verification.hudCaptures, minimumFont }, null, 2));
