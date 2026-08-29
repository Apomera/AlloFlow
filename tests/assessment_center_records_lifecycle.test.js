// Records lifecycle (2026-08-23): the imported roster survives a reload, and a
// student's records can actually be deleted.
//
//  - Finding 4: importedStudents reset to [] every session. The module now
//    persists a trimmed projection (fat fields dropped, arrays capped, live
//    rows excluded) and rehydrates it lazily.
//  - Finding 6: there was NO delete/purge affordance anywhere — the export
//    side of FERPA had confirmations, the retention side had nothing. The
//    Student Data tab now has a records manager whose options are the union
//    of every identity that HAS records (roster-only students and orphaned
//    split identities included), and the host deletes its three stores with
//    flush-inside-updater writes.
//
// All functions are EXECUTED out of the live sources, never hand-copied.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let ac;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  ac = readFileSync('student_analytics_module.js', 'utf8');
});

function braceBalanced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('unbalanced region');
}

function extractDecl(src, marker) {
  const at = src.indexOf(marker);
  expect(at, `${marker} not found`).toBeGreaterThan(-1);
  return src.slice(at, src.indexOf('{', at)) + braceBalanced(src, src.indexOf('{', at)) + ';';
}

// ── persistence helpers ──

function loadPersistenceHelpers() {
  const src3 = extractDecl(ac, 'function _acTrimStudentData(data)')
    + extractDecl(ac, 'function _acPersistableStudent(s)')
    + extractDecl(ac, 'function _acRestoreImportedStudents(raw)');
  // eslint-disable-next-line no-new-func
  return new Function(src3 + ' return { _acTrimStudentData, _acPersistableStudent, _acRestoreImportedStudents };')();
}

describe('imported roster persistence (finding 4)', () => {
  it('the projection drops the fat fields and caps the arrays', () => {
    const { _acTrimStudentData } = loadPersistenceHelpers();
    const data = {
      timeOnTask: { totalSessionMinutes: 84, perActivity: { big: 'stuff' } },
      fluencyAssessments: Array.from({ length: 40 }, (_, i) => ({
        wcpm: 50 + i, accuracy: 95, timestamp: i,
        wordData: new Array(200).fill({ word: 'x' }),
        audioBase64: 'A'.repeat(5000),
        review: { status: 'reviewed' },
      })),
      wordSoundsState: { sessionScore: 7, history: new Array(100).fill({ ok: true }), phonemeMastery: { m: 2 }, badges: new Array(50).fill('b') },
      gameCompletions: { quiz: new Array(30).fill({ score: 80 }) },
      flagSummary: { total: 1 },
    };
    const out = _acTrimStudentData(data);
    expect(out.fluencyAssessments).toHaveLength(24);
    for (const a of out.fluencyAssessments) {
      expect(a.wordData).toBeUndefined();
      expect(a.audioBase64).toBeUndefined();
      expect(a.wcpm).toBeGreaterThan(0); // the fields the sparkline reads survive
      expect(a.review).toBeDefined();
    }
    expect(out.wordSoundsState.history).toHaveLength(40);
    expect(out.wordSoundsState.badges).toHaveLength(24);
    expect(out.gameCompletions.quiz).toHaveLength(10);
    expect(out.timeOnTask).toEqual({ totalSessionMinutes: 84 });
    expect(_acTrimStudentData(null)).toBeNull();
    expect(_acTrimStudentData('nope')).toBeNull();
  });

  it('restore round-trips a projection and refuses garbage', () => {
    const { _acPersistableStudent, _acRestoreImportedStudents } = loadPersistenceHelpers();
    const student = {
      id: 's1', name: 'Falcon', filename: 'falcon.json',
      stats: { quizAvg: 82, fluencyWCPM: 61 },
      safetyFlags: [], lastSession: '2026-08-20T00:00:00Z',
      screeningHistory: [{ activity: 'orf', wcpm: 61 }],
      data: { fluencyAssessments: [{ wcpm: 61, wordData: [1, 2, 3] }] },
    };
    const restored = _acRestoreImportedStudents(JSON.stringify([_acPersistableStudent(student)]));
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Falcon');
    expect(restored[0].restored).toBe(true);
    expect(restored[0].stats.quizAvg).toBe(82);
    expect(restored[0].screeningHistory).toHaveLength(1);
    expect(restored[0].data.fluencyAssessments[0].wcpm).toBe(61);
    expect(restored[0].data.fluencyAssessments[0].wordData).toBeUndefined();

    expect(_acRestoreImportedStudents('not json{')).toEqual([]);
    expect(_acRestoreImportedStudents('{"a":1}')).toEqual([]);
    expect(_acRestoreImportedStudents(null)).toEqual([]);
    // entries without a usable name are filtered, the rest survive
    expect(_acRestoreImportedStudents(JSON.stringify([{ name: '' }, { nope: 1 }, { name: 'Heron' }]))).toHaveLength(1);
  });

  it('the live wiring: lazy init reads the store, the persist effect excludes live rows', () => {
    expect(ac).toContain('React.useState(() => _acRestoreImportedStudents(safeGetItem(AC_ROSTER_STORE_KEY)))');
    expect(ac).toContain('importedStudents.filter(s => s && !s.isLive).map(_acPersistableStudent)');
  });
});

