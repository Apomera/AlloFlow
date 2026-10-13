import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const core = require('../maine_sld_practice_core.js');
const data = JSON.parse(readFileSync(resolve(process.cwd(), 'maine_sld_case_data.json'), 'utf8'));
const scoreId = data.scoreRows[0].id;
const empty = () => core.createState(data);
function work() {
  const state = empty();
  state.byCase.alex.findings[scoreId] = { purpose: 'supporting', note: 'Connect this finding with observed reading performance.' };
  state.byCase.alex.responses.Q8 = { answer: 'yes', note: 'Provisional SLD reasoning with a team-reviewed record.' };
  state.byCase.alex.responses.Q9 = { answer: 'more', note: 'Need the teaching adaptation and general education sufficiency record.' };
  state.byCase.alex.reflections.multilingual = 'Check language history and assessment validity.';
  return state;
}
describe('Maine SLD case lab: preservation and bounded worksheet transfer', () => {
  it('preserves evidence, written reasoning and separate Q8/Q9 positions through a worksheet round trip', () => {
    const state = work(), result = core.importWorksheet(JSON.stringify(core.exportWorksheet(state, data)), data);
    expect(result.byCase.alex.findings[scoreId]).toEqual(state.byCase.alex.findings[scoreId]);
    expect(result.byCase.alex.responses.Q8).toEqual(state.byCase.alex.responses.Q8);
    expect(result.byCase.alex.responses.Q9).toEqual(state.byCase.alex.responses.Q9);
    expect(result.byCase.alex.reflections.multilingual).toBe(state.byCase.alex.reflections.multilingual);
  });
  it('keeps changed-premise Q8 and Q9 distinct and does not reveal a debrief from a response', () => {
    const state = work();
    state.byCase.alex.responses.Q9 = { answer: 'general-ed', note: 'On the changed premise, general education adequately meets the need.' };
    const result = core.sanitizeState(state, data);
    expect(result.byCase.alex.responses.Q8.answer).toBe('yes');
    expect(result.byCase.alex.responses.Q9.answer).toBe('general-ed');
    expect(result.byCase.alex.debriefRevealed).toBe(false);
  });
  it('exports an allowlist and ignores unknown case, score, response, and prototype fields', () => {
    const state = work();
    state.secretToken = 'never include';
    state.byCase.alex.aiVerdict = 'automated eligibility';
    state.byCase.alex.findings['nonexistent-score'] = { purpose: 'supporting', note: 'invalid' };
    state.byCase.alex.responses.Q99 = { answer: 'yes', note: 'invalid' };
    state.byCase['nonexistent-case'] = state.byCase.alex;
    const transfer = core.exportWorksheet(state, data);
    for (const key of ['secretToken','aiVerdict','nonexistent-score','nonexistent-case','Q99']) expect(JSON.stringify(transfer)).not.toContain(key);
    Object.defineProperty(transfer.caseWork.alex, '__proto__', { enumerable: true, value: { polluted: true } });
    const result = core.importWorksheet(JSON.stringify(transfer), data);
    expect({}.polluted).toBeUndefined();
    expect(result.byCase.alex.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result.byCase.alex, '__proto__')).toBe(false);
  });
  it('rejects incompatible or unrelated worksheet files', () => {
    const transfer = core.exportWorksheet(work(), data);
    expect(() => core.importWorksheet('{broken', data)).toThrow();
    expect(() => core.importWorksheet({ ...transfer, format: 'alloflow-student-record' }, data)).toThrow();
    expect(() => core.importWorksheet({ ...transfer, schemaVersion: 999 }, data)).toThrow();
    expect(() => core.importWorksheet({ ...transfer, moduleVersion: '999.0.0' }, data)).toThrow();
  });
  it('bounds untrusted text without interpreting markup or accepting invalid decisions', () => {
    const state = work();
    state.byCase.alex.findings[scoreId].note = 'x'.repeat(100000);
    state.byCase.alex.responses.Q8.answer = 'automatically-eligible';
    state.byCase.alex.responses.Q9.note = '<img src=x onerror=alert(1)>';
    const result = core.sanitizeState(state, data);
    expect(result.byCase.alex.findings[scoreId].note.length).toBeLessThanOrEqual(4000);
    expect(result.byCase.alex.responses.Q8.answer).not.toBe('automatically-eligible');
    expect(result.byCase.alex.responses.Q9.note).toBe('<img src=x onerror=alert(1)>');
    state.byCase.alex.findings[scoreId].purpose = 'eligible';
    expect(core.sanitizeState(state, data).byCase.alex.findings[scoreId]).toBeUndefined();
  });
  it('keeps each case work independent when the active case changes', () => {
    const state = work(), otherId = Object.keys(state.byCase).find(id => id !== 'alex');
    expect(otherId).toBeTruthy();
    state.byCase[otherId].responses.Q8 = { answer: 'no', note: 'Adequate academic achievement must be considered.' };
    state.activeCase = otherId;
    const result = core.importWorksheet(core.exportWorksheet(state, data), data);
    expect(result.activeCase).toBe(otherId);
    expect(result.byCase.alex.responses.Q8.answer).toBe('yes');
    expect(result.byCase[otherId].responses.Q8.answer).toBe('no');
  });
});
describe('Maine SLD case lab: recoverable session and neutral links', () => {
  it('reports unavailable storage while preserving in-memory work', () => {
    const state = work();
    const storage = { setItem() { throw new DOMException('Quota reached', 'QuotaExceededError'); }, getItem() { throw new Error('blocked'); } };
    expect(core.saveSession(storage, state, data)).toBe(false);
    expect(() => core.loadSession(storage, data)).not.toThrow();
    expect(state.byCase.alex.findings[scoreId].note).toContain('observed reading');
  });
  it('restores valid session work and rejects expired, future and corrupt sessions', () => {
    const values = new Map();
    const storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) || null, removeItem: key => values.delete(key) };
    expect(core.saveSession(storage, work(), data)).toBe(true);
    expect(core.loadSession(storage, data).byCase.alex.responses.Q9.answer).toBe('more');
    const fresh = JSON.parse(values.get(core.SESSION_KEY));
    for (const at of [Date.now()-43200001, Date.now()+120000]) {
      values.set(core.SESSION_KEY, JSON.stringify({ ...fresh, at }));
      const result = core.loadSession(storage, data);
      expect(result?.byCase?.alex?.responses?.Q9?.answer || '').toBe('');
    }
    values.set(core.SESSION_KEY, '{broken');
    expect(() => core.loadSession(storage, data)).not.toThrow();
  });
  it('shares only a case route, excluding answers, notes, tokens and source-page parameters', () => {
    const url = new URL(core.shareUrl('https://alloflow-cdn.pages.dev/app/?token=secret&tool=old#note=private', 'alex', data));
    expect(url.searchParams.get('tool')).toBe('maine-sld-practice');
    expect(url.searchParams.get('case')).toBe('alex');
    expect(url.hash).toBe('');
    expect([...url.searchParams.keys()].sort()).toEqual(['case', 'tool']);
  });
});

