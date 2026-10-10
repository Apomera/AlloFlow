const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const expectedSourceSHA256 = '642b337db93a4c13cdbb1f95040662f3db45cf50529e5fd333938cd3de86be99';
const read = name => fs.readFileSync(path.join(__dirname, name));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(read('before.js')), expectedSourceSHA256);
const manifest = JSON.parse(read('supporting-hand-baseline.json'));
assert.equal(manifest.sourceSHA256, expectedSourceSHA256);
const fixturePath = fs.existsSync(path.join(__dirname, 'firstresponse_supporting_hand.test.js'))
  ? path.join(__dirname, 'firstresponse_supporting_hand.test.js')
  : path.resolve(__dirname, '../../tests/firstresponse_supporting_hand.test.js');
const fixtureBytes = fs.readFileSync(fixturePath);
const fixture = fixtureBytes.toString('utf8');
const inline = fixture.match(/const baseline = ([\s\S]*?);\r?\nconst fitCases/);
assert.ok(inline, 'Fixed baseline is present in the fixture');
assert.deepEqual(JSON.parse(inline[1]), manifest.cases);

const cases = {};
for (const age of ['adult', 'child', 'infant']) {
  const result = JSON.parse(read('supporting-baseline-' + age + '.json'));
  assert.equal(result.sourceSHA256, expectedSourceSHA256);
  assert.equal(result.age, age);
  assert.equal(Object.keys(result.cases).length, 18);
  for (let phase = 0; phase <= 8; phase++) for (const contrast of [false, true]) {
    const key = age + ':' + phase + ':' + contrast, value = result.cases[key];
    assert.ok(value, key);
    assert.match(value.geometry, /^[0-9a-f]{64}$/);
    assert.match(value.materials, /^[0-9a-f]{64}$/);
    for (const kind of ['nodes', 'meshes', 'geometries', 'materials']) {
      assert.ok(Number.isInteger(value.resources[kind]) && value.resources[kind] > 0, key + ':' + kind);
    }
    assert.ok(Array.isArray(value.resources.picks));
    cases[key] = value;
  }
}
assert.deepEqual(cases, manifest.cases);
assert.equal(Object.keys(cases).length, 54);
console.log(JSON.stringify({ sourceSHA256: expectedSourceSHA256, fixedCases: 54,
  fixtureSHA256: sha(fixtureBytes),
  plannedTests: { preservation: 54, camera: 36, lifecycle: 8, observation: 11, total: 109 } }, null, 2));
