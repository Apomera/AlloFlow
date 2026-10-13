'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../maine_sld_practice_core.js');
const data = require('../maine_sld_case_data.json');

test('supplement findings retain stable IDs and original narrative finding IDs', () => {
  const sample = { narrative: ['Original observation', { body: 'Original family report' }], evidenceSupplement: [{ id: 'instruction', title: 'Instruction record', text: 'Reported progress' }, { id: 'limits', title: 'Unknown', text: 'Further evidence needed' }] };
  const rows = core.contextRows(sample);
  assert.deepEqual(rows.map(row => row.id), ['context-0', 'context-1', 'supplement-instruction', 'supplement-limits']);
  assert.equal(rows[2].label, 'Instruction record: Reported progress');
  assert.equal(rows[3].value, '');
  sample.evidenceSupplement.reverse();
  assert.equal(core.contextRows(sample).find(row => row.id === 'supplement-instruction').label, rows[2].label);
});

test('expanded cases restore earlier worksheet work and keep new cases blank', () => {
  const oldIds = ['alex', 'alex-general-ed-adequate', 'jordan', 'marisol', 'taylor'];
  const work = Object.fromEntries(oldIds.map(id => [id, { ...core.blankCase(), findings: { 'context-0': { purpose: 'review', note: 'Original ' + id } } }]));
  const restored = core.importWorksheet({ format: 'alloflow-maine-sld-practice', schemaVersion: 1, moduleVersion: '1.1.0', activeCase: 'marisol', caseWork: work }, data);
  assert.equal(restored.activeCase, 'marisol');
  for (const id of oldIds) assert.equal(restored.byCase[id].findings['context-0'].note, 'Original ' + id);
  for (const id of ['samira', 'avery']) assert.deepEqual(restored.byCase[id], core.blankCase(data.cases.find(c => c.id === id)));
});

test('all supplement findings survive worksheet and session round trips without crossing cases', () => {
  const state = core.createState(data);
  for (const c of data.cases) {
    assert.ok(c.evidenceSupplement.length);
    for (const item of c.evidenceSupplement) state.byCase[c.id].findings['supplement-' + item.id] = { purpose: 'review', note: c.id + ' <b>literal</b> ' + item.id };
  }
  const restored = core.importWorksheet(core.exportWorksheet(state, data), data);
  for (const c of data.cases) assert.deepEqual(restored.byCase[c.id].findings, state.byCase[c.id].findings);
  const values = new Map(), storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key), removeItem: key => values.delete(key) };
  assert.equal(core.saveSession(storage, restored, data), true);
  assert.deepEqual(core.loadSession(storage, data).byCase, state.byCase);
});