describe('Maine SLD reviewed fixture: complete data and meaningful contrasts', () => {
  it('includes all 52 fictional age-based results without fabricated percentiles or confidence intervals', () => {
    expect(data.scoreRows).toHaveLength(52);
    expect(new Set(data.scoreRows.map(row => row.id)).size).toBe(52);
    expect(new Set(data.scoreRows.map(row => row.test))).toEqual(new Set(['WISC-V','WIAT-4']));
    const expected = { wisc_indexes:6, wisc_subtests:10, wiat_composites:11, wiat_subtests:18, wiat_components:7 };
    for (const [group,count] of Object.entries(expected)) expect(data.scoreRows.filter(row => row.groupId === group)).toHaveLength(count);
    for (const row of data.scoreRows) {
      expect(row.fictional).toBe(true);
      expect(row.comparison).toBe('age-based');
      for (const key of ['percentile','percentileRank','confidenceInterval','ci']) expect(row).not.toHaveProperty(key);
    }
  });
  it('retains the full score record for both Alex premises and isolates Jordan as a contrast', () => {
    const alex = data.cases.find(c=>c.id==='alex'), variant=data.cases.find(c=>c.id==='alex-general-ed-adequate'), jordan=data.cases.find(c=>c.id==='jordan');
    expect(new Set(alex.scoreRowIds)).toEqual(new Set(data.scoreRows.map(row=>row.id)));
    expect(variant.scoreRowIds).toEqual(alex.scoreRowIds);
    expect(jordan.scoreRowIds).toEqual([]);
    expect(core.caseRows(data,'alex')).toHaveLength(52);
    expect(core.caseRows(data,'alex-general-ed-adequate')).toHaveLength(52);
    expect(core.caseRows(data,'jordan').some(row=>row.value===78)).toBe(true);
    expect(data.academicAreas).toHaveLength(8);
    expect(new Set(data.academicAreas).size).toBe(8);
    for(const caseFixture of data.cases) {
      expect(caseFixture.tasks.length).toBeGreaterThan(0);
      expect(caseFixture.tasks.every(task=>typeof task.id==='string'&&typeof task.prompt==='string'&&task.prompt.trim().length>20)).toBe(true);
    }
  });
});