// ── per-student delete ──

describe('host deleteStudentRecords (finding 6)', () => {
  function loadDelete() {
    const fnSrc = extractDecl(anti, 'const deleteStudentRecords = (studentName) => {');
    const state = {
      probe: { Falcon: [{ wcpm: 42 }], Heron: [{ wcpm: 31 }] },
      logs: { Falcon: [{ id: '1' }] },
      goals: { Falcon: { fluencyGoal: 90 }, Heron: { fluencyGoal: 80 } },
    };
    const writes = [];
    const wrap = (key) => (u) => { state[key] = typeof u === 'function' ? u(state[key]) : u; };
    const fakeLS = { setItem: (k, v) => writes.push([k, v]) };
    // eslint-disable-next-line no-new-func
    const del = new Function('setProbeHistory', 'setInterventionLogs', 'setRtiGoals', 'localStorage',
      fnSrc + ' return deleteStudentRecords;')(wrap('probe'), wrap('logs'), wrap('goals'), fakeLS);
    return { del, state, writes };
  }

  it('removes exactly one student from all three stores and flushes each', () => {
    const { del, state, writes } = loadDelete();
    del('Falcon');
    expect(state.probe).toEqual({ Heron: [{ wcpm: 31 }] });
    expect(state.logs).toEqual({});
    expect(state.goals).toEqual({ Heron: { fluencyGoal: 80 } });
    const keys = writes.map(([k]) => k).sort();
    expect(keys).toEqual(['alloflow_intervention_logs', 'alloflow_probe_history', 'alloflow_rti_goals']);
    expect(JSON.parse(writes.find(([k]) => k === 'alloflow_probe_history')[1])).toEqual({ Heron: [{ wcpm: 31 }] });
  });

  it('a student with no records in a store leaves that store untouched (no spurious flush)', () => {
    const { del, state, writes } = loadDelete();
    del('Heron'); // has probe + goals, no intervention logs
    expect(state.probe).toEqual({ Falcon: [{ wcpm: 42 }] });
    expect(state.logs).toEqual({ Falcon: [{ id: '1' }] });
    expect(writes.map(([k]) => k)).not.toContain('alloflow_intervention_logs');
    const { del: del2, writes: w2 } = loadDelete();
    del2('Nobody');
    expect(w2).toHaveLength(0);
  });
});

