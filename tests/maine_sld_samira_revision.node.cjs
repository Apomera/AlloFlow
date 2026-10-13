'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../maine_sld_practice_core.js');
const source = require('../maine_sld_case_data.json');

function fixture() {
  const data = JSON.parse(JSON.stringify(source));
  const samira = data.cases.find(c => c.id === 'samira');
  samira.completeRecord = { version: '1.0.0' };
  samira.previousRecord = {
    version: 'excerpt-1.2.1',
    narrative: ['Earlier Samira language evidence.', 'Earlier Samira reading observation.'],
    evidenceSupplement: [{ id: 'language', title: 'Earlier language review', text: 'Earlier language context.' }],
    extraScoreRows: [{ id: 'old-samira-score', test: 'Earlier probe', label: 'Earlier reading score', value: 7, scaleId: 'raw' }]
  };
  samira.narrative = ['Revised complete-record Samira overview.'];
  samira.evidenceSupplement = [{ id: 'S1', title: 'S1', text: 'Complete source record.' }];
  samira.extraScoreRows = [{ id: 'samira-score', test: 'Fictional processing assessment', label: 'New score', value: 79, scaleId: 'standard' }];
  data.metadata.compatibleWorksheetVersions = [...new Set([...(data.metadata.compatibleWorksheetVersions || []), '1.2.1'])];
  return data;
}

function priorWork(data) {
  const work = core.blankCase();
  work.findings['context-0'] = { purpose: 'complicating', note: 'My original language interpretation.' };
  work.findings['supplement-language'] = { purpose: 'review', note: 'My original evidence request.' };
  work.findings['old-samira-score'] = { purpose: 'supporting', note: 'Original probe note.' };
  for (let i = 1; i <= 9; i += 1) work.responses['Q' + i] = { answer: [5, 6].includes(i) ? '' : i === 9 ? 'more' : 'no', note: 'Original Q' + i + ' reasoning.' };
  for (const key of core.REFLECTIONS) work.reflections[key] = 'Original ' + key + ' reflection.';
  for (const check of data.knowledgeCheck) work.checkAnswers[check.id] = check.correctIndex;
  work.checkSubmitted = true;
  work.debriefRevealed = true;
  return work;
}

function transfer(data, work) {
  const cases = core.createState(data).byCase;
  cases.samira = work;
  cases.alex.responses.Q8 = { answer: 'more', note: 'Keep Alex reasoning.' };
  return { format: 'alloflow-maine-sld-practice', schemaVersion: 1, moduleVersion: '1.2.1', activeCase: 'samira', caseWork: cases };
}

test('new complete-record Samira work is edition-stamped and old empty work stays quiet', () => {
  const data = fixture(), samira = data.cases.find(c => c.id === 'samira');
  assert.equal(core.createState(data).byCase.samira.recordVersion, '1.0.0');
  assert.equal(core.blankCase(samira).recordVersion, '1.0.0');
  assert.equal(core.blankCase().recordVersion, undefined);
  const restored = core.importWorksheet(transfer(data, core.blankCase()), data);
  assert.deepEqual(restored.byCase.samira, core.blankCase(samira));
  assert.equal(restored.byCase.samira.priorRecordWork, undefined);
});

test('old Samira reasoning and labels are archived without attaching to the revised case', () => {
  const data = fixture(), old = priorWork(data), restored = core.importWorksheet(transfer(data, old), data);
  const current = restored.byCase.samira, archived = current.priorRecordWork;
  assert.equal(current.recordVersion, '1.0.0');
  assert.deepEqual(current.findings, {});
  assert.deepEqual(current.responses, core.blankCase().responses);
  assert.deepEqual(current.reflections, core.blankCase().reflections);
  assert.equal(current.debriefRevealed, false);
  assert.equal(current.checkSubmitted, false);
  assert.equal(archived.version, 'excerpt-1.2.1');
  assert.equal(archived.findings['context-0'].label, 'Earlier Samira language evidence.');
  assert.equal(archived.findings['supplement-language'].label, 'Earlier language review: Earlier language context.');
  assert.equal(archived.findings['old-samira-score'].value, 7);
  for (const [id, finding] of Object.entries(old.findings)) {
    assert.equal(archived.findings[id].purpose, finding.purpose);
    assert.equal(archived.findings[id].note, finding.note);
  }
  assert.deepEqual(archived.responses, old.responses);
  assert.deepEqual(archived.reflections, old.reflections);
  assert.deepEqual(archived.checkAnswers, old.checkAnswers);
  assert.equal(archived.debriefRevealed, true);
  assert.equal(archived.checkSubmitted, true);
  assert.equal(restored.byCase.alex.responses.Q8.note, 'Keep Alex reasoning.');
});

