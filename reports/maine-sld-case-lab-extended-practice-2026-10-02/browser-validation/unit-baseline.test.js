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