describe('module records manager (finding 6)', () => {
  const HANDLER_PARAMS = ['recordsRemovalTarget', 'askStudentAnalyticsConfirmation', 'deleteStudentRecords',
    'setExternalCBMScores', 'setRosterKey', 'setImportedStudents', 'selectedStudent', 'setSelectedStudent',
    'researchStudent', 'setResearchStudent', 'activeStudent', 'setActiveStudent', 'setProbeTargetStudent',
    'setRecordsRemovalTarget', 'addToast', 't', 'localStorage', 'window', '_acIdentityLinkKey',
    'setIdentityLinks', 'lastLinkUndo', 'safeSessionRemoveItem', 'AC_LINK_UNDO_KEY',
    'safeRemoveItem', 'setLastLinkUndo'];

  function runHandler(target, confirmAnswer, world = {}) {
    const fnSrc = extractDecl(ac, 'const handleRemoveStudentRecords = async () => {');
    const calls = { deleted: [], toasts: [], cleared: [], confirmations: [], sessionRemoved: [], localRemoved: [], undoState: 'unchanged' };
    const fingerprint = 'sha256:' + 'a'.repeat(64);
    let cbm = world.cbm || { [target]: [{ score: 90 }], Heron: [] };
    let roster = world.roster || { progressHistory: { [target]: [{ date: '2026-08-01' }], Heron: [] }, students: {} };
    let imported = world.imported || [{ name: target, stats: {} }, { name: 'Heron', stats: {} }];
    let links = world.identityLinks || { [fingerprint]: target, ['sha256:' + 'b'.repeat(64)]: 'Heron' };
    // eslint-disable-next-line no-new-func
    const handler = new Function(...HANDLER_PARAMS, fnSrc + ' return handleRemoveStudentRecords;')(
      target,
      async (msg, opts) => { calls.confirmations.push({ msg, opts }); return confirmAnswer; },
      (name) => calls.deleted.push(name),
      (u) => { cbm = typeof u === 'function' ? u(cbm) : u; },
      (u) => { roster = typeof u === 'function' ? u(roster) : u; },
      (u) => { imported = typeof u === 'function' ? u(imported) : u; },
      world.selectedStudent !== undefined ? world.selectedStudent : { name: target },
      () => calls.cleared.push('selectedStudent'),
      world.researchStudent !== undefined ? world.researchStudent : target,
      () => calls.cleared.push('researchStudent'),
      world.activeStudent !== undefined ? world.activeStudent : target,
      () => calls.cleared.push('activeStudent'),
      () => calls.cleared.push('probeTarget'),
      () => calls.cleared.push('target'),
      (msg, level) => calls.toasts.push({ msg, level }),
      () => undefined,
      { setItem: () => {} },
      { dispatchEvent: () => {} },
      async () => fingerprint,
      (u) => { links = typeof u === 'function' ? u(links) : u; },
      world.lastLinkUndo === undefined ? { fromName: target, toName: 'Swift Falcon' } : world.lastLinkUndo,
      (key) => calls.sessionRemoved.push(key),
      'undo-key',
      (key) => calls.localRemoved.push(key),
      (value) => { calls.undoState = value; },
    );
    return handler().then(() => ({ calls, cbm, roster, imported, links }));
  }

  it('a confirmed removal purges every store and clears every selection', async () => {
    const { calls, cbm, roster, imported, links } = await runHandler('Falcon', true);
    expect(calls.confirmations).toHaveLength(1);
    expect(calls.confirmations[0].opts.title).toBe('Remove student records');
    expect(calls.deleted).toEqual(['Falcon']);
    expect(cbm).toEqual({ Heron: [] });
    expect(roster.progressHistory).toEqual({ Heron: [] });
    expect(imported.map(s => s.name)).toEqual(['Heron']);
    expect(calls.cleared).toEqual(expect.arrayContaining(['selectedStudent', 'researchStudent', 'activeStudent', 'probeTarget', 'target']));
    expect(calls.toasts.some(x => x.level === 'success')).toBe(true);
    expect(Object.values(links)).toEqual(['Heron']);
    expect(calls.sessionRemoved).toEqual(['undo-key']);
    expect(calls.localRemoved).toEqual(['undo-key']);
    expect(calls.undoState).toBeNull();
    expect(calls.confirmations[0].msg).toContain('saved Assessment Center link');
  });

  it('cancelling the confirmation deletes nothing', async () => {
    const { calls, cbm, imported, links } = await runHandler('Falcon', false);
    expect(calls.deleted).toHaveLength(0);
    expect(cbm.Falcon).toBeDefined();
    expect(imported).toHaveLength(2);
    expect(calls.toasts).toHaveLength(0);
    expect(Object.values(links).sort()).toEqual(['Falcon', 'Heron']);
    expect(calls.sessionRemoved).toEqual([]);
  });

  it('unrelated selections are left alone', async () => {
    const { calls } = await runHandler('Falcon', true, {
      selectedStudent: { name: 'Heron' }, researchStudent: 'Heron', activeStudent: 'Heron',
    });
    expect(calls.cleared).not.toContain('selectedStudent');
    expect(calls.cleared).not.toContain('researchStudent');
    expect(calls.cleared).not.toContain('activeStudent');
  });

  it('the picker unions every store, so roster-only and orphaned identities are reachable', () => {
    const fnSrc = extractDecl(ac, 'const listRecordIdentities = () => {');
    // eslint-disable-next-line no-new-func
    const list = new Function('probeHistory', 'interventionLogs', 'rtiGoals', 'externalCBMScores', 'rosterKey', 'importedStudents',
      fnSrc + ' return listRecordIdentities;')(
      { 'Marcus Reyes': [] },       // orphaned split identity: probe history only
      { Falcon: [] },
      {},
      { Heron: [] },
      { progressHistory: { Owl: [] } }, // roster-only student
      [{ name: 'Imported Kid' }, { name: 'Live Kid', isLive: true }],
    );
    expect(list()).toEqual(['Falcon', 'Heron', 'Imported Kid', 'Marcus Reyes', 'Owl']);
  });

  it('the wiring: host prop reaches the module', () => {
    expect(anti).toContain('deleteStudentRecords={deleteStudentRecords}');
    const destructure = ac.slice(ac.indexOf('}) => {') - 4000, ac.indexOf('}) => {'));
    expect(destructure).toContain('deleteStudentRecords,');
  });
});