test('revised Samira work and prior archive both survive repeated worksheet and session round trips', () => {
  const data = fixture(), restored = core.importWorksheet(transfer(data, priorWork(data)), data);
  restored.byCase.samira.findings['context-0'] = { purpose: 'review', note: 'Current source reasoning.' };
  restored.byCase.samira.responses.Q8 = { answer: 'yes', note: 'New complete-record rationale.' };
  restored.byCase.samira.debriefRevealed = true;
  const first = core.importWorksheet(core.exportWorksheet(restored, data), data);
  const second = core.importWorksheet(JSON.stringify(core.exportWorksheet(first, data)), data);
  assert.deepEqual(first.byCase, restored.byCase);
  assert.deepEqual(second.byCase, restored.byCase);
  assert.equal(first.byCase.samira.findings['context-0'].note, 'Current source reasoning.');
  assert.equal(first.byCase.samira.priorRecordWork.findings['context-0'].note, 'My original language interpretation.');
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key), removeItem: key => values.delete(key) };
  assert.equal(core.saveSession(storage, second, data), true);
  assert.deepEqual(core.loadSession(storage, data).byCase, restored.byCase);
  values.set(core.SESSION_KEY, JSON.stringify({ at: Date.now(), moduleVersion: '1.2.1', state: { byCase: transfer(data, priorWork(data)).caseWork } }));
  assert.equal(core.loadSession(storage, data).byCase.samira.priorRecordWork.version, 'excerpt-1.2.1');
});

test('prior archive uses trusted labels and the same bounded answer allowlist as current work', () => {
  const data = fixture(), state = core.importWorksheet(transfer(data, priorWork(data)), data);
  const prior = state.byCase.samira.priorRecordWork;
  prior.findings['context-0'].label = '<script>forged source</script>';
  prior.findings['context-0'].note = '<b>literal note</b>\u0000' + 'x'.repeat(5000);
  prior.findings['unknown'] = { purpose: 'review', note: 'not allowed' };
  prior.responses.Q99 = { answer: 'yes', note: 'not allowed' };
  prior.responses.Q8.answer = 'automatic-eligibility';
  prior.reflections.secret = 'not allowed';
  prior.secret = 'not allowed';
  prior.priorRecordWork = { secret: 'nested archive not allowed' };
  const clean = core.sanitizeState(state, data).byCase.samira.priorRecordWork;
  assert.equal(clean.findings['context-0'].label, 'Earlier Samira language evidence.');
  assert.equal(clean.findings['context-0'].note.length, 4000);
  assert.ok(clean.findings['context-0'].note.startsWith('<b>literal note</b>'));
  assert.equal(clean.findings['context-0'].note.includes('\u0000'), false);
  assert.equal(clean.findings.unknown, undefined);
  assert.equal(clean.responses.Q99, undefined);
  assert.equal(clean.responses.Q8.answer, '');
  assert.equal(clean.reflections.secret, undefined);
  assert.equal(clean.secret, undefined);
  assert.equal(clean.priorRecordWork, undefined);
});

test('current record reset explicitly removes the prior archive without disturbing other cases', () => {
  const data = fixture(), state = core.importWorksheet(transfer(data, priorWork(data)), data);
  state.byCase.samira = core.blankCase(data.cases.find(c => c.id === 'samira'));
  const clean = core.sanitizeState(state, data);
  assert.equal(clean.byCase.samira.priorRecordWork, undefined);
  assert.equal(clean.byCase.samira.recordVersion, '1.0.0');
  assert.equal(clean.byCase.alex.responses.Q8.note, 'Keep Alex reasoning.');
});
