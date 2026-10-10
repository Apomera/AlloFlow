const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');

// Pure engine validation deliberately avoids the blocked Vitest/jsdom runtime.
const repo = path.resolve(__dirname, '../../..');
const out = __dirname;
const installed = true;
const source = fs.readFileSync(installed ? path.join(repo, 'stem_lab/stem_tool_perception.js') : path.join(out, 'stem_tool_perception.js'), 'utf8');
const desktop = fs.readFileSync(installed ? path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_perception.js') : path.join(out, 'desktop_stem_tool_perception.js'), 'utf8');
const before = fs.readFileSync(path.join(out, 'baseline.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const engine = code => {
  const window = { StemLab: { registerTool() {} } }; vm.runInNewContext(code, { window }, { timeout: 10000 });
  return window.StemLab.PerceptionEngine;
};
assert.equal(hash(before), '29d06320f560c7341ed4be4eb7b1b5014091c21f72341cfbf78f30b73d50d2e2', 'Unexpected inspector-layout baseline.');
new Function(source); assert.equal(desktop, source, 'Source and desktop copy must match byte for byte.');
const expectedIndex = process.argv.indexOf('--expected-source-sha');
if (expectedIndex !== -1) {
  assert.match(process.argv[expectedIndex + 1] || '', /^[a-f\d]{64}$/);
  assert.equal(hash(source), process.argv[expectedIndex + 1], 'Candidate changed from the requested SHA.');
}
const previous = engine(before), current = engine(source);
assert.equal(current.experiments.length, 7); assert.equal(json(Object.keys(current).sort()), json(Object.keys(previous).sort()), 'Engine API keys changed.');
for (const name of Object.keys(previous)) {
  assert.equal(typeof current[name], typeof previous[name], 'Engine API type changed: ' + name);
  if (typeof previous[name] === 'function') { assert.equal(current[name].length, previous[name].length, 'Engine API signature changed: ' + name); assert.equal(current[name].toString(), previous[name].toString(), 'Engine implementation changed: ' + name); }
}
assert.equal(json(previous.experiments), json(current.experiments), 'Experiment metadata changed.');
assert.equal(json(previous.matching), json(current.matching), 'Matching metadata changed.');
assert.equal(json(previous.defaults()), json(current.defaults()), 'Default model changed.');
let baselineSceneCases = 0;
for (const meta of previous.experiments) for (const edge of ['min', 'value', 'max']) for (const context of [true, false]) for (const reveal of [true, false]) {
  const model = { context, reveal, cue: 'front', prediction: meta.choices[0], note: 'Baseline preserved', matching: false };
  meta.controls.forEach(control => { model[control.key] = control[edge]; }); const label = [meta.id, edge, context, reveal].join('/');
  assert.equal(json(previous.normalizeModel(meta.id, model)), json(current.normalizeModel(meta.id, model)), 'Normalized model changed: ' + label);
  assert.equal(json(previous.scene(meta.id, model)), json(current.scene(meta.id, model)), 'Scene geometry changed: ' + label);
  assert.equal(json(previous.measurements(meta.id, model)), json(current.measurements(meta.id, model)), 'Measurement model changed: ' + label);
  baselineSceneCases++;
}
assert.equal(baselineSceneCases, 84);
const addedLabels = {"camera_viewing_tips":"Viewing tips","camera_crop_reminder":"You are viewing part of the drawing. Fit the whole drawing before comparing impressions."};
const beforeEnglish = JSON.parse(fs.readFileSync(path.join(out, 'english-before.json'), 'utf8'));
const english = JSON.parse(fs.readFileSync(installed ? path.join(repo, 'dev-tools/i18n/stem_perception_en.json') : path.join(out, 'stem_perception_en.json'), 'utf8'));
assert.equal(Object.keys(beforeEnglish).length, 586); assert.equal(Object.keys(english).length, 588); assert.equal(Object.keys(addedLabels).length, 2);
for (const key of Object.keys(addedLabels)) assert(!Object.hasOwn(beforeEnglish, key), 'New label already exists: ' + key);
assert.deepEqual(english, { ...beforeEnglish, ...addedLabels }, 'Only the two approved inspector labels may change.');
for (const [file, name] of [['ui_strings.js', 'ui_strings.js'], ['desktop/web-app/public/ui_strings.js', 'desktop_ui_strings.js']]) assert.deepEqual(JSON.parse(fs.readFileSync(installed ? path.join(repo, file) : path.join(out, name), 'utf8')).stem.perception, english, 'Catalog parity failed: ' + file);

const result = { sourceSHA256: hash(source), desktopSHA256: hash(desktop), baselineSHA256: hash(before), compile: true,
  catalogParity: true, englishKeys: Object.keys(english).length, baselineSceneCases, engineAPIUnchanged: true, engineImplementationUnchanged: true,
  baselineMetadataUnchanged: true, baselineModelsAndMeasurementsUnchanged: true };
fs.writeFileSync(path.join(out, 'regression-validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
