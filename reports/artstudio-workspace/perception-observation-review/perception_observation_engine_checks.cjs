'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sourcePath = process.argv[2] || path.join(repo, 'stem_lab/stem_tool_perception.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const window = { StemLab: { registerTool() {} } };
vm.runInNewContext(source, { window, console }, { filename: sourcePath });
const engine = window.StemLab.PerceptionEngine;
assert.equal(typeof engine.planObservationReview, 'function', 'Observation review planner exists');
const json = value => JSON.parse(JSON.stringify(value));
const clone = json;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
const matching = ['brightness', 'ebbinghaus', 'mullerLyer'];
const results = [];
function check(name, run) { run(); results.push(name); }
function saved(id, experiment, changes = {}) {
  const meta = engine.experiments.find(item => item.id === experiment);
  return { id, experiment, model: engine.normalizeModel(experiment, {
    context: false, reveal: false, prediction: meta.choices[1], note: 'Saved note\n<em>literal</em>',
    ...Object.fromEntries(meta.controls.map(control => [control.key, control.max])), ...changes,
  }), date: '2026-10-06T15:47:12.000Z' };
}
function seeded(record) { return engine.normalize({
  experiment: 'moire', expanded: true,
  models: { moire: { angle: 13.2, note: 'PRIVATE DRAFT' } },
  comparison: { experiment: 'necker', model: { cue: 'front', note: 'PRIVATE PIN' } },
  studies: [record],
}); }
for (const id of IDS) for (const reveal of [false, true]) check(id + ' review preserves saved reveal=' + reveal, () => {
  const raw = seeded(saved('saved-' + id, id, { reveal }));
  const before = clone(raw), result = engine.planObservationReview(raw, 'saved-' + id);
  assert.deepEqual(json(result), { status: 'ready', record: before.studies[0], identity: JSON.stringify(before.studies[0]) });
  assert.notEqual(result.record, raw.studies[0]); assert.notEqual(result.record.model, raw.studies[0].model);
  assert.deepEqual(json(engine.scene(id, result.record.model)), json(engine.scene(id, before.studies[0].model)));
  assert.deepEqual(json(raw), before);
  const second = engine.planObservationReview(raw, 'saved-' + id);
  assert.notEqual(result.record, second.record); assert.notEqual(result.record.model, second.record.model);
  result.record.model.note = 'Mutated result'; result.record.date = 'changed';
  assert.deepEqual(json(raw), before); assert.deepEqual(json(second.record), before.studies[0]);
});
for (const id of matching) for (const reveal of [false, true]) check(id + ' matching model preserves reveal=' + reveal, () => {
  const config = engine.matching[id], raw = seeded(saved('match-' + id, id, { matching: true, swap: true, reveal, matchValue: config.max - 3 }));
  const plan = engine.planObservationReview(raw, 'match-' + id);
  assert.equal(plan.status, 'ready'); assert.equal(plan.record.model.matching, true); assert.equal(plan.record.model.swap, true);
  assert.equal(plan.record.model.matchValue, config.max - 3); assert.equal(plan.record.model.reveal, reveal);
  assert.deepEqual(json(engine.measurements(id, plan.record.model)), json(engine.measurements(id, raw.studies[0].model)));
});
check('Normalized field bounds and 500-character notes', () => {
  const raw = { studies: [{ id: 'raw', experiment: 'moire', model: { angle: 13.76, spacing: 999, note: 'x'.repeat(501), prediction: 'Both', reveal: 'true', extra: 'discard' }, date: 'date'.repeat(15) }] };
  const plan = engine.planObservationReview(raw, 'raw');
  assert.equal(plan.status, 'ready'); assert.equal(plan.record.model.angle, 13.8); assert.equal(plan.record.model.spacing, 24);
  assert.equal(plan.record.model.note.length, 500); assert.equal(plan.record.date.length, 40); assert.equal(plan.record.model.reveal, false);
  assert.equal(Object.hasOwn(plan.record.model, 'extra'), false);
  assert.deepEqual(json(plan.record), json(engine.normalize(raw).studies[0]));
});
const state = seeded(saved('exact', 'ponzo'));
for (const id of [null, undefined, '', ' exact', 'exact ', 'EXACT', 1, true, false, {}, [], new String('exact')]) check('Reject nonexact ID ' + String(id), () => {
  assert.deepEqual(json(engine.planObservationReview(state, id)), { status: 'missing' });
});
for (const raw of [null, undefined, 1, true, '', [], {}, { studies: 'records' }, { studies: [{ id: 'exact', experiment: 'unknown' }] }]) check('Reject missing/nonrecord data ' + JSON.stringify(raw), () => {
  assert.deepEqual(json(engine.planObservationReview(raw, 'exact')), { status: 'missing' });
});
for (const id of matching) check('Repeated ' + id + ' records use study review', () => {
  const config = engine.matching[id];
  const record = saved('repeat-' + id, id, { matching: true }); record.repeat = { id: 'study-' + id, trial: 2, startValue: config.min };
  assert.deepEqual(json(engine.planObservationReview(seeded(record), record.id)), { status: 'repeat' });
});
check('Malformed repeat metadata does not hide an ordinary observation', () => {
  const record = saved('ordinary', 'ponzo'); record.repeat = { id: 'unavailable', trial: 1, startValue: 10 };
  const plan = engine.planObservationReview(seeded(record), 'ordinary'); assert.equal(plan.status, 'ready'); assert.equal(Object.hasOwn(plan.record, 'repeat'), false);
});
check('Fingerprint ignores live experiment, drafts, expanded layout and pin', () => {
  const raw = seeded(saved('fingerprint', 'cafeWall')), initial = engine.planObservationReview(raw, 'fingerprint').identity;
  const changed = clone(raw); changed.experiment = 'ponzo'; changed.expanded = false;
  changed.models.cafeWall.offset = 0; changed.models.moire.note = 'Different draft'; changed.comparison = null;
  assert.equal(engine.planObservationReview(changed, 'fingerprint').identity, initial);
});
check('Fingerprint ignores notebook position and unrelated records', () => {
  const record = saved('fingerprint', 'necker'), first = seeded(record), second = clone(first);
  second.studies.unshift(saved('another', 'brightness')); second.studies.push(saved('third', 'moire'));
  assert.equal(engine.planObservationReview(first, record.id).identity, engine.planObservationReview(second, record.id).identity);
  second.studies.reverse(); assert.equal(engine.planObservationReview(first, record.id).identity, engine.planObservationReview(second, record.id).identity);
});
for (const [field, value] of [['note', 'New note'], ['prediction', 'Same'], ['convergence', 0], ['upperY', 200], ['context', true], ['reveal', true]]) check('Fingerprint detects saved ' + field, () => {
  const raw = seeded(saved('fingerprint', 'ponzo')), first = engine.planObservationReview(raw, 'fingerprint').identity;
  raw.studies[0].model[field] = value; assert.notEqual(engine.planObservationReview(raw, 'fingerprint').identity, first);
});
check('Fingerprint detects saved date, experiment and ID', () => {
  const raw = seeded(saved('fingerprint', 'ponzo')), first = engine.planObservationReview(raw, 'fingerprint').identity;
  for (const [field, value] of [['date', '2026-10-06T16:00:00.000Z'], ['experiment', 'cafeWall'], ['id', 'renamed']]) {
    const changed = clone(raw); changed.studies[0][field] = value;
    assert.notEqual(engine.planObservationReview(changed, field === 'id' ? value : 'fingerprint').identity, first);
  }
});
check('Normalized duplicate IDs resolve distinct saved observations', () => {
  const raw = { studies: [saved('duplicate', 'brightness'), saved('duplicate', 'ponzo')] };
  assert.equal(engine.planObservationReview(raw, 'duplicate').record.experiment, 'brightness');
  assert.equal(engine.planObservationReview(raw, 'duplicate-2').record.experiment, 'ponzo');
});
check('Whitespace IDs are matched against normalized record IDs exactly', () => {
  const raw = { studies: [saved(' exact ', 'cafeWall')] };
  assert.equal(engine.planObservationReview(raw, 'exact').status, 'ready');
  assert.deepEqual(json(engine.planObservationReview(raw, ' exact ')), { status: 'missing' });
});
check('Only retained latest 24 observations can be reviewed', () => {
  const raw = { studies: Array.from({ length: 25 }, (_, i) => saved('retained-' + i, IDS[i % IDS.length])) };
  assert.deepEqual(json(engine.planObservationReview(raw, 'retained-0')), { status: 'missing' });
  assert.equal(engine.planObservationReview(raw, 'retained-1').status, 'ready');
  assert.equal(engine.planObservationReview(raw, 'retained-24').status, 'ready');
});
const report = { sourcePath, sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), checks: results.length, failures: [], results };
const output = process.argv[3]; if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
