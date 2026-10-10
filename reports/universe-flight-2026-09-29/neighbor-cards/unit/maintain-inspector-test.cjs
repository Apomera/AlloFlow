const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const renderer = fs.readFileSync(path.join(root, 'stem_lab/universe_flight_scene.js'), 'utf8');
const window = {};
vm.runInNewContext(renderer, { window, Math });
const api = window.UniverseFlight;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'stem_lab/assets/universe-flight/highlights/manifest.json'), 'utf8'));
const catalogCounts = Object.fromEntries(['neighborhood', 'galaxy', 'cosmic'].map(region => [region, api.landmarks(region).length]));
const landmarkCount = Object.values(catalogCounts).reduce((sum, count) => sum + count, 0);
const authoredViews = api.flybys().flatMap(route => route.highlights.map(view => ({ routeId: route.id, highlightId: view.id, targetId: view.targetId, region: route.region })));
assert.equal(landmarkCount, 21);
assert.equal(authoredViews.length, 18);
assert.equal(manifest.views.length, 18);
for (const authored of authoredViews) {
  const match = manifest.views.find(view => view.routeId === authored.routeId && view.highlightId === authored.highlightId);
  assert.ok(match);
  assert.equal(match.snapshot.targetId, authored.targetId);
  assert.equal(match.snapshot.settings.region, authored.region);
}
const file = path.join(root, 'tests/universe_flight_inspector.test.js');
const before = fs.readFileSync(file, 'utf8');
const baseline = path.join(__dirname, 'baseline-inspector.test.js');
assert.ok(!fs.existsSync(baseline), 'Preserve the original baseline; do not rerun.');
fs.writeFileSync(baseline, before);
const edits = [
  ['all eighteen landmarks', 'all twenty-one landmarks'],
  ['expect(count).toBe(18);', 'expect(count).toBe(21);'],
  ['all twelve authored scenic previews', 'all eighteen authored scenic previews'],
  ['expect(count).toBe(12);', 'expect(count).toBe(18);'],
];
let after = before;
for (const [find, replacement] of edits) {
  assert.equal(after.split(find).length - 1, 1, 'Expected one exact match: ' + find);
  after = after.replace(find, replacement);
}
fs.writeFileSync(file, after);
const evidence = { catalogCounts, landmarkCount, authoredViews: authoredViews.length, manifestViews: manifest.views.length, rendererSha256: hash(renderer), testBeforeSha256: hash(before), testAfterSha256: hash(after), edits };
fs.writeFileSync(path.join(__dirname, 'inspector-counts.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