describe('Maine SLD extended practice: explicit legacy compatibility and seven-case isolation', () => {
  const originalCases = ['alex', 'alex-general-ed-adequate', 'jordan'];
  const addedCases = ['marisol', 'taylor', 'samira', 'avery'];
  function originalCaseWork() {
    const state = empty();
    originalCases.forEach((id, index) => {
      const row = core.caseRows(data, id)[0] || core.contextRows(data.cases.find(c => c.id === id))[0];
      state.byCase[id].findings[row.id] = { purpose: index === 1 ? 'complicating' : 'supporting', note: `Original ${id} finding <b>literal</b>.` };
      for (let number = 1; number <= 9; number += 1) state.byCase[id].responses['Q' + number] = { answer: number === 9 ? 'more' : [5, 6].includes(number) ? '' : 'yes', note: `Original ${id} Q${number} reasoning.` };
      for (const key of core.REFLECTIONS) state.byCase[id].reflections[key] = `Original ${id} ${key} reflection.\nSecond line.`;
      state.byCase[id].debriefRevealed = index === 1;
      for (const q of data.knowledgeCheck) state.byCase[id].checkAnswers[q.id] = q.correctIndex;
      state.byCase[id].checkSubmitted = true;
    });
    return Object.fromEntries(originalCases.map(id => [id, state.byCase[id]]));
  }
  function legacyTransfer(caseWork = originalCaseWork()) {
    return { format: 'alloflow-maine-sld-practice', schemaVersion: 1, moduleVersion: '1.0.0', activeCase: 'jordan', caseWork };
  }
  it('imports explicitly compatible original worksheets without losing notes and creates blank added cases', () => {
    expect(data.metadata.version).toBe('1.3.0');
    expect(data.metadata.caseCount).toBe(7);
    expect(data.cases).toHaveLength(data.metadata.caseCount);
    expect(data.metadata.compatibleWorksheetVersions).toContain('1.0.0');
    expect(data.metadata.compatibleWorksheetVersions).toContain('1.1.0');
    const previous = originalCaseWork(), imported = core.importWorksheet(JSON.stringify(legacyTransfer(previous)), data);
    expect(imported.activeCase).toBe('jordan');
    expect(Object.keys(imported.byCase).sort()).toEqual([...originalCases, ...addedCases].sort());
    for (const id of originalCases) expect(imported.byCase[id]).toEqual(previous[id]);
    for (const id of addedCases) expect(imported.byCase[id]).toEqual(core.blankCase(data.cases.find(c => c.id === id)));
    const current = core.exportWorksheet(imported, data);
    expect(current.moduleVersion).toBe(data.metadata.version);
    for (const id of originalCases) expect(current.caseWork[id]).toEqual(previous[id]);
    for (const id of addedCases) expect(current.caseWork[id]).toEqual(core.blankCase(data.cases.find(c => c.id === id)));
  });
  it('loads compatible sessions and saves the current version while retaining the expiry and unknown-version protections', () => {
    const values = new Map(), storage = { setItem: (key, value) => values.set(key, value), getItem: key => values.get(key) || null, removeItem: key => values.delete(key) };
    const previous = originalCaseWork(), legacy = { at: Date.now(), moduleVersion: '1.0.0', state: { version: 1, activeCase: 'jordan', activeStep: 'reasoning', byCase: previous } };
    values.set(core.SESSION_KEY, JSON.stringify(legacy));
    const loaded = core.loadSession(storage, data);
    expect(loaded.activeCase).toBe('jordan');expect(loaded.activeStep).toBe('reasoning');
    for (const id of originalCases) expect(loaded.byCase[id]).toEqual(previous[id]);
    for (const id of addedCases) expect(loaded.byCase[id]).toEqual(core.blankCase(data.cases.find(c => c.id === id)));
    expect(core.saveSession(storage, loaded, data)).toBe(true);
    expect(JSON.parse(values.get(core.SESSION_KEY)).moduleVersion).toBe(data.metadata.version);
    for (const change of [{ at: Date.now() - 43200001 }, { at: Date.now() + 120000 }, { moduleVersion: '999.0.0' }]) {
      values.set(core.SESSION_KEY, JSON.stringify({ ...legacy, ...change }));
      expect(core.loadSession(storage, data)).toEqual(empty());
      expect(values.has(core.SESSION_KEY)).toBe(false);
    }
  });
  it('uses the explicit compatibility list without accepting unrelated files or bypassing the worksheet allowlist', () => {
    const legacy = legacyTransfer();
    for (const moduleVersion of ['0.9.0', '1.0.1', '999.0.0', null, { version: '1.0.0' }]) expect(() => core.importWorksheet({ ...legacy, moduleVersion }, data)).toThrow();
    const noCompatibility = { ...data, metadata: { ...data.metadata, compatibleWorksheetVersions: [] } };
    expect(() => core.importWorksheet(legacy, noCompatibility)).toThrow();
    expect(() => core.importWorksheet({ ...legacy, format: 'unrelated' }, data)).toThrow();
    expect(() => core.importWorksheet({ ...legacy, schemaVersion: 2 }, data)).toThrow();
    legacy.caseWork.alex.aiVerdict = 'not allowed';
    legacy.caseWork.alex.findings['unknown-score'] = { purpose: 'supporting', note: 'not allowed' };
    legacy.caseWork.alex.responses.Q99 = { answer: 'yes', note: 'not allowed' };
    legacy.caseWork.unknownCase = legacy.caseWork.alex;
    const imported = core.importWorksheet(JSON.stringify(legacy), data);
    for (const key of ['aiVerdict', 'unknown-score', 'Q99', 'unknownCase']) expect(JSON.stringify(imported)).not.toContain(key);
    expect(imported.byCase.alex.findings[scoreId].note).toContain('<b>literal</b>');
  });
  it('round trips independent work in all seven cases and resets one case without clearing the others', () => {
    const state = empty();
    expect(Object.keys(state.byCase).sort()).toEqual([...originalCases, ...addedCases].sort());
    for (const fixture of data.cases) {
      const row = core.caseRows(data, fixture.id)[0] || core.contextRows(fixture)[0];
      state.byCase[fixture.id].findings[row.id] = { purpose: 'review', note: `Finding for ${fixture.id}.` };
      state.byCase[fixture.id].responses.Q8 = { answer: 'more', note: `Q8 for ${fixture.id}.` };
      state.byCase[fixture.id].responses.Q9 = { answer: 'more', note: `Q9 for ${fixture.id}.` };
      for (const key of core.REFLECTIONS) state.byCase[fixture.id].reflections[key] = `Reflection ${key} for ${fixture.id}.`;
    }
    state.activeCase = 'taylor';
    const restored = core.importWorksheet(JSON.stringify(core.exportWorksheet(state, data)), data);
    expect(restored.byCase).toEqual(state.byCase);expect(restored.activeCase).toBe('taylor');
    restored.byCase.marisol = core.blankCase();
    const afterReset = core.importWorksheet(core.exportWorksheet(restored, data), data);
    expect(afterReset.byCase.marisol).toEqual(core.blankCase());
    for (const id of [...originalCases, ...addedCases].filter(id => id !== 'marisol')) expect(afterReset.byCase[id]).toEqual(state.byCase[id]);
  });
});
