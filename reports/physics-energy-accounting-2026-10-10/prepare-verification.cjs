const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../..');
const bytes = name => fs.readFileSync(path.join(repo, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = buffer => (buffer[0] === 255 && buffer[1] === 254 ? buffer.subarray(2).toString('utf16le') : buffer.toString('utf8')).replace(/^\uFEFF/, '');
const prefix = value => text(value).replace(/\r\n/g, '\n').split("window.StemLab.registerTool('physics', {")[0];
const source = bytes('stem_lab/stem_tool_physics.js');
const mirror = bytes('desktop/web-app/public/stem_lab/stem_tool_physics.js');
const baseline = fs.readFileSync(path.join(__dirname, 'source-before-accounting.js'));
assert.equal(hash(baseline), 'e91d73525e07eb90f66ade539610f31847a0dcdba21d69c9434aab27dc694e7f');
assert.ok(source.equals(mirror), 'Source and desktop mirror differ');
assert.equal(prefix(source), prefix(baseline), 'Numerical source changed');
const specs = [
  ['tests/e2e/physics-energy-accounting.spec.ts', 3],
  ['tests/e2e/physics-energy-visuals.spec.ts', 9],
  ['tests/e2e/physics-analysis-workspace.spec.ts', 4],
  ['tests/e2e/physics-velocity-diagram.spec.ts', 3],
  ['tests/e2e/physics-graph-keyboard.spec.ts', 3],
].map(([file, expectedTests]) => ({ file, expectedTests, sha256: hash(bytes(file)) }));
const result = {
  sourceSha256: hash(source), mirrorSha256: hash(mirror), baselineSha256: hash(baseline),
  numericalPrefixSha256: hash(prefix(source)), numericalPrefixUnchanged: true,
  specs, expectedBrowserTests: 22, expectedUnitTests: 356, expectedUnitFiles: 21, expectedPngs: 36,
};
const sourcePath = path.join(__dirname, 'validated-source.js');
const manifestPath = path.join(__dirname, 'validation-inputs.json');
if (fs.existsSync(sourcePath)) assert.ok(source.equals(fs.readFileSync(sourcePath)), 'A different validation source is already saved; preserve its evidence before replacing it');
if (fs.existsSync(manifestPath)) assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), result, 'Validation inputs changed after the snapshot');
fs.writeFileSync(sourcePath, source);
fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
